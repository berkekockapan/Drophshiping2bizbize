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
import { buildSourceProductsListView } from "../modules/sourceProducts/buildSourceProductsListView";
import { createSourceProduct, DuplicateSourceProductError } from "../modules/sourceProducts/createSourceProduct";
import { deleteSourceProductEtsyLink } from "../modules/sourceProducts/deleteSourceProductEtsyLink";
import { updateSourceProduct } from "../modules/sourceProducts/updateSourceProduct";

function parseOwnerKey(value: string | undefined) {
  const parsed = ownerKeySchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function createSourceProductsRouter() {
  const app = new Hono<{ Bindings: Env }>();

  app.get("/", async (c) => {
    const ownerKey = parseOwnerKey(c.req.param("ownerKey"));
    if (!ownerKey) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    return c.json(await buildSourceProductsListView(c.env.DB, ownerKey, c.req.query("search") ?? null));
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

  app.get("/:sourceProductId", async (c) => {
    const ownerKey = parseOwnerKey(c.req.param("ownerKey"));
    if (!ownerKey) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    const detail = await buildSourceProductDetailView(c.env.DB, ownerKey, c.req.param("sourceProductId"));
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
