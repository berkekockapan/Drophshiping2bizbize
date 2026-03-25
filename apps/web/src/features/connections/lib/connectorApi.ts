import type {
  ConnectionAttemptResponse,
  ConnectorGenerateFieldPayload,
  ConnectorHealthResponse,
  EtsyPrepField,
} from "../../../app/api";

export class ConnectorApiRequestError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "ConnectorApiRequestError";
  }
}

function joinUrl(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/+$/, "")}${path}`;
}

async function readError(response: Response) {
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";

  if (contentType.includes("application/json")) {
    const body = (await response.json().catch(() => null)) as
      | {
          error?:
            | string
            | {
                code?: string;
                message?: string;
              };
          message?: string;
        }
      | null;

    if (typeof body?.error === "object" && body.error) {
      return {
        code: body.error.code ?? "CONNECTOR_REQUEST_FAILED",
        message: body.error.message ?? `Request failed (${response.status})`,
      };
    }

    if (typeof body?.error === "string") {
      return {
        code: "CONNECTOR_REQUEST_FAILED",
        message: body.error,
      };
    }

    if (typeof body?.message === "string") {
      return {
        code: "CONNECTOR_REQUEST_FAILED",
        message: body.message,
      };
    }
  }

  const fallback = await response.text().catch(() => "");
  return {
    code: "CONNECTOR_REQUEST_FAILED",
    message: fallback.trim() || `Request failed (${response.status})`,
  };
}

async function request<T>(fetchImpl: typeof fetch, baseUrl: string, path: string, init?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetchImpl(joinUrl(baseUrl, path), init);
  } catch (error) {
    throw error;
  }

  if (!response.ok) {
    const mapped = await readError(response);
    throw new ConnectorApiRequestError(mapped.code, mapped.message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function createConnectorApiClient({
  baseUrl,
  fetchImpl = fetch,
}: {
  baseUrl: string;
  fetchImpl?: typeof fetch;
}) {
  return {
    async getHealth() {
      return request<ConnectorHealthResponse>(fetchImpl, baseUrl, "/health");
    },
    async startOpenAiConnection() {
      return request<{ attempt: ConnectionAttemptResponse }>(fetchImpl, baseUrl, "/connections/openai/start", {
        method: "POST",
      });
    },
    async getConnectionAttempt(attemptId: string) {
      return request<{ attempt: ConnectionAttemptResponse }>(
        fetchImpl,
        baseUrl,
        `/connections/openai/attempts/${encodeURIComponent(attemptId)}`,
      );
    },
    async reconnectProfile(profileId: string) {
      return request<{ attempt: ConnectionAttemptResponse }>(
        fetchImpl,
        baseUrl,
        `/profiles/${encodeURIComponent(profileId)}/reconnect`,
        { method: "POST" },
      );
    },
    async deleteProfile(profileId: string) {
      await request(fetchImpl, baseUrl, `/profiles/${encodeURIComponent(profileId)}`, { method: "DELETE" });
    },
    async generateField(payload: ConnectorGenerateFieldPayload) {
      return request<{ field: EtsyPrepField; value: string; provider: string }>(fetchImpl, baseUrl, "/generate-field", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
      });
    },
  };
}
