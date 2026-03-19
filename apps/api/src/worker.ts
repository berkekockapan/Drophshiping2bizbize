import { createApp } from "./index";
import type { Env, MessageBatch, RefreshJob, ScheduledController } from "./config/bindings";

function noop(): void {
  return;
}

export default {
  fetch(request: Request, env: Env, ctx: Parameters<ReturnType<typeof createApp>["fetch"]>[2]) {
    return createApp().fetch(request, env, ctx);
  },
  scheduled(_controller: ScheduledController, _env: Env, _ctx: unknown) {
    noop();
  },
  queue(_batch: MessageBatch<RefreshJob>, _env: Env, _ctx: unknown) {
    noop();
  },
};
