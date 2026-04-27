import { Hono } from "hono";
import { ownerKeySchema } from "../contracts/owners";

import type { Env } from "../config/bindings";
import { createEtsyShopsRepo } from "../db/repositories/etsyShopsRepo";
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
import { normalizeTrendyolUrl } from "../modules/tracking/normalizeTrendyolUrl";
import { createCategoriesRouter } from "./categories";
import { createDraftsRouter } from "./drafts";
import { createEtsyShopsRouter } from "./etsyShops";
import { createProductsRouter } from "./products";
import { createSourceProductCategoriesRouter } from "./sourceProductCategories";
import { createSourceProductsRouter } from "./sourceProducts";

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
    const shopId = c.req.query("shopId");

    const view = await buildTrackingListView(c.env.DB, ownerKey, {
      status: c.req.query("status"),
      parseStatus: c.req.query("parseStatus"),
      search: c.req.query("search"),
      favorite,
      categoryId: categoryId === "" ? null : categoryId,
      shopId: shopId === "" ? null : shopId,
    });

    return c.json(view);
  });

  app.post("/products", async (c) => {
    const ownerKey = parseOwnerKey(c.req.param("ownerKey"));
    if (!ownerKey) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    const body = await c.req.json<{ trendyolUrl?: string; shopIds?: string[] }>().catch(() => null);

    if (!body?.trendyolUrl) {
      return c.json({ error: "trendyolUrl is required" }, 400);
    }

    try {
      const result = await createTrackedProduct(c.env, { ownerKey, trendyolUrl: body.trendyolUrl, shopIds: body.shopIds }, options);
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

  app.post("/products/assign-shop", async (c) => {
    const ownerKey = parseOwnerKey(c.req.param("ownerKey"));
    if (!ownerKey) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    const body = await c.req.json<{ trendyolUrl?: string; shopId?: string }>().catch(() => null);
    if (!body?.trendyolUrl || !body.shopId) {
      return c.json({ error: "trendyolUrl ve shopId gereklidir" }, 400);
    }

    let normalizedUrl: string;
    try {
      normalizedUrl = normalizeTrendyolUrl(body.trendyolUrl);
    } catch {
      return c.json({ error: "trendyolUrl gecersiz" }, 400);
    }

    const shopsRepo = createEtsyShopsRepo(c.env.DB);
    const existing = await c.env.DB
      .prepare(
        `select id, deleted_at as deletedAt
         from products
         where owner_key = ?
           and trendyol_url = ?
         limit 1`,
      )
      .bind(ownerKey, normalizedUrl)
      .first<{ id: string; deletedAt: number | null }>();

    if (existing?.deletedAt != null) {
      return c.json(
        {
          error: "Bu link cop kutusunda. Yeni kayit acmak yerine geri yukleyin.",
          code: "PRODUCT_IN_TRASH",
          trashedProductId: existing.id,
        },
        409,
      );
    }

    const assignToProduct = async (productId: string) => {
      const shops = await shopsRepo.setProductShops(ownerKey, productId, [body.shopId!], new Date());
      if (!shops) {
        return null;
      }

      return c.json({ productId, shops });
    };

    if (existing?.id) {
      const assigned = await assignToProduct(existing.id);
      if (!assigned) {
        return c.json({ error: "Kayit bulunamadi" }, 404);
      }

      return assigned;
    }

    try {
      const created = await createTrackedProduct(c.env, { ownerKey, trendyolUrl: normalizedUrl, shopIds: [body.shopId] }, options);
      const assigned = await assignToProduct(created.product.id);
      if (!assigned) {
        return c.json({ error: "Kayit bulunamadi" }, 404);
      }

      return assigned;
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
        const active = await c.env.DB
          .prepare(
            `select id
             from products
             where owner_key = ?
               and trendyol_url = ?
               and deleted_at is null
             limit 1`,
          )
          .bind(ownerKey, normalizedUrl)
          .first<{ id: string }>();

        if (active?.id) {
          const assigned = await assignToProduct(active.id);
          if (assigned) {
            return assigned;
          }
        }

        return c.json({ error: error.message }, 409);
      }

      if (error instanceof ParseError) {
        return c.json({ error: `Trendyol sayfasi ayrÄ±ÅŸtÄ±rÄ±lamadÄ± (${error.code})` }, 422);
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

  app.patch("/notifications/:notificationId/read", async (c) => {
    const ownerKey = parseOwnerKey(c.req.param("ownerKey"));
    if (!ownerKey) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    const notificationsRepo = createNotificationsRepo(c.env.DB);
    const updated = await notificationsRepo.markNotificationRead(ownerKey, c.req.param("notificationId"), new Date());
    if (!updated) {
      return c.json({ error: "Bildirim bulunamadi" }, 404);
    }

    const notifications = await notificationsRepo.listNotifications(ownerKey);
    return c.json({ ok: true, items: notifications });
  });

  app.delete("/notifications", async (c) => {
    const ownerKey = parseOwnerKey(c.req.param("ownerKey"));
    if (!ownerKey) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    await createNotificationsRepo(c.env.DB).clearNotifications(ownerKey);
    return c.json({ ok: true, items: [] });
  });

  app.route("/products", createProductsRouter());
  app.route("/etsy-shops", createEtsyShopsRouter());
  app.route("/source-products", createSourceProductsRouter());
  app.route("/source-product-categories", createSourceProductCategoriesRouter());
  app.route("/categories", createCategoriesRouter());
  app.route("/", createDraftsRouter());

  return app;
}
