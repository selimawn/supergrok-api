export interface AuthEntry {
  key: string;
  auth_mode?: string;
  create_time?: string;
  user_id?: string;
  email?: string;
  first_name?: string;
  refresh_token?: string;
  expires_at?: string;
  oidc_issuer?: string;
  oidc_client_id?: string;
  principal_type?: string;
  principal_id?: string;
  team_id?: string;
  [key: string]: unknown;
}

export interface AuthStore {
  [scope: string]: AuthEntry;
}

export interface ProxyConfig {
  port: number;
  host: string;
}
