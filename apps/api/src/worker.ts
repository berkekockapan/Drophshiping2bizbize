import { createApp } from "./index";
import type { Env, MessageBatch, RefreshJob, ScheduledController } from "./config/bindings";
import { enqueueTrackedProducts } from "./modules/scheduler/enqueueTrackedProducts";
import { processRefreshQueueBatch } from "./modules/scheduler/processRefreshJob";

export default {
  fetch(request: Request, env: Env, ctx: Parameters<ReturnType<typeof createApp>["fetch"]>[2]) {
    return createApp().fetch(request, env, ctx);
  },
  scheduled(controller: ScheduledController, env: Env, ctx: { waitUntil(promise: Promise<unknown>): void }) {
    ctx.waitUntil(enqueueTrackedProducts(env, new Date(controller.scheduledTime)));
  },
  queue(batch: MessageBatch<RefreshJob>, env: Env, ctx: { waitUntil(promise: Promise<unknown>): void }) {
    ctx.waitUntil(processRefreshQueueBatch(batch, env));
  },
};
