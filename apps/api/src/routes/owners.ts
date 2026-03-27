import { Hono } from "hono";
import { ownerKeySchema } from "../contracts/owners";

import type { Env } from "../config/bindings";
import { createNotificationsRepo } from "../db/repositories/notificationsRepo";
import { ParseError } from "../modules/scraping/parseErrors";
import { buildActiveManualRefreshRunView, buildManualRefreshRunView } from "../modules/tracking/buildManualRefreshRunView";
import { buildTrackingListView, buildTrashListView } from "../modules/tracking/buildTrackingListView";
import { deleteTrackedProduct } from "../modules/tracking/deleteTrackedProduct";
import { permanentlyDeleteTrackedProduct } from "../modules/tracking/permanentlyDeleteTrackedProduct";
import {
  DuplicateProductError,
  type CreateTrackedProductOptions,
  createTrackedProduct,
} from "../modules/tracking/createTrackedProduct";
import { processManualRefreshRun } from "../modules/tracking/processManualRefreshRun";
import { restoreTrackedProduct } from "../modules/tracking/restoreTrackedProduct";
import { retryFailedManualRefreshRun } from "../modules/tracking/retryFailedManualRefreshRun";
import { setTrackedProductFavorite } from "../modules/tracking/setTrackedProductFavorite";
import { setTrackedProductCategory } from "../modules/tracking/setTrackedProductCategory";
import { startManualRefreshRun } from "../modules/tracking/startManualRefreshRun";
import { createCategoriesRouter } from "./categories";
import { createDraftsRouter } from "./drafts";
import { createProductsRouter } from "./products";

