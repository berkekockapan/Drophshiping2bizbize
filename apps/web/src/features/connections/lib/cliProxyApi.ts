export interface CliProxyAuthFile {
  name: string;
  label: string;
  disabled: boolean;
}

export interface CliProxyAuthFilesResponse {
  items: CliProxyAuthFile[];
}

export interface CliProxyAuthUrlResponse {
  authorizationUrl: string;
  state: string;
}

export interface CliProxyAuthStatusResponse {
  status: "wait" | "ok" | "error";
  error?: string;
  authFile?: CliProxyAuthFile | null;
}

export interface CliProxyChatCompletionResponse {
  choices: Array<{
    message?: {
      content?: string | null;
    };
  }>;
}

export class CliProxyRequestError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "CliProxyRequestError";
  }
}

type FetchLike = typeof fetch;
type RequestKind = "management" | "inference";

interface CreateCliProxyApiClientOptions {
  baseUrl: string;
  managementKey?: string | null;
  apiKey?: string | null;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
}

function joinUrl(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/+$/, "")}${path}`;
}

async function readErrorMessage(response: Response) {
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";

  if (contentType.includes("application/json")) {
    const body = (await response.json().catch(() => null)) as
      | {
          error?: string | { message?: string };
          message?: string;
        }
      | null;

    if (typeof body?.error === "string") {
      return body.error;
    }

    if (typeof body?.error === "object" && typeof body.error?.message === "string") {
      return body.error.message;
    }

    if (typeof body?.message === "string") {
      return body.message;
    }
  }

  const fallback = await response.text().catch(() => "");
  return fallback.trim() || `Request failed (${response.status})`;
}

function mapHttpError(kind: RequestKind, status: number, message: string) {
  if (kind === "management" && (status === 401 || status === 403)) {
    return new CliProxyRequestError("TARGET_MANAGEMENT_UNAUTHORIZED", message, status);
  }

  if (kind === "inference" && (status === 401 || status === 403)) {
    return new CliProxyRequestError("TARGET_INFERENCE_UNAUTHORIZED", message, status);
  }

  if (status >= 500) {
    return new CliProxyRequestError(
      kind === "management" ? "TARGET_MANAGEMENT_UNAVAILABLE" : "TARGET_INFERENCE_UNAVAILABLE",
      message,
      status,
    );
  }

  return new CliProxyRequestError("TARGET_REQUEST_FAILED", message, status);
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  return response.json() as Promise<T>;
}

export function createCliProxyApiClient({
  baseUrl,
  managementKey,
  apiKey,
  fetchImpl = fetch,
  timeoutMs = 30_000,
}: CreateCliProxyApiClientOptions) {
  async function fetchWithTimeout(path: string, init: RequestInit, kind: RequestKind) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetchImpl(joinUrl(baseUrl, path), {
        ...init,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw mapHttpError(kind, response.status, await readErrorMessage(response));
      }

      return response;
    } catch (error) {
      if (error instanceof CliProxyRequestError) {
        throw error;
      }

      if (
        typeof error === "object" &&
        error !== null &&
        "name" in error &&
        error.name === "AbortError"
      ) {
        throw new CliProxyRequestError(
          "TARGET_REQUEST_TIMEOUT",
          "Hedef sunucu zamanında yanıt vermedi.",
        );
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  async function managementFetch(path: string, init: RequestInit = {}) {
    if (!managementKey) {
      throw new CliProxyRequestError("TARGET_MANAGEMENT_MISSING", "Management key gerekli.");
    }

    return fetchWithTimeout(
      path,
      {
        ...init,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${managementKey}`,
          ...(init.headers ?? {}),
        },
      },
      "management",
    );
  }

  async function inferenceFetch(path: string, init: RequestInit = {}) {
    if (!apiKey) {
      throw new CliProxyRequestError("TARGET_INFERENCE_MISSING", "Inference API key gerekli.");
    }

    return fetchWithTimeout(
      path,
      {
        ...init,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          ...(init.headers ?? {}),
        },
      },
      "inference",
    );
  }

  return {
    async getCodexAuthUrl() {
      const response = await managementFetch("/v0/management/codex-auth-url?is_webui=1");
      return parseJsonResponse<CliProxyAuthUrlResponse>(response);
    },
    async getAuthStatus(state: string) {
      const response = await managementFetch(`/v0/management/get-auth-status?state=${encodeURIComponent(state)}`);
      return parseJsonResponse<CliProxyAuthStatusResponse>(response);
    },
    async listAuthFiles() {
      const response = await managementFetch("/v0/management/auth-files");
      return parseJsonResponse<CliProxyAuthFilesResponse>(response);
    },
    async setAuthFileDisabled(name: string, disabled: boolean) {
      const response = await managementFetch("/v0/management/auth-files/status", {
        method: "PATCH",
        body: JSON.stringify({ name, disabled }),
      });

      return parseJsonResponse<{ ok: true }>(response);
    },
    async deleteAuthFile(name: string) {
      const response = await managementFetch(`/v0/management/auth-files?name=${encodeURIComponent(name)}`, {
        method: "DELETE",
      });

      if (response.status === 204) {
        return;
      }

      return parseJsonResponse<{ ok: true }>(response);
    },
    async createChatCompletion(payload: Record<string, unknown>) {
      const response = await inferenceFetch("/v1/chat/completions", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      return parseJsonResponse<CliProxyChatCompletionResponse>(response);
    },
  };
}
