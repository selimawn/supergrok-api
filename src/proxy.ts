import { getAccessToken } from "./auth";

const XAI_BASE_URL = "https://api.x.ai";

const HIDDEN_MODELS = [
  {
    id: "grok-composer-2.5-fast",
    aliases: ["grok-composer-2.5", "composer-2.5-fast"],
    context_length: 256000,
    created: 1780300800,
    object: "model" as const,
    owned_by: "xai",
    prompt_text_token_price: 5000,
    cached_prompt_text_token_price: 2000,
    prompt_image_token_price: 5000,
    completion_text_token_price: 25000,
    prompt_text_token_price_long_context: 10000,
    cached_prompt_text_token_price_long_context: 4000,
    completion_text_token_price_long_context: 50000,
    long_context_threshold: 128000,
  },
];

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

  if (path === "/v1/models" && upstreamResponse.ok) {
    const data = (await upstreamResponse.json()) as { data: unknown[] };
    data.data = [...data.data, ...HIDDEN_MODELS];
    const responseHeaders = new Headers(upstreamResponse.headers);
    responseHeaders.delete("transfer-encoding");
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: responseHeaders,
    });
  }

  const responseHeaders = new Headers(upstreamResponse.headers);
  responseHeaders.delete("transfer-encoding");

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: responseHeaders,
  });
}