function parseOwnerKey(value: string | undefined) {
  const parsed = ownerKeySchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function createOwnersRouter(options: CreateTrackedProductOptions = {}) {
  const app = new Hono<{ Bindings: Env }>();

  app.get("/products", async (c) => {
    const ownerKey = parseOwnerKey(c.req.param("ownerKey"));
    if (!ownerKey) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    const favoriteQuery = c.req.query("favorite");
    const favorite = favoriteQuery === "true" ? true : favoriteQuery === "false" ? false : undefined;
    const categoryId = c.req.query("categoryId");

    const view = await buildTrackingListView(c.env.DB, ownerKey, {
      status: c.req.query("status"),
      parseStatus: c.req.query("parseStatus"),
      search: c.req.query("search"),
      favorite,
      categoryId: categoryId === "" ? null : categoryId,
    });

    return c.json(view);
  });

  app.post("/products", async (c) => {
    const ownerKey = parseOwnerKey(c.req.param("ownerKey"));
    if (!ownerKey) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    const body = await c.req.json<{ trendyolUrl?: string }>().catch(() => null);

    if (!body?.trendyolUrl) {
      return c.json({ error: "trendyolUrl is required" }, 400);
    }

    try {
      const result = await createTrackedProduct(c.env, { ownerKey, trendyolUrl: body.trendyolUrl }, options);
      return c.json(result, 201);
    } catch (error) {
      if (error instanceof DuplicateProductError && error.reason === "TRASH_DUPLICATE") {
        return c.json(
          {
            error: "Bu link cop kutusunda. Yeni kayit acmak yerine geri yukleyin.",
            code: "PRODUCT_IN_TRASH",
            trashedProductId: error.trashedProductId,
          },
          409,
        );
      }

      if (error instanceof DuplicateProductError) {
        return c.json({ error: error.message }, 409);
      }

      if (error instanceof ParseError) {
        return c.json({ error: `Trendyol sayfasi ayrıştırılamadı (${error.code})` }, 422);
      }

      if (error instanceof Error) {
        return c.json({ error: error.message }, 502);
      }

      return c.json({ error: "Beklenmeyen bir hata olustu" }, 500);
    }
  });

  app.post("/products/refresh-runs", async (c) => {
    const ownerKey = parseOwnerKey(c.req.param("ownerKey"));
    if (!ownerKey) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    const run = await startManualRefreshRun(c.env, ownerKey);
    c.executionCtx.waitUntil(processManualRefreshRun(c.env, ownerKey, run.id, options));

    const view = await buildManualRefreshRunView(c.env.DB, ownerKey, run.id);
    return c.json({ run: view }, 202);
  });

  app.get("/products/refresh-runs/active", async (c) => {
    const ownerKey = parseOwnerKey(c.req.param("ownerKey"));
    if (!ownerKey) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    return c.json({ run: await buildActiveManualRefreshRunView(c.env.DB, ownerKey) });
  });

  app.get("/products/refresh-runs/:runId", async (c) => {
    const ownerKey = parseOwnerKey(c.req.param("ownerKey"));
    if (!ownerKey) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    const run = await buildManualRefreshRunView(c.env.DB, ownerKey, c.req.param("runId"));
    if (!run) {
      return c.json({ error: "Run not found" }, 404);
    }

    return c.json({ run });
  });

  app.post("/products/refresh-runs/:runId/retry-failed", async (c) => {
    const ownerKey = parseOwnerKey(c.req.param("ownerKey"));
    if (!ownerKey) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    const sourceRunId = c.req.param("runId");
    const sourceRun = await buildManualRefreshRunView(c.env.DB, ownerKey, sourceRunId);
    if (!sourceRun) {
      return c.json({ error: "Run not found" }, 404);
    }

    const run = await retryFailedManualRefreshRun(c.env, ownerKey, sourceRunId);
    c.executionCtx.waitUntil(processManualRefreshRun(c.env, ownerKey, run.id, options));

    const view = await buildManualRefreshRunView(c.env.DB, ownerKey, run.id);
    return c.json({ run: view }, 202);
  });

  app.post("/products/:productId/favorite", async (c) => {
    const ownerKey = parseOwnerKey(c.req.param("ownerKey"));
    if (!ownerKey) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    const body = await c.req.json<{ isFavorite?: boolean }>().catch(() => null);
    if (typeof body?.isFavorite !== "boolean") {
      return c.json({ error: "isFavorite is required" }, 400);
    }

    const result = await setTrackedProductFavorite(c.env.DB, ownerKey, c.req.param("productId"), body.isFavorite);
    if (!result) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    return c.json(result);
  });

  app.patch("/products/:productId/category", async (c) => {
    const ownerKey = parseOwnerKey(c.req.param("ownerKey"));
    if (!ownerKey) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    const body = await c.req.json<{ categoryId?: string | null }>().catch(() => null);
    if (!body || !("categoryId" in body)) {
      return c.json({ error: "categoryId is required" }, 400);
    }

    const categoryId: string | null =
      body.categoryId == null || body.categoryId === "" || body.categoryId === "uncategorized"
        ? null
        : body.categoryId;
    const result = await setTrackedProductCategory(c.env.DB, ownerKey, c.req.param("productId"), categoryId);

    if (!result) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    return c.json(result);
  });

  app.delete("/products/:productId", async (c) => {
    const ownerKey = parseOwnerKey(c.req.param("ownerKey"));
    if (!ownerKey) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    const deleted = await deleteTrackedProduct(c.env.DB, ownerKey, c.req.param("productId"));
    if (!deleted) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    return c.body(null, 204);
  });

  app.get("/trash", async (c) => {
    const ownerKey = parseOwnerKey(c.req.param("ownerKey"));
    if (!ownerKey) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    return c.json(await buildTrashListView(c.env.DB, ownerKey));
  });

  app.post("/trash/products/:productId/restore", async (c) => {
    const ownerKey = parseOwnerKey(c.req.param("ownerKey"));
    if (!ownerKey) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    const restored = await restoreTrackedProduct(c.env.DB, ownerKey, c.req.param("productId"));
    if (!restored) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    return c.json({ ok: true });
  });

  app.delete("/trash/products/:productId", async (c) => {
    const ownerKey = parseOwnerKey(c.req.param("ownerKey"));
    if (!ownerKey) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    const deleted = await permanentlyDeleteTrackedProduct(c.env.DB, ownerKey, c.req.param("productId"));
    if (!deleted) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    return c.body(null, 204);
  });

  app.get("/notifications", async (c) => {
    const ownerKey = parseOwnerKey(c.req.param("ownerKey"));
    if (!ownerKey) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    const productId = c.req.query("productId") ?? null;
    const notifications = await createNotificationsRepo(c.env.DB).listNotifications(ownerKey, productId);
    return c.json({ items: notifications });
  });

  app.route("/products", createProductsRouter());
  app.route("/categories", createCategoriesRouter());
  app.route("/", createDraftsRouter());

  return app;
}
