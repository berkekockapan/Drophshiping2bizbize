import type { D1Database, Env } from "../../config/bindings";
import type { StoredAiProfile } from "./syncProfileMetadata";

const DEFAULT_AUTHORIZE_URL = "https://auth.openai.com/oauth/authorize";
const DEFAULT_TOKEN_URL = "https://auth.openai.com/oauth/token";
const DEFAULT_API_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_OAUTH_SCOPES = [
  "openid",
  "profile",
  "email",
  "offline_access",
  "api.connectors.read",
  "api.connectors.invoke",
] as const;
const DISALLOWED_APP_NAME_ENUMS = new Set(["oaicli"]);
const FINAL_ATTEMPT_STATUSES = new Set(["completed", "failed", "cancelled"]);
const IN_PROGRESS_ATTEMPT_STATUSES = new Set(["pending_browser_launch", "waiting_for_login", "verifying_session"]);
const ATTEMPT_STALE_TIMEOUT_MS = 10 * 60 * 1000;
const OAUTH_CALLBACK_SUCCESS_TITLE = "OpenAI hesabı bağlandı";
const OAUTH_CALLBACK_FAILURE_TITLE = "OpenAI hesabı bağlanamadı";

export type OpenAiConnectionAttemptStatus =
  | "pending_browser_launch"
  | "waiting_for_login"
  | "verifying_session"
  | "completed"
  | "failed"
  | "cancelled";

export interface OpenAiConnectionAttempt {
  id: string;
  provider: "openai";
  status: OpenAiConnectionAttemptStatus;
  profileId: string | null;
  error: string | null;
  createdAt: number;
  updatedAt: number;
}

interface OpenAiConnectionAttemptRow {
  id: string;
  provider: string;
  status: OpenAiConnectionAttemptStatus;
  profileId: string | null;
  error: string | null;
  oauthState: string | null;
  codeVerifier: string | null;
  redirectUri: string;
  createdAt: number;
  updatedAt: number;
}

interface OAuthTokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  id_token?: string;
  error?: string | { message?: string; code?: string };
  error_description?: string;
  message?: string;
}

interface OpenAiProject {
  externalId: string;
  displayName: string;
}

interface DecodedIdTokenClaims {
  email?: string;
  name?: string;
  preferred_username?: string;
}

interface ClientAuthSessionClaims {
  appNameEnum: string | null;
  originatorDisplayName: string | null;
}

export type OpenAiAuthErrorCode =
  | "NO_ACTIVE_PROFILE"
  | "PROFILE_NEEDS_REAUTH"
  | "LOGIN_IN_PROGRESS"
  | "OPENAI_OAUTH_CONFIG_MISSING"
  | "OPENAI_OAUTH_CALLBACK_FAILED"
  | "OPENAI_TOKEN_ENCRYPTION_MISSING"
  | "GENERATION_FAILED";

export class OpenAiAuthError extends Error {
  constructor(
    public readonly code: OpenAiAuthErrorCode,
    message: string,
    public readonly statusCode = 409,
  ) {
    super(message);
    this.name = "OpenAiAuthError";
  }
}

export interface StartOpenAiConnectionResult {
  attempt: OpenAiConnectionAttempt;
  authorizationUrl: string;
}

export interface OAuthCallbackResult {
  ok: boolean;
  attempt: OpenAiConnectionAttempt | null;
  html: string;
}

export interface OpenAiConnectionHealth {
  status: "online";
  provider: "openai-oauth";
  activeProfile: StoredAiProfile | null;
  connectionAttempt: OpenAiConnectionAttempt | null;
}

export interface StoredOpenAiWorkspace {
  id: string;
  profileId: string;
  externalId: string;
  displayName: string;
  isSelected: boolean;
  createdAt: number;
  updatedAt: number;
}

interface StoredCredentialRow {
  profileId: string;
  accessTokenEncrypted: string;
  refreshTokenEncrypted: string | null;
  idTokenEncrypted: string | null;
  apiKeyEncrypted: string | null;
  tokenType: string | null;
  scope: string | null;
  accessTokenExpiresAt: number | null;
}

interface ActiveOpenAiCredential {
  profile: StoredAiProfile;
  accessToken: string;
  apiKey: string | null;
  selectedWorkspaceProjectId: string | null;
}

function requireOauthClientId(env: Env) {
  const value = env.OPENAI_OAUTH_CLIENT_ID?.trim();
  if (!value) {
    throw new OpenAiAuthError(
      "OPENAI_OAUTH_CONFIG_MISSING",
      "OpenAI OAuth yapılandırması eksik. OPENAI_OAUTH_CLIENT_ID zorunlu (local için apps/api/.dev.vars, deploy için Cloudflare secret).",
      503,
    );
  }

  return value;
}

function requireOauthRedirectUri(env: Env) {
  const value = env.OPENAI_OAUTH_REDIRECT_URI?.trim();
  if (!value) {
    throw new OpenAiAuthError(
      "OPENAI_OAUTH_CONFIG_MISSING",
      "OpenAI OAuth redirect URI eksik. OPENAI_OAUTH_REDIRECT_URI zorunlu ve OpenAI OAuth uygulamasında kayıtlı olmalı.",
      503,
    );
  }

  return value;
}

function readOauthClientSecret(env: Env) {
  return env.OPENAI_OAUTH_CLIENT_SECRET?.trim() || undefined;
}

