import { isIP } from "node:net";


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
  // Allow positive PostgreSQL bigint IDs only.
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

  // ==========================================
  // DAY 53 — TEAM MEMBERSHIP MANAGEMENT
  // ==========================================

  if (parts[0] === "team-members") {
    // GET /team-members/:workspaceId
    // POST /team-members/:workspaceId
    if (
      parts.length === 2 &&
      validId(parts[1])
    ) {
      return (
        method === "GET" ||
        method === "POST"
      );
    }

    // PATCH /team-members/:workspaceId/:userId
    // DELETE /team-members/:workspaceId/:userId
    if (
      parts.length === 3 &&
      validId(parts[1]) &&
      validId(parts[2])
    ) {
      return (
        method === "PATCH" ||
        method === "DELETE"
      );
    }

    return false;
  }

  // ==========================================
  // EXISTING GET ENDPOINTS
  // ==========================================

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

    // List projects belonging to a workspace.
    if (
      parts.length === 3 &&
      parts[0] === "workspaces" &&
      validId(parts[1]) &&
      parts[2] === "projects"
    ) {
      return true;
    }

    // List tasks belonging to a project.
    if (
      parts.length === 3 &&
      parts[0] === "projects" &&
      validId(parts[1]) &&
      parts[2] === "tasks"
    ) {
      return true;
    }

    // Read a specific task.
    if (
      parts.length === 2 &&
      parts[0] === "tasks" &&
      validId(parts[1])
    ) {
      return true;
    }
  }

  // ==========================================
  // EXISTING POST ENDPOINTS
  // ==========================================

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

  // ==========================================
  // EXISTING PATCH ENDPOINTS
  // ==========================================

  if (method === "PATCH") {
    return (
      parts.length === 2 &&
      parts[0] === "tasks" &&
      validId(parts[1])
    );
  }

  // Reject every other route.
  return false;
}

async function forward(
  request: Request,
  context: Context
): Promise<Response> {
  const { path } = await context.params;

  // Allow only explicitly approved API routes.
  if (!routeAllowed(request.method, path)) {
    return apiError(404, "Route not found");
  }

  // ==========================================
  // REQUEST ORIGIN SECURITY
  // ==========================================

  if (
    !["GET", "HEAD", "OPTIONS"].includes(
      request.method
    )
  ) {
    // An explicit public origin is needed when Docker / a reverse proxy
    // exposes a different internal host in request.url.
    // Keep strict comparison; never trust a browser-supplied Host header.
    const ownOrigin = process.env.WORKFLOW_PUBLIC_ORIGIN
      ? new URL(process.env.WORKFLOW_PUBLIC_ORIGIN).origin
      : new URL(request.url).origin;

    const receivedOrigin =
      request.headers.get("origin");

    const fetchSite =
      request.headers.get("sec-fetch-site");

    if (
      fetchSite === "cross-site" ||
      (
        receivedOrigin !== null &&
        receivedOrigin !== ownOrigin
      ) ||
      (
        receivedOrigin === null &&
        fetchSite === "same-site"
      )
    ) {
      return apiError(
        403,
        "Untrusted request origin"
      );
    }
  }

  // ==========================================
  // BACKEND CONFIGURATION
  // ==========================================

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

  // Forward to Express API.
  const endpoint = new URL(
    `/api/${path.join("/")}`,
    backend.origin
  );

  // ==========================================
  // SAFE REQUEST HEADERS
  // ==========================================

  const headers = new Headers();

  headers.set("Accept", "application/json");

  // Authenticate server-to-server cloud requests.
  const proxySecret = process.env.WORKFLOW_PROXY_SECRET ?? "";

  const proxyAuthRequired =
    process.env.WORKFLOW_REQUIRE_PROXY_AUTH === "1" ||
    process.env.VERCEL === "1";

  if (proxyAuthRequired || proxySecret) {
    if (!/^[0-9a-f]{64}$/.test(proxySecret)) {
      return apiError(
        503,
        "Backend security configuration unavailable"
      );
    }

    headers.set("X-Workflow-Proxy-Key", proxySecret);

    if (
      process.env.VERCEL === "1" &&
      backend.protocol !== "https:"
    ) {
      return apiError(503, "Secure backend connection required");
    }

    const authOperation =
      request.method === "POST" &&
      ["auth/login", "auth/register"].includes(path.join("/"));

    if (authOperation) {
      // Trust platform-controlled IP information only on Vercel.
      const clientIp =
        process.env.VERCEL === "1"
          ? request.headers.get("x-forwarded-for") ?? ""
          : "";

      if (!isIP(clientIp) || clientIp.includes("%")) {
        return apiError(503, "Client protection unavailable");
      }

      headers.set("X-Workflow-Client-IP", clientIp);
    }
  }

  // Express checks the backend's trusted origin.
  // The browser origin was validated above.
  headers.set("Origin", backend.origin);

  // Forward only WorkFlow Pro session cookies.
  const cookieHeader =
    request.headers.get("cookie") ?? "";

  const allowedCookies = cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .filter(
      (cookie) =>
        cookie.startsWith("workflow_session=") ||
        cookie.startsWith(
          "__Host-workflow_session="
        )
    );

  if (allowedCookies.length > 0) {
    headers.set(
      "Cookie",
      allowedCookies.join("; ")
    );
  }

  // Preserve session-bound CSRF protection.
  const csrfToken =
    request.headers.get("x-csrf-token");

  if (csrfToken) {
    headers.set(
      "X-CSRF-Token",
      csrfToken
    );
  }

  // ==========================================
  // REQUEST BODY VALIDATION
  // ==========================================

  let body: string | undefined;

  if (
    request.method === "POST" ||
    request.method === "PATCH"
  ) {
    body = await request.text();

    // Match the Express 10 KB JSON limit.
    if (
      Buffer.byteLength(body, "utf8") > 10_240
    ) {
      return apiError(
        413,
        "Request body too large"
      );
    }

    headers.set(
      "Content-Type",
      "application/json"
    );
  }

  // ==========================================
  // SEND REQUEST TO EXPRESS
  // ==========================================

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

    // Preserve login/logout session cookies.
    const setCookie =
      upstream.headers.get("set-cookie");

    if (setCookie) {
      responseHeaders.set(
        "Set-Cookie",
        setCookie
      );
    }

    for (const name of [
      "Retry-After",
      "X-RateLimit-Limit",
      "X-RateLimit-Remaining",
    ]) {
      const value = upstream.headers.get(name);

      if (value !== null) {
        responseHeaders.set(name, value);
      }
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

// ============================================
// NEXT.JS API HANDLERS
// ============================================

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

export async function DELETE(
  request: Request,
  context: Context
): Promise<Response> {
  return forward(request, context);
}
