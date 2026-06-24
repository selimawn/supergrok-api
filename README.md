# SuperGrok API

OpenAI-compatible proxy for xAI Grok subscription. Uses your `~/.grok/auth.json` credentials to proxy requests to `api.x.ai`.

## Quick Start

```bash
bun run src/index.ts --port 3000
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/v1/chat/completions` | Chat completions (streaming supported) |
| `POST` | `/v1/responses` | Responses API |
| `GET` | `/v1/models` | List available models |
| `GET` | `/health` | Proxy status + auth info |

## Usage with OpenAI SDK

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://127.0.0.1:3000/v1",
    api_key="dummy"
)

response = client.chat.completions.create(
    model="grok-4.3",
    messages=[{"role": "user", "content": "Hello!"}]
)
print(response.choices[0].message.content)
```

## CLI Options

```
--port <number>   Port to listen on (default: 3000)
--host <address>  Host to bind to (default: 127.0.0.1)
```

## Auth

Reads credentials from `~/.grok/auth.json` (created by `grok login`). Tokens are refreshed automatically when expired.

## Requirements

- [Bun](https://bun.sh) runtime
- Authenticated Grok CLI (`grok login`)

## How It Works

```
Client (OpenAI SDK, curl, etc.)
  → http://localhost:3000/v1/*
  → Proxy reads ~/.grok/auth.json
  → Proxy refreshes token if expired
  → Proxy forwards to https://api.x.ai/v1/*
  → Response streamed back to client
```

## License

MIT
