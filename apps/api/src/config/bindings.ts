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
}
