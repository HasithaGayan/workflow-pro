
type Context = {
  params: Promise<{ path: string[] }>;
};

function apiError(
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

function validId(value: string): boolean {
  // Positive database IDs only.
  if (!/^[1-9][0-9]*$/.test(value)) {
    return false;
  }

  const id = BigInt(value);

  return id <= BigInt("9223372036854775807");
}

function routeAllowed(
  method: string,
  parts: string[]
): boolean {
  const route = parts.join("/");

  if (method === "GET") {
    if (
      [
        "auth/me",
        "auth/csrf",
        "workspaces",
        "tasks",
      ].includes(route)
    ) {
      return true;
    }

    if (
      parts.length === 3 &&
      parts[0] === "workspaces" &&
      validId(parts[1]) &&
      parts[2] === "projects"
    ) {
      return true;
    }

    if (
      parts.length === 3 &&
      parts[0] === "projects" &&
      validId(parts[1]) &&
      parts[2] === "tasks"
    ) {
      return true;
    }

    if (
      parts.length === 2 &&
      parts[0] === "tasks" &&
      validId(parts[1])
    ) {
      return true;
    }
  }

  if (method === "POST") {
    return [
      "auth/register",
      "auth/login",
      "auth/logout",
      "workspaces",
      "projects",
      "tasks",
    ].includes(route);
  }

  if (method === "PATCH") {
    return (
      parts.length === 2 &&
      parts[0] === "tasks" &&
      validId(parts[1])
    );
  }

  return false;
}

async function forward(
  request: Request,
  context: Context
): Promise<Response> {
  const { path } = await context.params;

  if (!routeAllowed(request.method, path)) {
    return apiError(404, "Route not found");
  }

  // Reject cross-origin browser writes.
  if (
    !["GET", "HEAD", "OPTIONS"].includes(
      request.method
    )
  ) {
    const ownOrigin = new URL(request.url).origin;
    const receivedOrigin =
      request.headers.get("origin");

    const fetchSite =
      request.headers.get("sec-fetch-site");

    if (
      fetchSite === "cross-site" ||
      (receivedOrigin !== null &&
        receivedOrigin !== ownOrigin) ||
      (receivedOrigin === null &&
        fetchSite === "same-site")
    ) {
      return apiError(403, "Untrusted request origin");
    }
  }

  let backend: URL;

  try {
    backend = new URL(
      process.env.WORKFLOW_API_URL ??
        "http://127.0.0.1:4000"
    );

    if (
      backend.protocol !== "http:" &&
      backend.protocol !== "https:"
    ) {
      return apiError(
        503,
        "Invalid backend configuration"
      );
    }
  } catch {
    return apiError(
      503,
      "Invalid backend configuration"
    );
  }

  const endpoint = new URL(
    `/api/${path.join("/")}`,
    backend.origin
  );

  const headers = new Headers();

  headers.set("Accept", "application/json");

  // Express expects its own configured origin.
  // The browser's origin was checked above.
  headers.set("Origin", backend.origin);

  // Only forward WorkFlow Pro authentication cookies.
  const cookieHeader =
    request.headers.get("cookie") ?? "";

  const allowedCookies = cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .filter(
      (cookie) =>
        cookie.startsWith("workflow_session=") ||
        cookie.startsWith("__Host-workflow_session=")
    );

  if (allowedCookies.length > 0) {
    headers.set("Cookie", allowedCookies.join("; "));
  }

  const csrfToken =
    request.headers.get("x-csrf-token");

  if (csrfToken) {
    headers.set("X-CSRF-Token", csrfToken);
  }

  let body: string | undefined;

  if (
    request.method === "POST" ||
    request.method === "PATCH"
  ) {
    body = await request.text();

    if (Buffer.byteLength(body, "utf8") > 10_240) {
      return apiError(413, "Request body too large");
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

    const responseHeaders = new Headers({
      "Cache-Control": "no-store",
      "Content-Type":
        upstream.headers.get("content-type") ??
        "application/json",
    });

    const setCookie =
      upstream.headers.get("set-cookie");

    if (setCookie) {
      responseHeaders.set("Set-Cookie", setCookie);
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch {
    return apiError(
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

export async function PATCH(
  request: Request,
  context: Context
): Promise<Response> {
  return forward(request, context);
}
