export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<unknown>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch?<T = unknown>(statements: D1PreparedStatement[]): Promise<T[]>;
  exec?(query: string): Promise<unknown>;
}


export interface R2ObjectBody {
  body: ReadableStream<Uint8Array>;
  httpEtag?: string;
  httpMetadata?: { contentType?: string };
  writeHttpMetadata(headers: Headers): void;
}

export interface R2Bucket {
  get(key: string): Promise<R2ObjectBody | null>;
  put(
    key: string,
    value: ArrayBuffer | ArrayBufferView | ReadableStream<Uint8Array> | string,
    options?: { httpMetadata?: { contentType?: string } },
  ): Promise<unknown>;
}

export interface Queue<Body> {
  send(body: Body): Promise<void>;
}

export interface Message<Body> {
  body: Body;
  ack(): void;
  retry(): void;
}

export interface MessageBatch<Body> {
  messages: Array<Message<Body>>;
}

export interface ScheduledController {
  cron: string;
  scheduledTime: number;
}

export interface RefreshJob {
  productId: string;
}

export interface Env {
  DB: D1Database;
  REFRESH_QUEUE: Queue<RefreshJob>;
  PROMPT_IMAGES?: R2Bucket;
  OPENAI_OAUTH_CLIENT_ID?: string;
  OPENAI_OAUTH_CLIENT_SECRET?: string;
  OPENAI_OAUTH_REDIRECT_URI?: string;
  OPENAI_OAUTH_ORIGINATOR?: string;
  OPENAI_OAUTH_ENCRYPTION_KEY?: string;
  OPENAI_OAUTH_AUTHORIZE_URL?: string;
  OPENAI_OAUTH_TOKEN_URL?: string;
  OPENAI_OAUTH_USE_CODEX_FLOW?: string;
  OPENAI_API_BASE_URL?: string;
  OPENAI_DEFAULT_MODEL?: string;
  OPENAI_ORGANIZATION?: string;
}
