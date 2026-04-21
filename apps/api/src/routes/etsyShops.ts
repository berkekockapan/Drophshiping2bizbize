import { Hono } from "hono";
import { ownerKeySchema, type OwnerKey } from "../contracts/owners";

import type { Env } from "../config/bindings";
import { createEtsyShopsRepo } from "../db/repositories/etsyShopsRepo";
import { buildTrackingListView } from "../modules/tracking/buildTrackingListView";
import { DuplicateProductError, createTrackedProduct } from "../modules/tracking/createTrackedProduct";
import { ParseError } from "../modules/scraping/parseErrors";

function parseOwnerKey(value: string | undefined) {
  const parsed = ownerKeySchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function normalizeShopPayload(body: { name?: string; etsyShopUrl?: string; description?: string | null } | null) {
  if (!body) {
    return null;
  }

  const name = body.name?.trim();
  const etsyShopUrl = body.etsyShopUrl?.trim();
  const description = typeof body.description === "string" ? body.description.trim() : null;

  if (!name || !etsyShopUrl) {
    return null;
  }

  return {
    name,
    etsyShopUrl,
    description: description && description.length > 0 ? description : null,
  };
}

export function createEtsyShopsRouter() {
  const app = new Hono<{ Bindings: Env }>();

  app.get("/", async (c) => {
    const ownerKey = parseOwnerKey(c.req.param("ownerKey"));
    if (!ownerKey) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    const items = await createEtsyShopsRepo(c.env.DB).listShops(ownerKey);
    return c.json({ items });
  });

  app.post("/", async (c) => {
    const ownerKey = parseOwnerKey(c.req.param("ownerKey"));
    if (!ownerKey) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    const payload = normalizeShopPayload(await c.req.json().catch(() => null));
    if (!payload) {
      return c.json({ error: "name ve etsyShopUrl gereklidir" }, 400);
    }

    try {
      const shop = await createEtsyShopsRepo(c.env.DB).createShop(ownerKey, payload, new Date());
      return c.json({ shop }, 201);
    } catch (error) {
      if (error instanceof Error && /unique/i.test(error.message)) {
        return c.json({ error: "Ayni isimde bir Etsy magazasi zaten var." }, 409);
      }

      throw error;
    }
  });

  app.get("/:shopId", async (c) => {
    const ownerKey = parseOwnerKey(c.req.param("ownerKey"));
    if (!ownerKey) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    const repo = createEtsyShopsRepo(c.env.DB);
    const shop = await repo.getShop(ownerKey, c.req.param("shopId"));
    if (!shop) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    const products = await buildTrackingListView(c.env.DB, ownerKey, { shopId: shop.id });
    return c.json({ shop, products });
  });

  app.post("/:shopId/products", async (c) => {
    const ownerKey = parseOwnerKey(c.req.param("ownerKey"));
    if (!ownerKey) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    const shopId = c.req.param("shopId");
    const shop = await createEtsyShopsRepo(c.env.DB).getShop(ownerKey, shopId);
    if (!shop) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    const body = await c.req.json<{ trendyolUrl?: string }>().catch(() => null);
    if (!body?.trendyolUrl) {
      return c.json({ error: "trendyolUrl is required" }, 400);
    }

    try {
      const result = await createTrackedProduct(c.env, { ownerKey, trendyolUrl: body.trendyolUrl, shopIds: [shopId] });
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

  return app;
}