function readAuthorizeUrl(env: Env) {
  return env.OPENAI_OAUTH_AUTHORIZE_URL?.trim() || DEFAULT_AUTHORIZE_URL;
}

function readTokenUrl(env: Env) {
  return env.OPENAI_OAUTH_TOKEN_URL?.trim() || DEFAULT_TOKEN_URL;
}

function readApiBaseUrl(env: Env) {
  return (env.OPENAI_API_BASE_URL?.trim() || DEFAULT_API_BASE_URL).replace(/\/+$/, "");
}

function readOauthOriginator(env: Env) {
  return env.OPENAI_OAUTH_ORIGINATOR?.trim() || "dropshipingtakip_cloud";
}

function resolveAccessTokenExpiresAt(expiresInSeconds: number | undefined, now = Date.now()) {
  if (!expiresInSeconds || !Number.isFinite(expiresInSeconds) || expiresInSeconds <= 0) {
    return null;
  }

  return now + Math.floor(expiresInSeconds * 1000);
}

function toConnectionAttempt(row: OpenAiConnectionAttemptRow): OpenAiConnectionAttempt {
  return {
    id: row.id,
    provider: "openai",
    status: row.status,
    profileId: row.profileId,
    error: row.error,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function maskEmail(email: string | null) {
  if (!email) {
    return null;
  }

  const [local, domain] = email.split("@");
  if (!local || !domain) {
    return null;
  }

  const visible = local.slice(0, Math.min(2, local.length));
  const maskedCount = Math.max(3, local.length - visible.length);
  return `${visible}${"*".repeat(maskedCount)}@${domain}`;
}

function buildCodeVerifier() {
  const random = new Uint8Array(32);
  crypto.getRandomValues(random);
  return bytesToBase64Url(random);
}

async function buildCodeChallenge(codeVerifier: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(codeVerifier));
  return bytesToBase64Url(new Uint8Array(digest));
}

function bytesToBase64Url(bytes: Uint8Array) {
  const chunkSize = 0x8000;
  let binary = "";
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function normalizeEncryptionKey(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const bytes = base64UrlToBytes(trimmed);
    if (bytes.byteLength === 32) {
      return bytes;
    }
  } catch {
    // Continue to plain text fallback.
  }

  const plain = new TextEncoder().encode(trimmed);
  if (plain.byteLength === 32) {
    return plain;
  }

  return null;
}

async function readEncryptionKey(env: Env) {
  const raw = env.OPENAI_OAUTH_ENCRYPTION_KEY;
  const keyBytes = raw ? normalizeEncryptionKey(raw) : null;

  if (!keyBytes) {
    throw new OpenAiAuthError(
      "OPENAI_TOKEN_ENCRYPTION_MISSING",
      "Token şifreleme anahtarı eksik. OPENAI_OAUTH_ENCRYPTION_KEY 32-byte base64url olmalı.",
      503,
    );
  }

  return crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["encrypt", "decrypt"]);
}

async function encryptSecret(value: string, env: Env) {
  const key = await readEncryptionKey(env);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(value),
  );

  return `v1.${bytesToBase64Url(iv)}.${bytesToBase64Url(new Uint8Array(encrypted))}`;
}

async function decryptSecret(value: string | null, env: Env) {
  if (!value) {
    return null;
  }

  const [version, ivPart, payloadPart] = value.split(".");
  if (version !== "v1" || !ivPart || !payloadPart) {
    return null;
  }

  const key = await readEncryptionKey(env);
  const iv = base64UrlToBytes(ivPart);
  const payload = base64UrlToBytes(payloadPart);

  try {
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      payload,
    );
    return new TextDecoder().decode(plain);
  } catch {
    return null;
  }
}

async function requestToken(
  env: Env,
  params: Record<string, string | undefined>,
): Promise<OAuthTokenResponse> {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string" && value.length > 0) {
      body.set(key, value);
    }
  }

  const response = await fetch(readTokenUrl(env), {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const payload = (await response.json().catch(() => null)) as OAuthTokenResponse | null;
  if (!response.ok || !payload) {
    const errorMessage =
      payload?.error_description ??
      payload?.message ??
      (typeof payload?.error === "string" ? payload.error : null) ??
      `OpenAI token isteği başarısız oldu (${response.status}).`;
    throw new OpenAiAuthError("OPENAI_OAUTH_CALLBACK_FAILED", errorMessage, 409);
  }

  return payload;
}

async function requestOpenAiApiKeyFromIdToken(
  env: Env,
  input: {
    clientId: string;
    clientSecret?: string;
    idToken: string;
    requestedToken: "openai-api-key" | "chatgpt-account-api-key";
  },
) {
  const payload = await requestToken(env, {
    grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
    client_id: input.clientId,
    client_secret: input.clientSecret,
    requested_token: input.requestedToken,
    subject_token: input.idToken,
    subject_token_type: "urn:ietf:params:oauth:token-type:id_token",
  });

  return payload.access_token ?? null;
}

async function maybeExchangeApiKeyFromIdToken(
  env: Env,
  input: {
    clientId: string;
    clientSecret?: string;
    idToken: string | null;
  },
) {
  if (!input.idToken) {
    return null;
  }

  try {
    return await requestOpenAiApiKeyFromIdToken(env, {
      ...input,
      requestedToken: "openai-api-key",
      idToken: input.idToken,
    });
  } catch {
    try {
      return await requestOpenAiApiKeyFromIdToken(env, {
        ...input,
        requestedToken: "chatgpt-account-api-key",
        idToken: input.idToken,
      });
    } catch {
      return null;
    }
  }
}

function decodeIdTokenClaims(idToken: string | null): DecodedIdTokenClaims | null {
  if (!idToken) {
    return null;
  }

  const parts = idToken.split(".");
  if (parts.length < 2) {
    return null;
  }

  try {
    const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(parts[1]))) as Record<string, unknown>;
    return {
      email: typeof payload.email === "string" ? payload.email : undefined,
      name: typeof payload.name === "string" ? payload.name : undefined,
      preferred_username:
        typeof payload.preferred_username === "string"
          ? payload.preferred_username
          : typeof payload.preferredUsername === "string"
            ? payload.preferredUsername
            : undefined,
    };
  } catch {
    return null;
  }
}

