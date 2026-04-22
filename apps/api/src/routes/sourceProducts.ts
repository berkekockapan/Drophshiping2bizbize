import {
  createSourceProductEtsyLinkRequestSchema,
  createSourceProductRequestSchema,
  patchSourceProductRequestSchema,
} from "../../../../packages/shared/src/contracts/sourceProducts";
import { Hono } from "hono";

import type { Env } from "../config/bindings";
import { ownerKeySchema } from "../contracts/owners";
import {
  addSourceProductEtsyLink,
  DuplicateSourceProductEtsyLinkError,
} from "../modules/sourceProducts/addSourceProductEtsyLink";
import { buildSourceProductDetailView } from "../modules/sourceProducts/buildSourceProductDetailView";
import { buildSourceProductLegacyDetailView } from "../modules/sourceProducts/buildSourceProductLegacyDetailView";
import {
  buildSourceProductsListView,
  buildSourceProductsTrashView,
} from "../modules/sourceProducts/buildSourceProductsListView";
import { createSourceProduct, DuplicateSourceProductError } from "../modules/sourceProducts/createSourceProduct";
import { deleteSourceProduct } from "../modules/sourceProducts/deleteSourceProduct";
import { deleteSourceProductEtsyLink } from "../modules/sourceProducts/deleteSourceProductEtsyLink";
import { permanentlyDeleteSourceProduct } from "../modules/sourceProducts/permanentlyDeleteSourceProduct";
import { reorderSourceProducts } from "../modules/sourceProducts/reorderSourceProducts";
import { restoreSourceProduct } from "../modules/sourceProducts/restoreSourceProduct";
import { setSourceProductCategory } from "../modules/sourceProducts/setSourceProductCategory";
import { setSourceProductShops } from "../modules/sourceProducts/setSourceProductShops";
import { setSourceProductUserCategory } from "../modules/sourceProducts/setSourceProductUserCategory";
import { updateSourceProduct } from "../modules/sourceProducts/updateSourceProduct";

