import { Hono } from "hono";
import { ownerKeySchema, type OwnerKey } from "../contracts/owners";

import type { Env } from "../config/bindings";
import { buildEtsyPrepAnalysis } from "../modules/etsyPrep/buildEtsyPrepAnalysis";
import { buildEtsyPrepFieldPackageStream } from "../modules/etsyPrep/buildEtsyPrepFieldPackage";
import { buildEtsyPrepView } from "../modules/etsyPrep/buildEtsyPrepView";
import {
  InvalidEtsyPrepDraftPayloadError,
  saveEtsyPrepDraft,
} from "../modules/etsyPrep/saveEtsyPrepDraft";
import { buildTariffRecommendations } from "../modules/tariff/analysis/buildTariffRecommendations";
import { createTariffKnowledgeCandidate } from "../modules/tariff/knowledge/createTariffKnowledgeCandidate";
import { searchTariffCatalog } from "../modules/tariff/search/searchTariffCatalog";
import { saveProductTariffSelection } from "../modules/tariff/selection/saveProductTariffSelection";
import { downloadProductImageAsJpg } from "../modules/tracking/downloadProductImageAsJpg";
import { buildProductDetailView } from "../modules/tracking/buildProductDetailView";

export function createProductsRouter() {
  const app = new Hono<{ Bindings: Env }>();

  function parseOwnerKey(value: string | undefined) {
    const parsed = ownerKeySchema.safeParse(value);
    return parsed.success ? parsed.data : null;
  }

  async function loadEtsyPrepDetail(ownerKey: OwnerKey, productId: string, env: Env) {
    const detail = await buildEtsyPrepView(env.DB, ownerKey, productId);
    if (!detail) {
      return null;
    }

    return detail;
  }

  app.get("/:productId/etsy-prep", async (c) => {
    const ownerKey = parseOwnerKey(c.req.param("ownerKey"));
    if (!ownerKey) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    const view = await buildEtsyPrepView(c.env.DB, ownerKey, c.req.param("productId"));
    if (!view) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    return c.json(view);
  });

  app.put("/:productId/etsy-prep/save", async (c) => {
    const ownerKey = parseOwnerKey(c.req.param("ownerKey"));
    if (!ownerKey) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    const body = await c.req.json().catch(() => undefined);
    if (body === undefined || body === null || typeof body !== "object") {
      return c.json({ error: "Invalid JSON payload" }, 400);
    }

    try {
      const saved = await saveEtsyPrepDraft(c.env.DB, ownerKey, c.req.param("productId"), body, Date.now());

      if (!saved) {
        return c.json({ error: "Kayit bulunamadi" }, 404);
      }

      return c.json(saved);
    } catch (error) {
      if (error instanceof InvalidEtsyPrepDraftPayloadError) {
        return c.json({ error: "Invalid JSON payload" }, 400);
      }

      throw error;
    }
  });

  app.post("/:productId/etsy-prep/analyze", async (c) => {
    const ownerKey = parseOwnerKey(c.req.param("ownerKey"));
    if (!ownerKey) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    const detail = await loadEtsyPrepDetail(ownerKey, c.req.param("productId"), c.env);
    if (!detail) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    return buildEtsyPrepAnalysis(detail, { fetchImpl: fetch });
  });

  app.post("/:productId/etsy-prep/generate-title", async (c) => {
    const ownerKey = parseOwnerKey(c.req.param("ownerKey"));
    if (!ownerKey) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    const detail = await loadEtsyPrepDetail(ownerKey, c.req.param("productId"), c.env);
    if (!detail) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    return buildEtsyPrepFieldPackageStream("title", detail, { fetchImpl: fetch });
  });

  app.post("/:productId/etsy-prep/generate-description", async (c) => {
    const ownerKey = parseOwnerKey(c.req.param("ownerKey"));
    if (!ownerKey) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    const detail = await loadEtsyPrepDetail(ownerKey, c.req.param("productId"), c.env);
    if (!detail) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    return buildEtsyPrepFieldPackageStream("description", detail, { fetchImpl: fetch });
  });

  app.post("/:productId/etsy-prep/generate-tags", async (c) => {
    const ownerKey = parseOwnerKey(c.req.param("ownerKey"));
    if (!ownerKey) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    const detail = await loadEtsyPrepDetail(ownerKey, c.req.param("productId"), c.env);
    if (!detail) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    return buildEtsyPrepFieldPackageStream("tags", detail, { fetchImpl: fetch });
  });

  app.get("/:productId/images/download", async (c) => {
    const ownerKey = parseOwnerKey(c.req.param("ownerKey"));
    if (!ownerKey) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    const url = c.req.query("url");
    if (!url) {
      return c.json({ error: "url is required" }, 400);
    }

    const result = await downloadProductImageAsJpg(c.env.DB, ownerKey, c.req.param("productId"), url);

    if (result.kind === "ok") {
      return result.response;
    }

    if (result.kind === "not-found") {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    if (result.kind === "invalid-image") {
      return c.json({ error: "Image does not belong to product" }, 400);
    }

    return c.json({ error: "Image download failed" }, 502);
  });

  app.get("/:productId", async (c) => {
    const ownerKey = parseOwnerKey(c.req.param("ownerKey"));
    if (!ownerKey) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    const detail = await buildProductDetailView(c.env.DB, ownerKey, c.req.param("productId"));
    if (!detail) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    return c.json(detail);
  });

  app.get("/:productId/tariff-analysis", async (c) => {
    const ownerKey = parseOwnerKey(c.req.param("ownerKey"));
    if (!ownerKey) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    const detail = await buildProductDetailView(c.env.DB, ownerKey, c.req.param("productId"));
    if (!detail) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    return c.json(
      detail.tariffAnalysis ?? {
        selection: null,
        latestRun: null,
        recommendations: [],
        manualSearchEnabled: true,
        disclaimer: "Planlama amacli tahmindir.",
      },
    );
  });

  app.post("/:productId/tariff-analysis/run", async (c) => {
    const ownerKey = parseOwnerKey(c.req.param("ownerKey"));
    if (!ownerKey) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    const detail = await buildProductDetailView(c.env.DB, ownerKey, c.req.param("productId"));
    if (!detail) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    return c.json(
      await buildTariffRecommendations(c.env.DB, {
        ownerKey,
        productId: c.req.param("productId"),
        title: detail.product.title,
        descriptionRaw: detail.product.descriptionRaw,
        category: detail.product.category,
        attributes: detail.product.attributes ?? [],
        images: detail.product.images ?? [],
        aiContext: null,
      }),
    );
  });

  app.put("/:productId/tariff-selection", async (c) => {
    const ownerKey = parseOwnerKey(c.req.param("ownerKey"));
    if (!ownerKey) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    const body = await c.req
      .json<{ catalogId?: string; usProfileId?: string | null; selectionSource?: string; analysisRunId?: string | null }>()
      .catch(() => null);
    if (!body?.catalogId || !body.selectionSource) {
      return c.json({ error: "catalogId ve selectionSource gereklidir" }, 400);
    }

    try {
      const selection = await saveProductTariffSelection(c.env.DB, {
        ownerKey,
        productId: c.req.param("productId"),
        catalogId: body.catalogId,
        usProfileId: body.usProfileId ?? null,
        selectionSource: body.selectionSource,
        analysisRunId: body.analysisRunId ?? null,
      });

      if (!selection) {
        return c.json({ error: "Kayit bulunamadi" }, 404);
      }

      return c.json({ selection });
    } catch (error) {
      return c.json({ error: error instanceof Error ? error.message : "Secim kaydedilemedi" }, 400);
    }
  });

  app.get("/:productId/tariff-search", async (c) => {
    const ownerKey = parseOwnerKey(c.req.param("ownerKey"));
    if (!ownerKey) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    const detail = await buildProductDetailView(c.env.DB, ownerKey, c.req.param("productId"));
    if (!detail) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    const query = c.req.query("q") ?? "";
    return c.json({ items: await searchTariffCatalog(c.env.DB, query) });
  });

  app.post("/:productId/tariff-knowledge-candidates", async (c) => {
    const ownerKey = parseOwnerKey(c.req.param("ownerKey"));
    if (!ownerKey) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    const body = await c.req
      .json<{ catalogId?: string; usProfileId?: string | null; candidateSource?: string; notes?: string | null }>()
      .catch(() => null);
    if (!body?.catalogId || !body.candidateSource) {
      return c.json({ error: "catalogId ve candidateSource gereklidir" }, 400);
    }

    try {
      const candidate = await createTariffKnowledgeCandidate(c.env.DB, {
        ownerKey,
        productId: c.req.param("productId"),
        catalogId: body.catalogId,
        usProfileId: body.usProfileId ?? null,
        candidateSource: body.candidateSource,
        notes: body.notes ?? null,
      });

      if (!candidate) {
        return c.json({ error: "Kayit bulunamadi" }, 404);
      }

      return c.json({ candidateId: candidate.id, status: candidate.status }, 201);
    } catch (error) {
      return c.json({ error: error instanceof Error ? error.message : "Aday olusturulamadi" }, 400);
    }
  });

  return app;
}