function buildAuthorizationUrl(env: Env, input: {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
  nonce: string;
}) {
  const url = new URL(readAuthorizeUrl(env));
  url.searchParams.set("client_id", input.clientId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", DEFAULT_OAUTH_SCOPES.join(" "));
  url.searchParams.set("state", input.state);
  url.searchParams.set("code_challenge", input.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("nonce", input.nonce);
  url.searchParams.set("id_token_add_organizations", "true");
  url.searchParams.set("codex_cli_simplified_flow", "true");
  url.searchParams.set("originator", readOauthOriginator(env));
  return url.toString();
}

function readSetCookieHeaders(headers: Headers) {
  const getSetCookie = (headers as Headers & { getSetCookie?: () => string[] }).getSetCookie;
  if (typeof getSetCookie === "function") {
    const values = getSetCookie.call(headers).filter((value) => typeof value === "string" && value.length > 0);
    if (values.length > 0) {
      return values;
    }
  }

  const single = headers.get("set-cookie");
  return single ? [single] : [];
}

function readCookieValueFromSetCookieHeaders(setCookieHeaders: string[], cookieName: string) {
  if (setCookieHeaders.length === 0) {
    return null;
  }

  const serialized = setCookieHeaders.join(", ");
  const escapedName = cookieName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`(?:^|[;,]\\s*)${escapedName}=([^;]+)`).exec(serialized);
  return match?.[1] ?? null;
}

function decodeClientAuthSessionClaims(cookieValue: string): ClientAuthSessionClaims | null {
  const payloadPart = cookieValue.split(".")[0]?.trim();
  if (!payloadPart) {
    return null;
  }

  try {
    const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payloadPart))) as Record<string, unknown>;
    return {
      appNameEnum: typeof payload.app_name_enum === "string" ? payload.app_name_enum.trim() : null,
      originatorDisplayName:
        typeof payload.originator_display_name === "string" ? payload.originator_display_name.trim() : null,
    };
  } catch {
    return null;
  }
}

async function maybeReadClientAuthSessionClaims(authorizationUrl: string) {
  const response = await fetch(authorizationUrl, {
    method: "GET",
    redirect: "manual",
    headers: { Accept: "text/html" },
  }).catch(() => null);
  if (!response) {
    return null;
  }

  const setCookieHeaders = readSetCookieHeaders(response.headers);
  const cookieValue = readCookieValueFromSetCookieHeaders(setCookieHeaders, "oai-client-auth-session");
  if (!cookieValue) {
    return null;
  }

  return decodeClientAuthSessionClaims(cookieValue);
}

async function ensureOauthClientIsSupported(authorizationUrl: string) {
  const claims = await maybeReadClientAuthSessionClaims(authorizationUrl).catch(() => null);
  const appNameEnum = claims?.appNameEnum?.toLowerCase();
  if (!appNameEnum || !DISALLOWED_APP_NAME_ENUMS.has(appNameEnum)) {
    return;
  }

  const appDisplayName = claims?.originatorDisplayName || claims?.appNameEnum || "bilinmeyen";
  throw new OpenAiAuthError(
    "OPENAI_OAUTH_CONFIG_MISSING",
    `OPENAI_OAUTH_CLIENT_ID bu akış için geçersiz görünüyor (tespit edilen uygulama: ${appDisplayName}). Kendi OpenAI OAuth uygulamanızdan alınan client_id/client_secret kullanın; ~/.codex/auth.json içindeki client_id değerini kullanmayın.`,
    503,
  );
}

async function getAttemptById(db: D1Database, attemptId: string) {
  return db
    .prepare(
      `select id, provider, status, profile_id as profileId, error, oauth_state as oauthState,
              code_verifier as codeVerifier, redirect_uri as redirectUri,
              created_at as createdAt, updated_at as updatedAt
       from ai_openai_connection_attempts
       where id = ?
       limit 1`,
    )
    .bind(attemptId)
    .first<OpenAiConnectionAttemptRow>();
}

async function getAttemptByState(db: D1Database, oauthState: string) {
  return db
    .prepare(
      `select id, provider, status, profile_id as profileId, error, oauth_state as oauthState,
              code_verifier as codeVerifier, redirect_uri as redirectUri,
              created_at as createdAt, updated_at as updatedAt
       from ai_openai_connection_attempts
       where oauth_state = ?
       order by updated_at desc
       limit 1`,
    )
    .bind(oauthState)
    .first<OpenAiConnectionAttemptRow>();
}

