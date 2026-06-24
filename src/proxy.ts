import { getAccessToken } from "./auth";

const XAI_BASE_URL = "https://api.x.ai";

export async function proxyRequest(
  path: string,
  request: Request
): Promise<Response> {
  const token = await getAccessToken();

  const url = new URL(request.url);
  const targetUrl = `${XAI_BASE_URL}${path}`;

  const headers = new Headers();
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Content-Type", request.headers.get("content-type") || "application/json");

  const init: RequestInit = {
    method: request.method,
    headers,
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
  }

  const upstreamResponse = await fetch(targetUrl, init);

  const responseHeaders = new Headers(upstreamResponse.headers);
  responseHeaders.delete("transfer-encoding");

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: responseHeaders,
  });
}