function parseOwnerKey(value: string | undefined) {
  const parsed = ownerKeySchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function parseCategoryId(value: string | null | undefined) {
  if (value == null || value === "" || value === "uncategorized") {
    return null;
  }

  return value;
}

function parseCategoryFilter(value: string | null | undefined) {
  if (value === "") {
    return null;
  }

  return value ?? null;
}

export function createSourceProductsRouter() {
  const app = new Hono<{ Bindings: Env }>();

  app.get("/", async (c) => {
    const ownerKey = parseOwnerKey(c.req.param("ownerKey"));
    if (!ownerKey) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    return c.json(
      await buildSourceProductsListView(c.env.DB, ownerKey, {
        search: c.req.query("search"),
        categoryId: parseCategoryFilter(c.req.query("categoryId")),
      }),
    );
  });

  app.post("/", async (c) => {
    const ownerKey = parseOwnerKey(c.req.param("ownerKey"));
    if (!ownerKey) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    const body = await c.req.json().catch(() => null);
    const parsed = createSourceProductRequestSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "sourceTitle, sourceUrl ve sourcePlatform gereklidir" }, 400);
    }

    try {
      return c.json(await createSourceProduct(c.env.DB, ownerKey, parsed.data), 201);
    } catch (error) {
      if (error instanceof DuplicateSourceProductError) {
        return c.json({ error: "Bu kaynak link zaten kayitli.", code: "SOURCE_PRODUCT_DUPLICATE" }, 409);
      }

      throw error;
    }
  });

  app.get("/trash", async (c) => {
    const ownerKey = parseOwnerKey(c.req.param("ownerKey"));
    if (!ownerKey) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    return c.json(await buildSourceProductsTrashView(c.env.DB, ownerKey));
  });

  app.patch("/reorder", async (c) => {
    const ownerKey = parseOwnerKey(c.req.param("ownerKey"));
    if (!ownerKey) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    const body = await c.req.json<{ categoryId?: string | null; orderedIds?: string[] }>().catch(() => null);
    if (!body || !Array.isArray(body.orderedIds)) {
      return c.json({ error: "orderedIds is required" }, 400);
    }

    const result = await reorderSourceProducts(c.env.DB, ownerKey, parseCategoryId(body.categoryId), body.orderedIds);
    return result ? c.json(result) : c.json({ error: "Siralama kaydedilemedi" }, 409);
  });

  app.get("/:sourceProductId/view", async (c) => {
    const ownerKey = parseOwnerKey(c.req.param("ownerKey"));
    if (!ownerKey) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    const detail = await buildSourceProductDetailView(c.env.DB, ownerKey, c.req.param("sourceProductId"));
    return detail ? c.json(detail) : c.json({ error: "Kayit bulunamadi" }, 404);
  });

  app.patch("/:sourceProductId/category", async (c) => {
    const ownerKey = parseOwnerKey(c.req.param("ownerKey"));
    if (!ownerKey) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    const body = await c.req.json<{ categoryId?: string | null }>().catch(() => null);
    if (!body || !("categoryId" in body)) {
      return c.json({ error: "categoryId is required" }, 400);
    }

    const result = await setSourceProductCategory(
      c.env.DB,
      ownerKey,
      c.req.param("sourceProductId"),
      parseCategoryId(body.categoryId),
    );

    return result ? c.json(result) : c.json({ error: "Kayit bulunamadi" }, 404);
  });

  app.patch("/:sourceProductId/product-category", async (c) => {
    const ownerKey = parseOwnerKey(c.req.param("ownerKey"));
    if (!ownerKey) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    const body = await c.req.json<{ categoryId?: string | null }>().catch(() => null);
    if (!body || !("categoryId" in body)) {
      return c.json({ error: "categoryId is required" }, 400);
    }

    const result = await setSourceProductUserCategory(
      c.env.DB,
      ownerKey,
      c.req.param("sourceProductId"),
      parseCategoryId(body.categoryId),
    );
    return result ? c.json(result) : c.json({ error: "Kayit bulunamadi" }, 404);
  });

  app.put("/:sourceProductId/etsy-shops", async (c) => {
    const ownerKey = parseOwnerKey(c.req.param("ownerKey"));
    if (!ownerKey) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    const body = await c.req.json<{ shopIds?: string[] }>().catch(() => null);
    if (!body || !Array.isArray(body.shopIds)) {
      return c.json({ error: "shopIds is required" }, 400);
    }

    const result = await setSourceProductShops(c.env.DB, ownerKey, c.req.param("sourceProductId"), body.shopIds);
    return result ? c.json(result) : c.json({ error: "Kayit bulunamadi" }, 404);
  });

  app.delete("/:sourceProductId", async (c) => {
    const ownerKey = parseOwnerKey(c.req.param("ownerKey"));
    if (!ownerKey) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    const deleted = await deleteSourceProduct(c.env.DB, ownerKey, c.req.param("sourceProductId"));
    return deleted ? c.body(null, 204) : c.json({ error: "Kayit bulunamadi" }, 404);
  });

  app.post("/:sourceProductId/restore", async (c) => {
    const ownerKey = parseOwnerKey(c.req.param("ownerKey"));
    if (!ownerKey) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    const restored = await restoreSourceProduct(c.env.DB, ownerKey, c.req.param("sourceProductId"));
    return restored ? c.json({ ok: true }) : c.json({ error: "Kayit bulunamadi" }, 404);
  });

  app.delete("/:sourceProductId/permanent", async (c) => {
    const ownerKey = parseOwnerKey(c.req.param("ownerKey"));
    if (!ownerKey) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    const deleted = await permanentlyDeleteSourceProduct(c.env.DB, ownerKey, c.req.param("sourceProductId"));
    return deleted ? c.body(null, 204) : c.json({ error: "Kayit bulunamadi" }, 404);
  });

  app.get("/:sourceProductId", async (c) => {
    const ownerKey = parseOwnerKey(c.req.param("ownerKey"));
    if (!ownerKey) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    const detail = await buildSourceProductLegacyDetailView(c.env.DB, ownerKey, c.req.param("sourceProductId"));
    if (!detail) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    return c.json(detail);
  });

  app.patch("/:sourceProductId", async (c) => {
    const ownerKey = parseOwnerKey(c.req.param("ownerKey"));
    if (!ownerKey) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    const body = await c.req.json().catch(() => null);
    const parsed = patchSourceProductRequestSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "Guncelleme payload'i gecersiz" }, 400);
    }

    try {
      const detail = await updateSourceProduct(c.env.DB, ownerKey, c.req.param("sourceProductId"), parsed.data);
      if (!detail) {
        return c.json({ error: "Kayit bulunamadi" }, 404);
      }

      return c.json(detail);
    } catch (error) {
      if (error instanceof DuplicateSourceProductError) {
        return c.json({ error: "Bu kaynak link zaten kayitli.", code: "SOURCE_PRODUCT_DUPLICATE" }, 409);
      }

      throw error;
    }
  });

  app.post("/:sourceProductId/etsy-links", async (c) => {
    const ownerKey = parseOwnerKey(c.req.param("ownerKey"));
    if (!ownerKey) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    const body = await c.req.json().catch(() => null);
    const parsed = createSourceProductEtsyLinkRequestSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "etsyUrl gereklidir" }, 400);
    }

    try {
      const detail = await addSourceProductEtsyLink(
        c.env.DB,
        ownerKey,
        c.req.param("sourceProductId"),
        parsed.data.etsyUrl,
      );

      if (!detail) {
        return c.json({ error: "Kayit bulunamadi" }, 404);
      }

      return c.json(detail, 201);
    } catch (error) {
      if (error instanceof DuplicateSourceProductEtsyLinkError) {
        return c.json({ error: "Bu Etsy link zaten baska bir kaynak urune bagli.", code: "ETSY_LINK_DUPLICATE" }, 409);
      }

      throw error;
    }
  });

  app.delete("/:sourceProductId/etsy-links/:etsyLinkId", async (c) => {
    const ownerKey = parseOwnerKey(c.req.param("ownerKey"));
    if (!ownerKey) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    const deleted = await deleteSourceProductEtsyLink(
      c.env.DB,
      ownerKey,
      c.req.param("sourceProductId"),
      c.req.param("etsyLinkId"),
    );
    if (!deleted) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    return c.body(null, 204);
  });

  return app;
}
