import { Hono } from "hono";

import type { Env } from "../config/bindings";
import { ownerKeySchema, type OwnerKey } from "../contracts/owners";
import { createPromptLibraryRepo, ensurePromptLibrarySchema } from "../db/repositories/promptLibraryRepo";

interface PagePayload {
  title?: unknown;
  description?: unknown;
}

interface CardPayload {
  title?: unknown;
  promptMarkdown?: unknown;
  imageR2Key?: unknown;
  imageContentType?: unknown;
}

interface DeletePayload {
  confirm?: unknown;
}

function parseOwnerKey(value: string | undefined): OwnerKey | null {
  const parsed = ownerKeySchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalString(value: unknown) {
  if (typeof value === "undefined") return undefined;
  if (value === null) return null;
  return typeof value === "string" ? value : false;
}

function requireConfirmedDelete(body: unknown) {
  return isRecord(body) && (body as DeletePayload).confirm === true;
}

function extensionFromContentType(contentType: string) {
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  if (contentType === "image/gif") return "gif";
  if (contentType === "image/jpeg" || contentType === "image/jpg") return "jpg";
  return "bin";
}

function imageUrl(ownerKey: OwnerKey, imageKey: string) {
  return `/owners/${ownerKey}/prompt-library/images/${encodeURIComponent(imageKey)}`;
}

function withImageUrls<T extends { cards: Array<{ imageR2Key: string | null }> }>(ownerKey: OwnerKey, page: T) {
  return {
    ...page,
    cards: page.cards.map((card) => ({
      ...card,
      imageUrl: card.imageR2Key ? imageUrl(ownerKey, card.imageR2Key) : null,
    })),
  };
}

export function createPromptLibraryRouter() {
  const app = new Hono<{ Bindings: Env }>();

  app.use("*", async (c, next) => {
    if (!c.req.path.includes("/images/") && !c.req.path.endsWith("/uploads")) {
      await ensurePromptLibrarySchema(c.env.DB);
    }

    await next();
  });

  app.get("/", async (c) => {
    const ownerKey = parseOwnerKey(c.req.param("ownerKey"));
    if (!ownerKey) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    const view = await createPromptLibraryRepo(c.env.DB).list(ownerKey);
    return c.json({ pages: view.pages.map((page) => withImageUrls(ownerKey, page)) });
  });

  app.post("/pages", async (c) => {
    const ownerKey = parseOwnerKey(c.req.param("ownerKey"));
    if (!ownerKey) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    const body = await c.req.json<PagePayload>().catch(() => null);
    if (!isRecord(body) || typeof body.title !== "string") {
      return c.json({ error: "title zorunludur" }, 400);
    }

    const description = optionalString(body.description);
    if (description === false) {
      return c.json({ error: "description string veya null olmalidir" }, 400);
    }

    try {
      const page = await createPromptLibraryRepo(c.env.DB).createPage(ownerKey, {
        title: body.title,
        description: description ?? null,
      });
      return c.json({ page: page ? withImageUrls(ownerKey, page) : null }, 201);
    } catch (error) {
      return c.json({ error: error instanceof Error ? error.message : "Sayfa olusturulamadi" }, 400);
    }
  });

  app.patch("/pages/:pageId", async (c) => {
    const ownerKey = parseOwnerKey(c.req.param("ownerKey"));
    if (!ownerKey) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    const body = await c.req.json<PagePayload>().catch(() => null);
    if (!isRecord(body)) {
      return c.json({ error: "Gecersiz payload" }, 400);
    }

    if (typeof body.title !== "undefined" && typeof body.title !== "string") {
      return c.json({ error: "title string olmalidir" }, 400);
    }

    const description = optionalString(body.description);
    if (description === false) {
      return c.json({ error: "description string veya null olmalidir" }, 400);
    }

    try {
      const page = await createPromptLibraryRepo(c.env.DB).updatePage(ownerKey, c.req.param("pageId"), {
        title: typeof body.title === "string" ? body.title : undefined,
        description: typeof description === "undefined" ? undefined : description,
      });
      if (!page) {
        return c.json({ error: "Sayfa bulunamadi" }, 404);
      }
      return c.json({ page: withImageUrls(ownerKey, page) });
    } catch (error) {
      return c.json({ error: error instanceof Error ? error.message : "Sayfa guncellenemedi" }, 400);
    }
  });

  app.delete("/pages/:pageId", async (c) => {
    const ownerKey = parseOwnerKey(c.req.param("ownerKey"));
    if (!ownerKey) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    const body = await c.req.json<DeletePayload>().catch(() => null);
    if (!requireConfirmedDelete(body)) {
      return c.json({ error: "Silme islemi icin confirm=true gereklidir" }, 400);
    }

    const deleted = await createPromptLibraryRepo(c.env.DB).deletePage(ownerKey, c.req.param("pageId"));
    if (!deleted) {
      return c.json({ error: "Sayfa bulunamadi" }, 404);
    }

    return c.json({ ok: true });
  });

  app.post("/pages/:pageId/cards", async (c) => {
    const ownerKey = parseOwnerKey(c.req.param("ownerKey"));
    if (!ownerKey) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    const body = await c.req.json<CardPayload>().catch(() => null);
    if (!isRecord(body) || typeof body.title !== "string") {
      return c.json({ error: "title zorunludur" }, 400);
    }

    if (typeof body.promptMarkdown !== "undefined" && typeof body.promptMarkdown !== "string") {
      return c.json({ error: "promptMarkdown string olmalidir" }, 400);
    }

    const imageR2Key = optionalString(body.imageR2Key);
    const imageContentType = optionalString(body.imageContentType);
    if (imageR2Key === false || imageContentType === false) {
      return c.json({ error: "Gorsel alani string veya null olmalidir" }, 400);
    }

    try {
      const card = await createPromptLibraryRepo(c.env.DB).createCard(ownerKey, c.req.param("pageId"), {
        title: body.title,
        promptMarkdown: typeof body.promptMarkdown === "string" ? body.promptMarkdown : "",
        imageR2Key: imageR2Key ?? null,
        imageContentType: imageContentType ?? null,
      });
      if (!card) {
        return c.json({ error: "Sayfa bulunamadi" }, 404);
      }
      return c.json({ card: { ...card, imageUrl: card.imageR2Key ? imageUrl(ownerKey, card.imageR2Key) : null } }, 201);
    } catch (error) {
      return c.json({ error: error instanceof Error ? error.message : "Kart olusturulamadi" }, 400);
    }
  });

  app.patch("/cards/:cardId", async (c) => {
    const ownerKey = parseOwnerKey(c.req.param("ownerKey"));
    if (!ownerKey) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    const body = await c.req.json<CardPayload>().catch(() => null);
    if (!isRecord(body)) {
      return c.json({ error: "Gecersiz payload" }, 400);
    }

    if (typeof body.title !== "undefined" && typeof body.title !== "string") {
      return c.json({ error: "title string olmalidir" }, 400);
    }

    if (typeof body.promptMarkdown !== "undefined" && typeof body.promptMarkdown !== "string") {
      return c.json({ error: "promptMarkdown string olmalidir" }, 400);
    }

    const imageR2Key = optionalString(body.imageR2Key);
    const imageContentType = optionalString(body.imageContentType);
    if (imageR2Key === false || imageContentType === false) {
      return c.json({ error: "Gorsel alani string veya null olmalidir" }, 400);
    }

    try {
      const card = await createPromptLibraryRepo(c.env.DB).updateCard(ownerKey, c.req.param("cardId"), {
        title: typeof body.title === "string" ? body.title : undefined,
        promptMarkdown: typeof body.promptMarkdown === "string" ? body.promptMarkdown : undefined,
        imageR2Key: typeof imageR2Key === "undefined" ? undefined : imageR2Key,
        imageContentType: typeof imageContentType === "undefined" ? undefined : imageContentType,
      });
      if (!card) {
        return c.json({ error: "Kart bulunamadi" }, 404);
      }
      return c.json({ card: { ...card, imageUrl: card.imageR2Key ? imageUrl(ownerKey, card.imageR2Key) : null } });
    } catch (error) {
      return c.json({ error: error instanceof Error ? error.message : "Kart guncellenemedi" }, 400);
    }
  });

  app.delete("/cards/:cardId", async (c) => {
    const ownerKey = parseOwnerKey(c.req.param("ownerKey"));
    if (!ownerKey) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    const body = await c.req.json<DeletePayload>().catch(() => null);
    if (!requireConfirmedDelete(body)) {
      return c.json({ error: "Silme islemi icin confirm=true gereklidir" }, 400);
    }

    const deleted = await createPromptLibraryRepo(c.env.DB).deleteCard(ownerKey, c.req.param("cardId"));
    if (!deleted) {
      return c.json({ error: "Kart bulunamadi" }, 404);
    }

    return c.json({ ok: true });
  });

  app.post("/uploads", async (c) => {
    const ownerKey = parseOwnerKey(c.req.param("ownerKey"));
    if (!ownerKey) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    if (!c.env.PROMPT_IMAGES) {
      return c.json({ error: "PROMPT_IMAGES R2 binding hazir degil" }, 503);
    }

    const body = await c.req.parseBody().catch(() => null);
    const file = body?.image;
    if (!(file instanceof File)) {
      return c.json({ error: "image dosyasi zorunludur" }, 400);
    }

    if (!file.type.startsWith("image/")) {
      return c.json({ error: "Sadece gorsel dosyalari yuklenebilir" }, 400);
    }

    if (file.size > 10 * 1024 * 1024) {
      return c.json({ error: "Gorsel boyutu 10 MB altinda olmalidir" }, 413);
    }

    const imageKey = `prompt_${ownerKey}_${crypto.randomUUID()}.${extensionFromContentType(file.type)}`;
    await c.env.PROMPT_IMAGES.put(imageKey, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type },
    });

    return c.json({ imageKey, imageR2Key: imageKey, imageContentType: file.type, imageUrl: imageUrl(ownerKey, imageKey) }, 201);
  });

  app.get("/images/:imageKey", async (c) => {
    const ownerKey = parseOwnerKey(c.req.param("ownerKey"));
    if (!ownerKey) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    if (!c.env.PROMPT_IMAGES) {
      return c.json({ error: "PROMPT_IMAGES R2 binding hazir degil" }, 503);
    }

    const imageKey = c.req.param("imageKey");
    if (!imageKey.startsWith(`prompt_${ownerKey}_`)) {
      return c.json({ error: "Gorsel bulunamadi" }, 404);
    }

    const object = await c.env.PROMPT_IMAGES.get(imageKey);
    if (!object) {
      return c.json({ error: "Gorsel bulunamadi" }, 404);
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("cache-control", "private, max-age=3600");
    if (object.httpEtag) {
      headers.set("etag", object.httpEtag);
    }

    return new Response(object.body, { headers });
  });

  return app;
}
