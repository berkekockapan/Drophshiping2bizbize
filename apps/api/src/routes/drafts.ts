import { Hono } from "hono";
import { ownerKeySchema, type OwnerKey } from "../contracts/owners";

import type { Env } from "../config/bindings";
import { createDraftsRepo, type DraftAttribute } from "../db/repositories/draftsRepo";
import { buildDraftPrompt } from "../modules/ai/buildDraftPrompt";
import { mergeGeneratedDraft } from "../modules/ai/mergeGeneratedDraft";
import { buildProductDetailView } from "../modules/tracking/buildProductDetailView";

interface ManualDraftPatchPayload {
  englishTitle?: string | null;
  shortDescription?: string | null;
  longDescription?: string | null;
  tags?: string[];
  materials?: string[];
  attributes?: DraftAttribute[];
  seoNotes?: string | null;
  policyNotes?: string | null;
}

interface GenerateDraftPayload {
  overwrite?: boolean;
  generated?: {
    englishTitle?: string | null;
    shortDescription?: string | null;
    longDescription?: string | null;
    tags?: string[];
    materials?: string[];
    attributes?: DraftAttribute[];
    seoNotes?: string | null;
    policyNotes?: string | null;
  };
}

function ensureStringArray(input: unknown): string[] {
  return Array.isArray(input) ? input.map((item) => String(item)) : [];
}

function ensureAttributes(input: unknown): DraftAttribute[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .filter((item): item is { key?: unknown; value?: unknown } => Boolean(item) && typeof item === "object")
    .map((item) => ({ key: String(item.key ?? ""), value: String(item.value ?? "") }))
    .filter((item) => item.key.length > 0 && item.value.length > 0);
}

async function productExists(env: Env, ownerKey: OwnerKey, productId: string) {
  const product = await env.DB
    .prepare("select id from products where id = ? and owner_key = ? and deleted_at is null limit 1")
    .bind(productId, ownerKey)
    .first<{ id: string }>();
  return Boolean(product);
}

export function createDraftsRouter() {
  const app = new Hono<{ Bindings: Env }>();

  function parseOwnerKey(value: string | undefined) {
    const parsed = ownerKeySchema.safeParse(value);
    return parsed.success ? parsed.data : null;
  }

  app.get("/products/:productId/draft", async (c) => {
    const ownerKey = parseOwnerKey(c.req.param("ownerKey"));
    if (!ownerKey) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    const productId = c.req.param("productId");

    if (!(await productExists(c.env, ownerKey, productId))) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    const draftsRepo = createDraftsRepo(c.env.DB);
    const draft = await draftsRepo.ensureForProduct(productId);
    const detail = await buildProductDetailView(c.env.DB, ownerKey, productId);
    const prompt = detail
      ? buildDraftPrompt({
          product: {
            id: detail.product.id,
            title: detail.product.title,
            brand: detail.product.brand,
            category: detail.product.category,
            descriptionRaw: detail.product.descriptionRaw,
            attributes: detail.product.attributes ?? [],
          },
          variants: detail.variants.map((variant) => ({
            variantKey: variant.variantKey,
            option1: variant.option1,
            option2: variant.option2,
            option3: variant.option3,
            currentPrice: variant.currentPrice,
            currentStockState: variant.currentStockState,
          })),
        })
      : null;

    return c.json({ draft, prompt });
  });

  app.patch("/products/:productId/draft", async (c) => {
    const ownerKey = parseOwnerKey(c.req.param("ownerKey"));
    if (!ownerKey) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    const productId = c.req.param("productId");

    if (!(await productExists(c.env, ownerKey, productId))) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    const body = await c.req.json<ManualDraftPatchPayload>().catch(() => null);
    if (!body) {
      return c.json({ error: "Invalid JSON payload" }, 400);
    }

    const patchPayload: ManualDraftPatchPayload = {};
    if ("englishTitle" in body) {
      patchPayload.englishTitle = body.englishTitle ?? null;
    }
    if ("shortDescription" in body) {
      patchPayload.shortDescription = body.shortDescription ?? null;
    }
    if ("longDescription" in body) {
      patchPayload.longDescription = body.longDescription ?? null;
    }
    if ("tags" in body) {
      patchPayload.tags = ensureStringArray(body.tags);
    }
    if ("materials" in body) {
      patchPayload.materials = ensureStringArray(body.materials);
    }
    if ("attributes" in body) {
      patchPayload.attributes = ensureAttributes(body.attributes);
    }
    if ("seoNotes" in body) {
      patchPayload.seoNotes = body.seoNotes ?? null;
    }
    if ("policyNotes" in body) {
      patchPayload.policyNotes = body.policyNotes ?? null;
    }

    const draftsRepo = createDraftsRepo(c.env.DB);
    const updated = await draftsRepo.applyManualEdits(productId, {
      ...patchPayload,
    });

    return c.json(updated);
  });

  app.post("/products/:productId/draft/generate", async (c) => {
    const ownerKey = parseOwnerKey(c.req.param("ownerKey"));
    if (!ownerKey) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    const productId = c.req.param("productId");

    if (!(await productExists(c.env, ownerKey, productId))) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    const body = await c.req.json<GenerateDraftPayload>().catch(() => null);
    if (!body?.generated) {
      return c.json({ error: "generated payload is required" }, 400);
    }

    const draftsRepo = createDraftsRepo(c.env.DB);
    const existing = await draftsRepo.ensureForProduct(productId);
    const merged = mergeGeneratedDraft(
      existing,
      {
        englishTitle: body.generated.englishTitle ?? null,
        shortDescription: body.generated.shortDescription ?? null,
        longDescription: body.generated.longDescription ?? null,
        tags: ensureStringArray(body.generated.tags),
        materials: ensureStringArray(body.generated.materials),
        attributes: ensureAttributes(body.generated.attributes),
        seoNotes: body.generated.seoNotes ?? null,
        policyNotes: body.generated.policyNotes ?? null,
      },
      { overwrite: body.overwrite === true },
    );

    const saved = await draftsRepo.saveGenerated(
      productId,
      {
        ...merged,
        overwrite: body.overwrite === true,
      },
      {
        currentGeneratedVersion: existing.generatedVersion,
        generatedAt: Date.now(),
      },
    );

    return c.json(saved);
  });

  return app;
}
