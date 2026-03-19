import type { D1Database, Env } from "../config/bindings";

export function getDb(env: Pick<Env, "DB">): D1Database {
  return env.DB;
}
