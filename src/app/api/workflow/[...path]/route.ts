
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = {
  params: Promise<{ path: string[] }>;
};

const allowedRoutes: Record<string, string[]> = {
  GET: [
    "auth/me",
    "auth/csrf",
    "workspaces",
  ],
  POST: [
    "auth/register",
    "auth/login",
    "auth/logout",
    "workspaces",
  ],
};

function jsonError(
  status: number,
  message: string
): Response {
  return Response.json(
    {
      success: false,
      error: message,
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

async function forward(
  request: Request,
  context: Context
): Promise<Response> {
  const { path } = await context.params;
  const route = path.join("/");

  const permitted =
    allowedRoutes[request.method]?.includes(route);

  if (!permitted) {
    return jsonError(404, "Route not found");
  }

  // Verify where browser write requests originate.
  if (request.method !== "GET") {
    const currentOrigin = new URL(request.url).origin;
    const suppliedOrigin = request.headers.get("origin");
    const fetchSite =
      request.headers.get("sec-fetch-site");

    if (
      (suppliedOrigin &&
        suppliedOrigin !== currentOrigin) ||
      fetchSite === "cross-site" ||
      (!suppliedOrigin && fetchSite === "same-site")
    ) {
      return jsonError(403, "Untrusted request origin");
    }
  }

  let backend: URL;

  try {
    backend = new URL(
      process.env.WORKFLOW_API_URL ??
        "http://127.0.0.1:4000"
    );

    if (!["http:", "https:"].includes(backend.protocol)) {
      return jsonError(503, "Invalid backend configuration");
    }
  } catch {
    return jsonError(503, "Invalid backend configuration");
  }

  const endpoint = new URL(
    `/api/${route}`,
    backend.origin
  );

  // Never send arbitrary browser headers upstream.
  // Forward only the headers needed by our API.
  const headers = new Headers();

  headers.set("Accept", "application/json");

  // The Express Origin check expects its own configured
  // backend origin. The browser origin was checked above.
  headers.set("Origin", backend.origin);

  const sessionCookie = request.headers.get("cookie");

  if (sessionCookie) {
    headers.set("Cookie", sessionCookie);
  }

  const csrfToken =
    request.headers.get("x-csrf-token");

  if (csrfToken) {
    headers.set("X-CSRF-Token", csrfToken);
  }

  let body: string | undefined;

  if (request.method === "POST") {
    body = await request.text();

    if (Buffer.byteLength(body, "utf8") > 10_240) {
      return jsonError(413, "Request body too large");
    }

    headers.set("Content-Type", "application/json");
  }

  try {
    const upstream = await fetch(endpoint, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
    });

    // Auth responses must never be cached.
    const responseHeaders = new Headers({
      "Cache-Control": "no-store",
      "Content-Type":
        upstream.headers.get("content-type") ??
        "application/json",
    });

    // Preserve the backend's HttpOnly session cookie.
    const setCookie = upstream.headers.get("set-cookie");

    if (setCookie) {
      responseHeaders.set("Set-Cookie", setCookie);
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch {
    return jsonError(
      503,
      "Cannot connect to the WorkFlow Pro backend"
    );
  }
}

export async function GET(
  request: Request,
  context: Context
): Promise<Response> {
  return forward(request, context);
}

export async function POST(
  request: Request,
  context: Context
): Promise<Response> {
  return forward(request, context);
}