async function getLatestAttempt(db: D1Database) {
  return db
    .prepare(
      `select id, provider, status, profile_id as profileId, error, oauth_state as oauthState,
              code_verifier as codeVerifier, redirect_uri as redirectUri,
              created_at as createdAt, updated_at as updatedAt
       from ai_openai_connection_attempts
       order by updated_at desc
       limit 1`,
    )
    .first<OpenAiConnectionAttemptRow>();
}

async function updateAttempt(
  db: D1Database,
  attemptId: string,
  patch: Partial<Pick<OpenAiConnectionAttemptRow, "status" | "error" | "profileId" | "oauthState" | "codeVerifier">>,
) {
  const existing = await getAttemptById(db, attemptId);
  if (!existing) {
    return null;
  }

  const updatedAt = Date.now();
  await db
    .prepare(
      `update ai_openai_connection_attempts
       set status = ?, error = ?, profile_id = ?, oauth_state = ?, code_verifier = ?, updated_at = ?
       where id = ?`,
    )
    .bind(
      patch.status ?? existing.status,
      typeof patch.error !== "undefined" ? patch.error : existing.error,
      typeof patch.profileId !== "undefined" ? patch.profileId : existing.profileId,
      typeof patch.oauthState !== "undefined" ? patch.oauthState : existing.oauthState,
      typeof patch.codeVerifier !== "undefined" ? patch.codeVerifier : existing.codeVerifier,
      updatedAt,
      attemptId,
    )
    .run();

  return getAttemptById(db, attemptId);
}

async function cancelInProgressConnectionAttempts(
  db: D1Database,
  reason = "Yeni bağlantı denemesi başlatıldı.",
) {
  const now = Date.now();
  await db
    .prepare(
      `update ai_openai_connection_attempts
       set status = 'cancelled', error = ?, oauth_state = null, code_verifier = null, updated_at = ?
       where status in ('pending_browser_launch', 'waiting_for_login', 'verifying_session')`,
    )
    .bind(reason, now)
    .run();
}

