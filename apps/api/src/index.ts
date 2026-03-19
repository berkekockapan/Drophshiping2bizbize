import { Hono } from "hono";

import type { Env } from "./config/bindings";

export function createApp() {
  const app = new Hono<{ Bindings: Env }>();
  app.get("/health", (c) => c.json({ ok: true }));
  return app;
}

export default createApp;
