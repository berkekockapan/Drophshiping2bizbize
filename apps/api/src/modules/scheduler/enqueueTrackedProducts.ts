import type { Env } from "../../config/bindings";
import { createSettingsRepo } from "../../db/repositories/settingsRepo";

export async function enqueueTrackedProducts(env: Env, now: Date) {
  const settingsRepo = createSettingsRepo(env.DB);
  const settings = await settingsRepo.getSettings();
  const dueBefore = now.getTime() - settings.refreshIntervalHours * 60 * 60 * 1000;

  const dueProducts = (
    await env.DB
      .prepare(
        `select id
         from products
         where status = 'ACTIVE'
           and (last_checked_at is null or last_checked_at <= ?)
         order by created_at asc`,
      )
      .bind(dueBefore)
      .all<{ id: string }>()
  ).results;

  await Promise.all(dueProducts.map((product) => env.REFRESH_QUEUE.send({ productId: product.id })));

  return dueProducts.map((product) => product.id);
}