export async function startOpenAiConnection(
  db: D1Database,
  env: Env,
  options: { profileId?: string | null } = {},
): Promise<StartOpenAiConnectionResult> {
  const clientId = requireOauthClientId(env);
  const redirectUri = requireOauthRedirectUri(env);
  const state = crypto.randomUUID();
  const codeVerifier = buildCodeVerifier();
  const codeChallenge = await buildCodeChallenge(codeVerifier);
  const nonce = crypto.randomUUID();
  const authorizationUrl = buildAuthorizationUrl(env, {
    clientId,
    redirectUri,
    state,
    codeChallenge,
    nonce,
  });
  await cancelInProgressConnectionAttempts(db);
  await ensureOauthClientIsSupported(authorizationUrl);
  const now = Date.now();
  const attemptId = crypto.randomUUID();
  const profileId = options.profileId ?? crypto.randomUUID();

  await db
    .prepare(
      `insert into ai_openai_connection_attempts (
        id, provider, profile_id, status, error, oauth_state, code_verifier, nonce,
        redirect_uri, authorization_url, created_at, updated_at
      ) values (?, 'openai', ?, 'waiting_for_login', null, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      attemptId,
      profileId,
      state,
      codeVerifier,
      nonce,
      redirectUri,
      authorizationUrl,
      now,
      now,
    )
    .run();

  const created = await getAttemptById(db, attemptId);
  if (!created) {
    throw new OpenAiAuthError("OPENAI_OAUTH_CALLBACK_FAILED", "Bağlantı denemesi oluşturulamadı.", 500);
  }

  return {
    attempt: toConnectionAttempt(created),
    authorizationUrl,
  };
}

export async function getOpenAiConnectionAttempt(db: D1Database, attemptId: string) {
  const attempt = await getAttemptById(db, attemptId);
  return attempt ? toConnectionAttempt(attempt) : null;
}

export async function cancelOpenAiConnectionAttempt(db: D1Database, attemptId: string) {
  const existing = await getAttemptById(db, attemptId);
  if (!existing) {
    return null;
  }

  if (FINAL_ATTEMPT_STATUSES.has(existing.status)) {
    return toConnectionAttempt(existing);
  }

  const cancelled = await updateAttempt(db, attemptId, {
    status: "cancelled",
    error: null,
  });
  return cancelled ? toConnectionAttempt(cancelled) : null;
}

function renderCallbackHtml(input: {
  ok: boolean;
  title: string;
  message: string;
}) {
  const color = input.ok ? "#0f766e" : "#be123c";
  return `<!doctype html>
<html lang="tr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${input.title}</title>
    <style>
      body { font-family: ui-sans-serif, system-ui, sans-serif; margin: 0; padding: 24px; background: #f8fafc; color: #0f172a; }
      main { max-width: 680px; margin: 0 auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08); }
      h1 { margin: 0 0 12px; font-size: 24px; color: ${color}; }
      p { margin: 0; line-height: 1.6; }
    </style>
  </head>
  <body>
    <main>
      <h1>${input.title}</h1>
      <p>${input.message}</p>
    </main>
  </body>
</html>`;
}

async function upsertProfileAfterOAuth(
  db: D1Database,
  input: {
    profileId: string;
    label: string;
    emailMasked: string | null;
    lastError: string | null;
    status: "connected" | "needs_reauth" | "error";
  },
) {
  const now = Date.now();
  await db.prepare("update ai_profiles set is_active = 0").run();

  const existing = await db.prepare("select id from ai_profiles where id = ? limit 1").bind(input.profileId).first<{ id: string }>();

  if (existing) {
    await db
      .prepare(
        `update ai_profiles
         set label = ?, email_masked = ?, provider = ?, is_active = 1, status = ?, last_seen_at = ?,
             last_validated_at = ?, last_error = ?, connector_status_snapshot = ?, updated_at = ?
         where id = ?`,
      )
      .bind(
        input.label,
        input.emailMasked,
        "openai-oauth",
        input.status,
        now,
        input.status === "connected" ? now : null,
        input.lastError,
        JSON.stringify({ status: "online", provider: "openai-oauth" }),
        now,
        input.profileId,
      )
      .run();
    return;
  }

  await db
    .prepare(
      `insert into ai_profiles (
        id, label, email_masked, provider, is_active, status, last_seen_at,
        last_validated_at, last_error, connector_status_snapshot, updated_at
      ) values (?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      input.profileId,
      input.label,
      input.emailMasked,
      "openai-oauth",
      input.status,
      now,
      input.status === "connected" ? now : null,
      input.lastError,
      JSON.stringify({ status: "online", provider: "openai-oauth" }),
      now,
    )
    .run();
}

async function upsertCredential(
  db: D1Database,
  env: Env,
  input: {
    profileId: string;
    accessToken: string;
    refreshToken: string | null;
    idToken: string | null;
    apiKey: string | null;
    scope: string | null;
    tokenType: string | null;
    accessTokenExpiresAt: number | null;
  },
) {
  const now = Date.now();
  const encryptedAccessToken = await encryptSecret(input.accessToken, env);
  const encryptedRefreshToken = input.refreshToken ? await encryptSecret(input.refreshToken, env) : null;
  const encryptedIdToken = input.idToken ? await encryptSecret(input.idToken, env) : null;
  const encryptedApiKey = input.apiKey ? await encryptSecret(input.apiKey, env) : null;

  const existing = await db
    .prepare("select profile_id as profileId from ai_openai_credentials where profile_id = ? limit 1")
    .bind(input.profileId)
    .first<{ profileId: string }>();

  if (existing) {
    await db
      .prepare(
        `update ai_openai_credentials
         set access_token_encrypted = ?, refresh_token_encrypted = ?, id_token_encrypted = ?, api_key_encrypted = ?,
             token_type = ?, scope = ?, access_token_expires_at = ?, updated_at = ?
         where profile_id = ?`,
      )
      .bind(
        encryptedAccessToken,
        encryptedRefreshToken,
        encryptedIdToken,
        encryptedApiKey,
        input.tokenType,
        input.scope,
        input.accessTokenExpiresAt,
        now,
        input.profileId,
      )
      .run();
    return;
  }

  await db
    .prepare(
      `insert into ai_openai_credentials (
        profile_id, access_token_encrypted, refresh_token_encrypted, id_token_encrypted, api_key_encrypted,
        token_type, scope, access_token_expires_at, created_at, updated_at
      ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      input.profileId,
      encryptedAccessToken,
      encryptedRefreshToken,
      encryptedIdToken,
      encryptedApiKey,
      input.tokenType,
      input.scope,
      input.accessTokenExpiresAt,
      now,
      now,
    )
    .run();
}

function parseOpenAiProjects(payload: unknown): OpenAiProject[] {
  if (!payload || typeof payload !== "object" || !Array.isArray((payload as { data?: unknown }).data)) {
    return [];
  }

  return (payload as { data: unknown[] }).data
    .map((item) => (item && typeof item === "object" ? (item as Record<string, unknown>) : null))
    .filter((item): item is Record<string, unknown> => Boolean(item))
    .map((item) => {
      const externalId = typeof item.id === "string" ? item.id.trim() : "";
      const displayName = typeof item.name === "string" ? item.name.trim() : externalId;
      return { externalId, displayName };
    })
    .filter((item) => item.externalId.startsWith("proj_"));
}

async function syncOpenAiWorkspaces(
  db: D1Database,
  env: Env,
  input: { profileId: string; credential: string },
) {
  const headers: Record<string, string> = {
    Accept: "application/json",
    Authorization: `Bearer ${input.credential}`,
  };
  if (env.OPENAI_ORGANIZATION?.trim()) {
    headers["OpenAI-Organization"] = env.OPENAI_ORGANIZATION.trim();
  }

  const response = await fetch(`${readApiBaseUrl(env)}/organization/projects?limit=100`, {
    method: "GET",
    headers,
  }).catch(() => null);

  if (!response || !response.ok) {
    return;
  }

  const payload = await response.json().catch(() => null);
  const projects = parseOpenAiProjects(payload);
  if (projects.length === 0) {
    return;
  }

  await db
    .prepare("delete from ai_openai_workspaces where profile_id = ?")
    .bind(input.profileId)
    .run();

  const now = Date.now();
  for (const [index, project] of projects.entries()) {
    const rowId = `${input.profileId}:${project.externalId}`;
    await db
      .prepare(
        `insert into ai_openai_workspaces (
          id, profile_id, external_id, display_name, is_selected, created_at, updated_at
        ) values (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(rowId, input.profileId, project.externalId, project.displayName || project.externalId, index === 0 ? 1 : 0, now, now)
      .run();
  }
}

export async function handleOpenAiOAuthCallback(
  db: D1Database,
  env: Env,
  query: {
    code?: string;
    state?: string;
    error?: string;
    error_description?: string;
  },
): Promise<OAuthCallbackResult> {
  const state = query.state?.trim() || "";
  if (!state) {
    return {
      ok: false,
      attempt: null,
      html: renderCallbackHtml({
        ok: false,
        title: OAUTH_CALLBACK_FAILURE_TITLE,
        message: "OAuth callback isteğinde state parametresi bulunamadı.",
      }),
    };
  }

  const attempt = await getAttemptByState(db, state);
  if (!attempt) {
    return {
      ok: false,
      attempt: null,
      html: renderCallbackHtml({
        ok: false,
        title: OAUTH_CALLBACK_FAILURE_TITLE,
        message: "Bekleyen bağlantı denemesi bulunamadı. AI Bağlantıları sayfasından tekrar deneyin.",
      }),
    };
  }

  if (query.error) {
    const failed = await updateAttempt(db, attempt.id, {
      status: "failed",
      error: query.error_description || query.error,
      oauthState: null,
      codeVerifier: null,
    });
    return {
      ok: false,
      attempt: failed ? toConnectionAttempt(failed) : null,
      html: renderCallbackHtml({
        ok: false,
        title: OAUTH_CALLBACK_FAILURE_TITLE,
        message: `OAuth akışı tamamlanmadı: ${query.error_description || query.error}`,
      }),
    };
  }

  if (!query.code) {
    const failed = await updateAttempt(db, attempt.id, {
      status: "failed",
      error: "OAuth code parametresi alınamadı.",
      oauthState: null,
      codeVerifier: null,
    });
    return {
      ok: false,
      attempt: failed ? toConnectionAttempt(failed) : null,
      html: renderCallbackHtml({
        ok: false,
        title: OAUTH_CALLBACK_FAILURE_TITLE,
        message: "OAuth callback kodu alınamadı.",
      }),
    };
  }

  await updateAttempt(db, attempt.id, {
    status: "verifying_session",
    error: null,
  });

  try {
    const clientId = requireOauthClientId(env);
    const clientSecret = readOauthClientSecret(env);
    const profileId = attempt.profileId ?? crypto.randomUUID();
    const token = await requestToken(env, {
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      code: query.code,
      code_verifier: attempt.codeVerifier ?? undefined,
      redirect_uri: attempt.redirectUri,
    });

    if (!token.access_token) {
      throw new OpenAiAuthError("OPENAI_OAUTH_CALLBACK_FAILED", "OAuth access token alınamadı.");
    }

    const idToken = token.id_token ?? null;
    const apiKey = await maybeExchangeApiKeyFromIdToken(env, {
      clientId,
      clientSecret,
      idToken,
    });
    const claims = decodeIdTokenClaims(idToken);
    const email = claims?.email ?? null;
    const label =
      claims?.name?.trim() ||
      claims?.preferred_username?.trim() ||
      email ||
      "OpenAI Workspace";

    await upsertProfileAfterOAuth(db, {
      profileId,
      label,
      emailMasked: maskEmail(email),
      status: "connected",
      lastError: null,
    });

    await upsertCredential(db, env, {
      profileId,
      accessToken: token.access_token,
      refreshToken: token.refresh_token ?? null,
      idToken,
      apiKey,
      scope: token.scope ?? null,
      tokenType: token.token_type ?? null,
      accessTokenExpiresAt: resolveAccessTokenExpiresAt(token.expires_in),
    });

    await syncOpenAiWorkspaces(db, env, {
      profileId,
      credential: apiKey ?? token.access_token,
    }).catch(() => undefined);

    const completed = await updateAttempt(db, attempt.id, {
      status: "completed",
      error: null,
      profileId,
      oauthState: null,
      codeVerifier: null,
    });

    return {
      ok: true,
      attempt: completed ? toConnectionAttempt(completed) : null,
      html: renderCallbackHtml({
        ok: true,
        title: OAUTH_CALLBACK_SUCCESS_TITLE,
        message: "Hesap başarıyla bağlandı. Uygulamaya geri dönüp devam edebilirsiniz.",
      }),
    };
  } catch (error) {
    const message =
      error instanceof OpenAiAuthError
        ? error.message
        : error instanceof Error
          ? error.message
          : "OAuth callback sırasında beklenmeyen bir hata oluştu.";
    const failed = await updateAttempt(db, attempt.id, {
      status: "failed",
      error: message,
      oauthState: null,
      codeVerifier: null,
    });

    if (attempt.profileId) {
      await upsertProfileAfterOAuth(db, {
        profileId: attempt.profileId,
        label: "OpenAI Workspace",
        emailMasked: null,
        status: "needs_reauth",
        lastError: message,
      }).catch(() => undefined);
    }

    return {
      ok: false,
      attempt: failed ? toConnectionAttempt(failed) : null,
      html: renderCallbackHtml({
        ok: false,
        title: OAUTH_CALLBACK_FAILURE_TITLE,
        message,
      }),
    };
  }
}

export async function listAiProfiles(db: D1Database) {
  const result = await db
    .prepare(
      `select id, label, email_masked as emailMasked, provider, is_active as isActive, status,
              last_seen_at as lastSeenAt, last_validated_at as lastValidatedAt, last_error as lastError,
              connector_status_snapshot as connectorStatusSnapshot, updated_at as updatedAt
       from ai_profiles
       where provider = 'openai-oauth'
       order by is_active desc, updated_at desc, last_seen_at desc, id asc`,
    )
    .all<StoredAiProfile & { isActive: number | boolean }>();

  return result.results.map<StoredAiProfile>((item) => ({
    ...item,
    isActive: Boolean(item.isActive),
  }));
}

export async function getActiveAiProfile(db: D1Database) {
  const result = await db
    .prepare(
      `select id, label, email_masked as emailMasked, provider, is_active as isActive, status,
              last_seen_at as lastSeenAt, last_validated_at as lastValidatedAt, last_error as lastError,
              connector_status_snapshot as connectorStatusSnapshot, updated_at as updatedAt
       from ai_profiles
       where is_active = 1 and provider = 'openai-oauth'
       order by updated_at desc
       limit 1`,
    )
    .first<StoredAiProfile & { isActive: number | boolean }>();

  if (!result) {
    return null;
  }

  return {
    ...result,
    isActive: Boolean(result.isActive),
  } satisfies StoredAiProfile;
}

export async function activateAiProfile(db: D1Database, profileId: string) {
  const existing = await db
    .prepare("select id from ai_profiles where id = ? and provider = 'openai-oauth' limit 1")
    .bind(profileId)
    .first<{ id: string }>();
  if (!existing) {
    return null;
  }

  const now = Date.now();
  await db.prepare("update ai_profiles set is_active = 0 where provider = 'openai-oauth'").run();
  await db
    .prepare("update ai_profiles set is_active = 1, updated_at = ?, last_seen_at = ? where id = ?")
    .bind(now, now, profileId)
    .run();

  return getActiveAiProfile(db);
}

export async function deleteAiProfile(db: D1Database, profileId: string) {
  const existing = await db
    .prepare("select id from ai_profiles where id = ? and provider = 'openai-oauth' limit 1")
    .bind(profileId)
    .first<{ id: string }>();
  if (!existing) {
    return false;
  }

  await db.prepare("delete from ai_profiles where id = ?").bind(profileId).run();
  await db.prepare("delete from ai_openai_credentials where profile_id = ?").bind(profileId).run();
  await db.prepare("delete from ai_openai_workspaces where profile_id = ?").bind(profileId).run();
  return true;
}

export async function reconnectAiProfile(db: D1Database, env: Env, profileId: string) {
  const existing = await db
    .prepare("select id from ai_profiles where id = ? and provider = 'openai-oauth' limit 1")
    .bind(profileId)
    .first<{ id: string }>();
  if (!existing) {
    return null;
  }

  await db
    .prepare("update ai_profiles set status = 'needs_reauth', last_error = ?, updated_at = ? where id = ?")
    .bind("Yeniden giriş gerekli.", Date.now(), profileId)
    .run();

  return startOpenAiConnection(db, env, { profileId });
}

export async function getOpenAiConnectionHealth(db: D1Database): Promise<OpenAiConnectionHealth> {
  const [activeProfile, latestAttemptRaw] = await Promise.all([getActiveAiProfile(db), getLatestAttempt(db)]);
  let latestAttempt = latestAttemptRaw;
  if (
    latestAttempt &&
    IN_PROGRESS_ATTEMPT_STATUSES.has(latestAttempt.status) &&
    Date.now() - latestAttempt.updatedAt > ATTEMPT_STALE_TIMEOUT_MS
  ) {
    latestAttempt = await updateAttempt(db, latestAttempt.id, {
      status: "failed",
      error: "Bağlantı denemesi zaman aşımına uğradı. Lütfen tekrar deneyin.",
      oauthState: null,
      codeVerifier: null,
    });
  }

  return {
    status: "online",
    provider: "openai-oauth",
    activeProfile,
    connectionAttempt: latestAttempt ? toConnectionAttempt(latestAttempt) : null,
  };
}

async function listProfileWorkspaces(db: D1Database, profileId: string) {
  const result = await db
    .prepare(
      `select id, profile_id as profileId, external_id as externalId, display_name as displayName,
              is_selected as isSelected, created_at as createdAt, updated_at as updatedAt
       from ai_openai_workspaces
       where profile_id = ?
       order by is_selected desc, updated_at desc, display_name asc`,
    )
    .bind(profileId)
    .all<StoredOpenAiWorkspace & { isSelected: number | boolean }>();

  return result.results.map<StoredOpenAiWorkspace>((workspace) => ({
    ...workspace,
    isSelected: Boolean(workspace.isSelected),
  }));
}

export async function getAiProfileWorkspaces(db: D1Database, profileId: string) {
  const existing = await db.prepare("select id from ai_profiles where id = ? limit 1").bind(profileId).first<{ id: string }>();
  if (!existing) {
    return null;
  }

  return listProfileWorkspaces(db, profileId);
}

export async function selectAiProfileWorkspace(db: D1Database, profileId: string, externalId: string) {
  const existing = await db
    .prepare(
      `select id from ai_openai_workspaces where profile_id = ? and external_id = ? limit 1`,
    )
    .bind(profileId, externalId)
    .first<{ id: string }>();
  if (!existing) {
    return null;
  }

  const now = Date.now();
  await db.prepare("update ai_openai_workspaces set is_selected = 0, updated_at = ? where profile_id = ?").bind(now, profileId).run();
  await db
    .prepare("update ai_openai_workspaces set is_selected = 1, updated_at = ? where profile_id = ? and external_id = ?")
    .bind(now, profileId, externalId)
    .run();

  return listProfileWorkspaces(db, profileId);
}

async function getStoredCredential(db: D1Database, profileId: string) {
  return db
    .prepare(
      `select profile_id as profileId, access_token_encrypted as accessTokenEncrypted,
              refresh_token_encrypted as refreshTokenEncrypted, id_token_encrypted as idTokenEncrypted,
              api_key_encrypted as apiKeyEncrypted, token_type as tokenType, scope,
              access_token_expires_at as accessTokenExpiresAt
       from ai_openai_credentials
       where profile_id = ?
       limit 1`,
    )
    .bind(profileId)
    .first<StoredCredentialRow>();
}

async function markActiveProfileNeedsReauth(db: D1Database, profileId: string, reason: string) {
  await db
    .prepare(
      `update ai_profiles
       set status = 'needs_reauth', last_error = ?, updated_at = ?
       where id = ?`,
    )
    .bind(reason, Date.now(), profileId)
    .run();
}

async function readSelectedWorkspaceProjectId(db: D1Database, profileId: string) {
  const workspace = await db
    .prepare(
      `select external_id as externalId
       from ai_openai_workspaces
       where profile_id = ? and is_selected = 1
       limit 1`,
    )
    .bind(profileId)
    .first<{ externalId: string }>();

  return workspace?.externalId ?? null;
}

async function refreshAccessToken(
  db: D1Database,
  env: Env,
  input: {
    profileId: string;
    refreshToken: string;
  },
) {
  const clientId = requireOauthClientId(env);
  const token = await requestToken(env, {
    grant_type: "refresh_token",
    client_id: clientId,
    client_secret: readOauthClientSecret(env),
    refresh_token: input.refreshToken,
  });

  if (!token.access_token) {
    throw new OpenAiAuthError("PROFILE_NEEDS_REAUTH", "OAuth refresh sonrası access token alınamadı.");
  }

  const previous = await getStoredCredential(db, input.profileId);
  const idToken = token.id_token ?? (previous ? await decryptSecret(previous.idTokenEncrypted, env) : null);
  const apiKey = previous ? await decryptSecret(previous.apiKeyEncrypted, env) : null;
  await upsertCredential(db, env, {
    profileId: input.profileId,
    accessToken: token.access_token,
    refreshToken: token.refresh_token ?? input.refreshToken,
    idToken,
    apiKey,
    scope: token.scope ?? previous?.scope ?? null,
    tokenType: token.token_type ?? previous?.tokenType ?? null,
    accessTokenExpiresAt: resolveAccessTokenExpiresAt(token.expires_in),
  });

  await db
    .prepare(
      `update ai_profiles set status = 'connected', last_error = null, last_validated_at = ?, updated_at = ?
       where id = ?`,
    )
    .bind(Date.now(), Date.now(), input.profileId)
    .run();
}

export async function resolveActiveOpenAiCredential(
  db: D1Database,
  env: Env,
): Promise<ActiveOpenAiCredential> {
  const activeProfile = await getActiveAiProfile(db);
  if (!activeProfile) {
    throw new OpenAiAuthError("NO_ACTIVE_PROFILE", "Aktif OpenAI hesabı bulunamadı.");
  }

  if (activeProfile.status === "needs_reauth" || activeProfile.status === "error") {
    throw new OpenAiAuthError("PROFILE_NEEDS_REAUTH", "Aktif OpenAI hesabı yeniden bağlanmalı.");
  }

  const latestAttempt = await getLatestAttempt(db);
  if (latestAttempt && IN_PROGRESS_ATTEMPT_STATUSES.has(latestAttempt.status)) {
    throw new OpenAiAuthError("LOGIN_IN_PROGRESS", "OAuth bağlantısı tamamlanana kadar bekleyin.");
  }

  const stored = await getStoredCredential(db, activeProfile.id);
  if (!stored) {
    await markActiveProfileNeedsReauth(db, activeProfile.id, "OAuth token kaydı bulunamadı.");
    throw new OpenAiAuthError("PROFILE_NEEDS_REAUTH", "Aktif OpenAI hesabı yeniden bağlanmalı.");
  }

  let accessToken = await decryptSecret(stored.accessTokenEncrypted, env);
  const refreshToken = await decryptSecret(stored.refreshTokenEncrypted, env);
  const apiKey = await decryptSecret(stored.apiKeyEncrypted, env);

  const now = Date.now();
  const isExpired =
    !accessToken ||
    (typeof stored.accessTokenExpiresAt === "number" && stored.accessTokenExpiresAt <= now + 15_000);

  if (isExpired) {
    if (!refreshToken) {
      await markActiveProfileNeedsReauth(db, activeProfile.id, "OAuth token süresi doldu.");
      throw new OpenAiAuthError("PROFILE_NEEDS_REAUTH", "Aktif OpenAI hesabı yeniden bağlanmalı.");
    }

    await refreshAccessToken(db, env, {
      profileId: activeProfile.id,
      refreshToken,
    });

    const refreshed = await getStoredCredential(db, activeProfile.id);
    accessToken = refreshed ? await decryptSecret(refreshed.accessTokenEncrypted, env) : null;
  }

  if (!accessToken) {
    await markActiveProfileNeedsReauth(db, activeProfile.id, "OAuth access token çözümlenemedi.");
    throw new OpenAiAuthError("PROFILE_NEEDS_REAUTH", "Aktif OpenAI hesabı yeniden bağlanmalı.");
  }

  const selectedWorkspaceProjectId = await readSelectedWorkspaceProjectId(db, activeProfile.id);

  return {
    profile: activeProfile,
    accessToken,
    apiKey,
    selectedWorkspaceProjectId,
  };
}
