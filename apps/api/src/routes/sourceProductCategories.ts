import { Hono } from "hono";

import type { Env } from "../config/bindings";
import { ownerKeySchema } from "../contracts/owners";
import {
  createSourceProductCategory,
  deleteSourceProductCategory,
  DuplicateSourceProductCategoryNameError,
  InvalidSourceProductCategoryNameError,
  listSourceProductCategories,
  renameSourceProductCategory,
} from "../modules/sourceProducts/sourceProductCategories";

function parseOwnerKey(value: string | undefined) {
  const parsed = ownerKeySchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function createSourceProductCategoriesRouter() {
  const app = new Hono<{ Bindings: Env }>();

  app.get("/", async (c) => {
    const ownerKey = parseOwnerKey(c.req.param("ownerKey"));
    if (!ownerKey) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    return c.json({
      items: (await listSourceProductCategories(c.env.DB, ownerKey)).map(({ id, name }) => ({ id, name })),
    });
  });

  app.post("/", async (c) => {
    const ownerKey = parseOwnerKey(c.req.param("ownerKey"));
    if (!ownerKey) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    const body = await c.req.json<{ name?: string }>().catch(() => null);
    if (typeof body?.name !== "string") {
      return c.json({ error: "name is required" }, 400);
    }

    try {
      const result = await createSourceProductCategory(c.env.DB, ownerKey, body.name);
      return c.json({ category: { id: result.category.id, name: result.category.name } }, 201);
    } catch (error) {
      if (error instanceof InvalidSourceProductCategoryNameError) {
        return c.json({ error: error.message }, 400);
      }

      if (error instanceof DuplicateSourceProductCategoryNameError) {
        return c.json({ error: error.message }, 409);
      }

      throw error;
    }
  });

  app.patch("/:categoryId", async (c) => {
    const ownerKey = parseOwnerKey(c.req.param("ownerKey"));
    if (!ownerKey) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    const body = await c.req.json<{ name?: string }>().catch(() => null);
    if (typeof body?.name !== "string") {
      return c.json({ error: "name is required" }, 400);
    }

    try {
      const category = await renameSourceProductCategory(c.env.DB, ownerKey, c.req.param("categoryId"), body.name);
      if (!category) {
        return c.json({ error: "Kayit bulunamadi" }, 404);
      }

      return c.json({ category: { id: category.category.id, name: category.category.name } });
    } catch (error) {
      if (error instanceof InvalidSourceProductCategoryNameError) {
        return c.json({ error: error.message }, 400);
      }

      if (error instanceof DuplicateSourceProductCategoryNameError) {
        return c.json({ error: error.message }, 409);
      }

      throw error;
    }
  });

  app.delete("/:categoryId", async (c) => {
    const ownerKey = parseOwnerKey(c.req.param("ownerKey"));
    if (!ownerKey) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    const deleted = await deleteSourceProductCategory(c.env.DB, ownerKey, c.req.param("categoryId"));
    return deleted ? c.body(null, 204) : c.json({ error: "Kayit bulunamadi" }, 404);
  });

  return app;
}
