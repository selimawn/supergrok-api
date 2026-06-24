import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import type { AuthStore, AuthEntry } from "./types";

const AUTH_PATH = join(homedir(), ".grok", "auth.json");
const OIDC_SCOPE_PREFIX = "https://auth.x.ai::";
const TOKEN_REFRESH_URL = "https://auth.x.ai/oauth2/token";

let cachedAuth: AuthEntry | null = null;
let lastRefresh = 0;

function readAuthFile(): AuthStore {
  if (!existsSync(AUTH_PATH)) {
    throw new Error(
      `Auth file not found at ${AUTH_PATH}. Run "grok login" first.`
    );
  }
  return JSON.parse(readFileSync(AUTH_PATH, "utf-8"));
}

function writeAuthFile(store: AuthStore): void {
  writeFileSync(AUTH_PATH, JSON.stringify(store, null, 2), "utf-8");
}

function findOidcEntry(store: AuthStore): { scope: string; entry: AuthEntry } | null {
  for (const [scope, entry] of Object.entries(store)) {
    if (scope.startsWith(OIDC_SCOPE_PREFIX) && entry.key) {
      return { scope, entry };
    }
  }
  return null;
}

function isExpired(entry: AuthEntry): boolean {
  if (!entry.expires_at) return false;
  return Date.now() >= new Date(entry.expires_at).getTime() - 60_000;
}

async function refreshTokens(
  entry: AuthEntry
): Promise<AuthEntry> {
  const clientId = entry.oidc_client_id;
  const refreshToken = entry.refresh_token;

  if (!clientId || !refreshToken) {
    throw new Error("Missing refresh_token or oidc_client_id in auth entry");
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
  });

  const res = await fetch(TOKEN_REFRESH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token refresh failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };

  const now = new Date();
  const updated: AuthEntry = {
    ...entry,
    key: data.access_token,
    refresh_token: data.refresh_token || entry.refresh_token,
    expires_at: data.expires_in
      ? new Date(now.getTime() + data.expires_in * 1000).toISOString()
      : entry.expires_at,
  };

  return updated;
}

export async function getAccessToken(): Promise<string> {
  const store = readAuthFile();
  const found = findOidcEntry(store);

  if (!found) {
    throw new Error(
      "No OIDC auth entry found in ~/.grok/auth.json. Run 'grok login' first."
    );
  }

  const { scope, entry } = found;

  if (!isExpired(entry)) {
    return entry.key;
  }

  if (cachedAuth && !isExpired(cachedAuth) && Date.now() - lastRefresh < 300_000) {
    return cachedAuth.key;
  }

  console.log("[auth] Token expired, refreshing...");
  const refreshed = await refreshTokens(entry);
  store[scope] = refreshed;
  writeAuthFile(store);
  cachedAuth = refreshed;
  lastRefresh = Date.now();
  console.log("[auth] Token refreshed successfully");

  return refreshed.key;
}

export async function getAuthInfo(): Promise<{
  email: string;
  expires_at: string;
  team_id: string;
} | null> {
  try {
    const store = readAuthFile();
    const found = findOidcEntry(store);
    if (!found) return null;
    return {
      email: found.entry.email || "unknown",
      expires_at: found.entry.expires_at || "unknown",
      team_id: found.entry.team_id || "unknown",
    };
  } catch {
    return null;
  }
}
