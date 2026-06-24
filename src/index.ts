import { proxyRequest } from "./proxy";
import { getAccessToken, getAuthInfo } from "./auth";
import type { ProxyConfig } from "./types";

function parseArgs(): ProxyConfig {
  const args = process.argv.slice(2);
  let port = 3000;
  let host = "127.0.0.1";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--port" && args[i + 1]) {
      port = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === "--host" && args[i + 1]) {
      host = args[i + 1];
      i++;
    }
  }

  return { port, host };
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === "/health") {
    const info = await getAuthInfo();
    return jsonResponse({
      status: "ok",
      auth: info,
      timestamp: new Date().toISOString(),
    });
  }

  if (path === "/v1/models" && request.method === "GET") {
    return proxyRequest("/v1/models", request);
  }

  if (path === "/v1/chat/completions" && request.method === "POST") {
    return proxyRequest("/v1/chat/completions", request);
  }

  if (path === "/v1/responses" && request.method === "POST") {
    return proxyRequest("/v1/responses", request);
  }

  if (path.startsWith("/v1/")) {
    return proxyRequest(path, request);
  }

  return jsonResponse(
    {
      error: "Not found",
      available_endpoints: [
        "POST /v1/chat/completions",
        "POST /v1/responses",
        "GET  /v1/models",
        "GET  /health",
      ],
    },
    404
  );
}

const config = parseArgs();

try {
  await getAccessToken();
  console.log("[auth] Auth token loaded successfully");
} catch (err) {
  console.error("[auth] Failed to load auth:", (err as Error).message);
  process.exit(1);
}

const server = Bun.serve({
  port: config.port,
  hostname: config.host,
  fetch: handleRequest,
});

console.log(`
╔══════════════════════════════════════════════╗
║           SuperGrok API Proxy               ║
╠══════════════════════════════════════════════╣
║  Listening on: ${String(server.url).padEnd(28)}║
║                                              ║
║  Endpoints:                                  ║
║    POST /v1/chat/completions                 ║
║    POST /v1/responses                        ║
║    GET  /v1/models                           ║
║    GET  /health                              ║
╚══════════════════════════════════════════════╝
`);
