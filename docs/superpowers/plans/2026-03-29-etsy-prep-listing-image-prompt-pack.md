# Etsy Prep Prompt Pack Spec Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mevcut `prompt-pack` implementasyonunu onayli spec ile hizalayip listing ve image promptlarindan ham marketplace copu, URL sizintilari ve gereksiz JSON dump'larini kaldirmak; otomatik AI uretimini daha siki guardrail ve validation ile guvenli hale getirmek.

**Architecture:** API tarafinda `masterRulebook.ts` genisletilir, `buildProductPromptContext.ts` yalnizca sanitize edilmis urun gerceklerini uretecek sekilde yeniden yazilir, listing/image builder'lar bu kisaltilmis baglamdan self-contained prompt pack uretir. Otomatik AI uretimi ayni listing promptunu kullanmaya devam eder ama `parseListingPackResult.ts` ve yeni validator katmani code fence, Turkish leakage, banned token, URL ve unsupported claim kontrolleri ekler; web tarafi mevcut prompt-pack kartlarini koruyup yeni sanitized output ve metadata davranisini regression testlerle kilitler.

**Tech Stack:** TypeScript, Hono, Cloudflare Worker/D1, React, TanStack Query, Vitest, Playwright

---

## Implementation Notes

- Repo zaten `prompt-pack` route'larini, prompt builder dosyalarini ve web kartlarini iceriyor. Bu batch'te yeni `v2` route veya ayri UI olusturma; mevcut dosyalari spec'e hizala.
- `POST /owners/:ownerKey/products/:productId/etsy-prep/prompt-pack` ve `POST /owners/:ownerKey/products/:productId/etsy-prep/generate-listing-pack` sozlesmelerini koru. Ic prompt yapisini degistir ama response shape'i bozma.
- Prompt pack runtime'da uretilmeye devam etmeli. `etsy_drafts` veya baska kalici katmanlara prompt cache yazma.
- `Promptu Kopyala` ve gorsel prompt kopyalama akislari, AI profili yokken veya generate sonucu validation'dan gecmezken bile calismaya devam etmeli.
- Mevcut kodda `buildListingPromptPack.ts` icine `descriptionRaw`, `Images`, `PRODUCT_CONTEXT` ve URL iceren dump'lar siziyor; `buildImagePromptPack.ts` de tam `PRODUCT_CONTEXT` JSON'u gommeye devam ediyor. Plan bu sizintilari temizlemek icindir.
- `parseListingPackResult.ts` bugun yalnizca bos string ve `tags` tipi kontrolu yapiyor. Spec'teki banned token, English-only ve unsupported claim kurallari ayri validator ile eklenmeli.
- Web tarafi genel akista zaten dogru bolumleri render ediyor. Bu batch'in UI kapsamı yeni metadata satiri ve sanitize edilmis prompt preview'larin regression ile korunmasidir.

## File Structure

### API prompt sanitization and assembly
- Create: `apps/api/src/modules/etsyPrep/prompts/promptSanitizers.ts` - marketplace copu, URL, zayif attribute ve claim token temizligi icin saf helper fonksiyonlar.
- Modify: `apps/api/src/modules/etsyPrep/prompts/masterRulebook.ts` - `inputSanitizationRules`, `languageRules`, daha siki listing/image guardrail'leri ve kisa image prompt yapisini tanimlar.
- Modify: `apps/api/src/modules/etsyPrep/prompts/buildProductPromptContext.ts` - ham urun verisinden sadece sanitized listing facts, allowed claim tokens ve image-safe identity brief uretir.
- Modify: `apps/api/src/modules/etsyPrep/prompts/buildListingPromptPack.ts` - `Role`, `Non-Negotiable Rules`, `Language Rules`, `SEO Rules`, `Sanitized Product Facts`, `Output Format` bloklarini spec'e gore kurar.
- Modify: `apps/api/src/modules/etsyPrep/prompts/buildImagePromptPack.ts` - kisa creative brief + 7 varyasyon uretir; `PRODUCT_CONTEXT`, raw URL ve tam JSON dump gommeyi birakir.

### API validation and route safety
- Create: `apps/api/src/modules/etsyPrep/prompts/validateGeneratedListing.ts` - banned token, Turkish leakage, unsupported claim ve title variant-dump kontrolu yapar.
- Modify: `apps/api/src/modules/etsyPrep/prompts/parseListingPackResult.ts` - strict JSON parse, tag normalization ve validator entegrasyonunu yapar.
- Modify: `apps/api/src/modules/etsyPrep/prompts/generateListingPackWithOpenAi.ts` - ayni listing promptunu calistirir, sanitize context ile sonucu validate eder ve gecersiz model cikislarini acik hata olarak yukari tasir.
- Modify: `apps/api/src/routes/products.ts` - invalid generated listing hatalarini `422 INVALID_LISTING_OUTPUT` olarak dondurur; kopyalama route'u yine ayakta kalir.

### API regression coverage
- Create: `apps/api/tests/unit/buildProductPromptContext.test.ts` - sanitize context'in Trendyol CTA, URL ve ilgisiz metadata'yi temizledigini dogrular.
- Modify: `apps/api/tests/unit/buildListingPromptPack.test.ts` - listing promptun `Language Rules` ve `Sanitized Product Facts` icerdigini, `descriptionRaw`/`Images`/`PRODUCT_CONTEXT` sizintisi yapmadigini dogrular.
- Modify: `apps/api/tests/unit/buildImagePromptPack.test.ts` - image promptun kisa kaldigini, `PRODUCT_CONTEXT`/raw URL icermedigini ve 7 varyasyon sozlesmesini korudugunu dogrular.
- Modify: `apps/api/tests/unit/parseListingPackResult.test.ts` - code fence, Turkish, marketplace token ve unsupported claim rejection davranisini kapsar.
- Modify: `apps/api/tests/integration/etsyPrep.test.ts` - sanitized `prompt-pack` cevabini, exact prompt reuse davranisini ve invalid listing output icin `422` response'u kapsar.

### Web regression and light UX polish
- Modify: `apps/web/src/features/etsyPrep/components/EtsyPrepWorkspace.tsx` - `productSnapshot` metadata'sini kartlara gecirir.
- Modify: `apps/web/src/features/etsyPrep/components/ListingPromptPackCard.tsx` - `rulebookVersion` yanina hafif metadata satiri ekler.
- Modify: `apps/web/src/features/etsyPrep/components/ImagePromptPackCard.tsx` - ayni metadata'yi ve referans gorsel odagini aciklayan kisa notu gosterir.
- Modify: `apps/web/src/features/etsyPrep/components/EtsyPrepWorkspace.test.tsx` - metadata, sanitized prompt preview ve image copy aksiyonlarini regression altina alir.
- Modify: `apps/web/tests/e2e/product-detail-etsy-prep.spec.ts` - prompt preview'larin `PRODUCT_CONTEXT` ve URL sizintisi yapmadigini, metadata gorundugunu ve kaydetme akisinin bozulmadigini dogrular.

## Task 1: Rebuild the sanitized product context and prompt builders

**Files:**
- Create: `apps/api/src/modules/etsyPrep/prompts/promptSanitizers.ts`
- Modify: `apps/api/src/modules/etsyPrep/prompts/masterRulebook.ts`
- Modify: `apps/api/src/modules/etsyPrep/prompts/buildProductPromptContext.ts`
- Modify: `apps/api/src/modules/etsyPrep/prompts/buildListingPromptPack.ts`
- Modify: `apps/api/src/modules/etsyPrep/prompts/buildImagePromptPack.ts`
- Create: `apps/api/tests/unit/buildProductPromptContext.test.ts`
- Modify: `apps/api/tests/unit/buildListingPromptPack.test.ts`
- Modify: `apps/api/tests/unit/buildImagePromptPack.test.ts`

- [ ] **Step 1: Sanitize edilmis context ve builder davranisi icin failing unit testleri yaz**

```ts
// apps/api/tests/unit/buildProductPromptContext.test.ts
import { describe, expect, it } from "vitest";

import type { EtsyPrepView } from "../../src/modules/etsyPrep/buildEtsyPrepView";
import { buildProductPromptContext } from "../../src/modules/etsyPrep/prompts/buildProductPromptContext";

const detail = {
  product: {
    id: "prod_1",
    title: "North Apparel Oversize Hoodie",
    brand: "North Apparel",
    category: "Sweatshirt",
    descriptionRaw:
      "Trendyol'a ozel indirimli fiyat. Yumusak dokulu pamuk hoodie. Yorumlarini inceleyin. https://cdn.example.com/hoodie-1.jpg",
    attributes: [
      { key: "Renk", value: "Siyah" },
      { key: "Materyal", value: "Pamuk" },
      { key: "Garanti Suresi", value: "2 yil" },
    ],
    images: ["https://cdn.example.com/hoodie-1.jpg", "https://cdn.example.com/hoodie-2.jpg"],
  },
  variants: [
    {
      id: "var_1",
      variantKey: "siyah-m",
      option1: "Siyah",
      option2: "M",
      option3: null,
      trendyolUrl: null,
      currentStockState: "IN_STOCK",
      currentPrice: 44990,
      lastSeenAt: null,
      rawPayload: null,
    },
    {
      id: "var_2",
      variantKey: "siyah-l",
      option1: "Siyah",
      option2: "L",
      option3: null,
      trendyolUrl: null,
      currentStockState: "IN_STOCK",
      currentPrice: 44990,
      lastSeenAt: null,
      rawPayload: null,
    },
  ],
  draft: {
    id: "draft_1",
    productId: "prod_1",
    englishTitle: "Oversize Cotton Hoodie",
    shortDescription: null,
    longDescription: null,
    tags: ["oversize hoodie", "cotton hoodie"],
    materials: [],
    attributes: [],
    seoNotes: null,
    policyNotes: null,
    generatedVersion: 0,
    editedVersion: 0,
    lastGeneratedAt: null,
    manualEditsPresent: false,
  },
} as unknown as EtsyPrepView;

describe("buildProductPromptContext", () => {
  it("keeps only sanitized listing facts and short image identity data", () => {
    const context = buildProductPromptContext(detail);

    expect(context.listingFacts).toEqual(
      expect.arrayContaining([
        "Source title: North Apparel Oversize Hoodie",
        "Brand: North Apparel",
        "Category: Sweatshirt",
        "Renk: Siyah",
        "Materyal: Pamuk",
        "Available variants: Siyah / M; Siyah / L",
      ]),
    );
    expect(context.imageBrief.referenceImageCount).toBe(2);
    expect(JSON.stringify(context)).not.toMatch(/Trendyol|yorumlarini inceleyin|indirimli fiyat|https?:\\/\\/|cdn\\./i);
    expect(JSON.stringify(context)).not.toMatch(/Garanti Suresi|2 yil/i);
  });
});

// apps/api/tests/unit/buildListingPromptPack.test.ts
expect(pack.prompt).toContain("Language Rules");
expect(pack.prompt).toContain("Sanitized Product Facts");
expect(pack.prompt).not.toMatch(/descriptionRaw|Images|PRODUCT_CONTEXT|https?:\\/\\/|cdn\\./i);
expect(pack.prompt).not.toMatch(/Trendyol|yorumlarini inceleyin|indirimli fiyat/i);

// apps/api/tests/unit/buildImagePromptPack.test.ts
expect(pack.mainPrompt).toContain("single source of truth");
expect(pack.mainPrompt).not.toMatch(/PRODUCT_CONTEXT|attributes|variants|images|existingDraft|https?:\\/\\/|cdn\\./i);
expect(pack.variations).toHaveLength(7);
expect(pack.variations.every((variation) => variation.length < 220)).toBe(true);
```

- [ ] **Step 2: Focused API testlerini calistir ve mevcut implementasyonun ham veri sizdirdigini dogrula**

Run: `pnpm --filter @trendyol-etsy/api test -- tests/unit/buildProductPromptContext.test.ts tests/unit/buildListingPromptPack.test.ts tests/unit/buildImagePromptPack.test.ts`

Expected: FAIL because the current prompt context still carries marketplace noise and the prompt builders still emit `descriptionRaw`, `Images`, `PRODUCT_CONTEXT`, and raw URL traces.

- [ ] **Step 3: Sanitizer helper'larini, genisletilmis rulebook'u ve yeni prompt context'i yaz**

```ts
// apps/api/src/modules/etsyPrep/prompts/promptSanitizers.ts
const MARKETPLACE_NOISE_PATTERNS = [
  /\btrendyol\b/gi,
  /\byorumlarini inceleyin\b/gi,
  /\bindirimli fiyat\b/gi,
  /\bsepete ekle\b/gi,
  /\bkupon\b/gi,
  /\bkargo\b/gi,
  /\btaksit\b/gi,
  /https?:\/\/\S+/gi,
  /\bcdn\.\S+/gi,
] as const;

const USELESS_ATTRIBUTE_KEYS = new Set(["garanti suresi", "mensei", "bakim talimati"]);
const CLAIM_TOKENS = ["handmade", "organic", "premium", "luxury", "gift-ready"] as const;

function collapseWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function sanitizeFactText(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  let next = value;
  for (const pattern of MARKETPLACE_NOISE_PATTERNS) {
    next = next.replace(pattern, " ");
  }

  return collapseWhitespace(next.replace(/[|•]+/g, " "));
}

export function splitSanitizedSentences(value: string | null | undefined) {
  return sanitizeFactText(value)
    .split(/[.!?]+/)
    .map((sentence) => collapseWhitespace(sentence))
    .filter((sentence) => sentence.length >= 12)
    .slice(0, 4);
}

export function isUsefulAttribute(key: string | null | undefined) {
  const normalized = sanitizeFactText(key).toLowerCase();
  return Boolean(normalized) && !USELESS_ATTRIBUTE_KEYS.has(normalized);
}

export function collectAllowedClaimTokens(lines: string[]) {
  const haystack = lines.join(" ").toLowerCase();
  return CLAIM_TOKENS.filter((token) => haystack.includes(token));
}

// apps/api/src/modules/etsyPrep/prompts/masterRulebook.ts
export const etsyMasterRulebook = {
  version: "etsy-prompt-pack-v1",
  inputSanitizationRules: [
    "Strip marketplace CTA, discount, shipping, installment, and coupon copy.",
    "Remove raw URLs, CDN links, and platform traces.",
    "Keep only product facts that affect Etsy listing quality or image staging.",
  ],
  listingRole:
    "You are an Etsy listing strategist, Etsy copywriter, and policy-aware SEO assistant.",
  listingGuardrails: [
    "Only use facts explicitly present in SANITIZED_PRODUCT_FACTS.",
    "Do not invent materials, dimensions, pack count, care instructions, or personalization details.",
    "Do not output marketplace names, campaign copy, shipping promises, or raw URLs.",
    "Do not output markdown, code fences, commentary, or any text outside the JSON contract.",
    "Do not dump variant matrices or boilerplate into the title or description.",
  ],
  languageRules: [
    "Output English only except brand names and immutable technical proper nouns.",
    "Do not leave Turkish words in the title, description, or tags.",
    "Do not mirror local marketplace tone or transliterated campaign language.",
  ],
  listingSeoRules: [
    "Place the strongest descriptive keywords early in the title.",
    "Keep the title readable for humans and avoid keyword dumping.",
    "Use natural keyword phrasing in the opening sentences of the description.",
    "Produce diverse long-tail tags and reduce empty repeats that mirror category or attributes.",
  ],
  imageRole:
    "You write safe marketing and lifestyle prompts for an existing product reference image.",
  imageGuardrails: [
    "Do not redesign the product.",
    "Do not change color, material feel, print, or structural parts.",
    "Do not add new accessories or misleading product variations.",
    "Do not hide important product details outside the frame.",
    "Do not include URLs, prices, warranties, origin text, or raw product JSON dumps.",
  ],
  imagePromptStructure: {
    mainPromptSections: [
      "Treat the manual reference image as the single source of truth for product identity.",
      "Only vary the scene, lighting, camera angle, crop, and styling around the same product.",
      "Keep the brief short, visual, and production-ready.",
    ],
  },
  outputContracts: {
    listing: {
      type: "json",
      fields: ["title", "description", "tags"] as const,
    },
  },
  sourceNotes: [
    {
      id: "keywords-101",
      label: "Etsy Seller Handbook - Keywords 101",
      summary: "Use all 13 tag opportunities with diverse long-tail phrasing.",
    },
    {
      id: "listing-anatomy",
      label: "Etsy Seller Handbook - Anatomy of a Well-Crafted Listing",
      summary: "Keep titles clear and place strong descriptors early.",
    },
    {
      id: "etsy-ai-stance",
      label: "Etsy Seller Handbook - AI stance",
      summary: "Avoid misleading product presentation and keep merchant review in the loop.",
    },
  ],
} as const;

// apps/api/src/modules/etsyPrep/prompts/buildProductPromptContext.ts
import type { EtsyPrepView } from "../buildEtsyPrepView";
import {
  collectAllowedClaimTokens,
  isUsefulAttribute,
  sanitizeFactText,
  splitSanitizedSentences,
} from "./promptSanitizers";

export interface ProductPromptContext {
  sourceTitle: string;
  brand: string | null;
  category: string | null;
  listingFacts: string[];
  allowedClaimTokens: string[];
  imageBrief: {
    referenceImageCount: number;
    productIdentity: string[];
  };
}

function compact(values: Array<string | null | undefined>) {
  return values.filter((value): value is string => Boolean(value && value.trim()));
}

function summarizeVariants(detail: EtsyPrepView) {
  const summary = detail.variants
    .map((variant) =>
      [variant.option1, variant.option2, variant.option3]
        .map((value) => sanitizeFactText(value))
        .filter(Boolean)
        .join(" / "),
    )
    .filter(Boolean)
    .slice(0, 5);

  return summary.length > 0 ? `Available variants: ${summary.join("; ")}` : null;
}

export function buildProductPromptContext(detail: EtsyPrepView): ProductPromptContext {
  const sourceTitle = sanitizeFactText(detail.product.title) || "Untitled product";
  const brand = sanitizeFactText(detail.product.brand) || null;
  const category = sanitizeFactText(detail.product.category) || null;
  const descriptionFacts = splitSanitizedSentences(detail.product.descriptionRaw).map((line) => `Summary: ${line}`);
  const attributeFacts = (detail.product.attributes ?? [])
    .filter((attribute) => isUsefulAttribute(attribute.key))
    .map((attribute) => {
      const key = sanitizeFactText(attribute.key);
      const value = sanitizeFactText(attribute.value);
      return key && value ? `${key}: ${value}` : null;
    })
    .filter((value): value is string => Boolean(value));
  const variantFact = summarizeVariants(detail);
  const existingDraftFact =
    detail.draft.tags.length > 0
      ? `Existing draft tags: ${detail.draft.tags.map((tag) => sanitizeFactText(tag)).filter(Boolean).join(", ")}`
      : null;

  const listingFacts = compact([
    `Source title: ${sourceTitle}`,
    brand ? `Brand: ${brand}` : null,
    category ? `Category: ${category}` : null,
    ...descriptionFacts,
    ...attributeFacts,
    variantFact,
    detail.draft.englishTitle ? `Existing draft title: ${sanitizeFactText(detail.draft.englishTitle)}` : null,
    existingDraftFact,
  ]);

  return {
    sourceTitle,
    brand,
    category,
    listingFacts,
    allowedClaimTokens: collectAllowedClaimTokens(listingFacts),
    imageBrief: {
      referenceImageCount: Array.isArray(detail.product.images) ? detail.product.images.length : 0,
      productIdentity: compact([
        `Product title: ${sourceTitle}`,
        brand ? `Brand: ${brand}` : null,
        ...attributeFacts.slice(0, 4),
        variantFact,
      ]),
    },
  };
}
```

- [ ] **Step 4: Listing ve image builder'lari yalnizca sanitize edilmis baglamdan prompt uretecek sekilde yeniden yaz**

```ts
// apps/api/src/modules/etsyPrep/prompts/buildListingPromptPack.ts
import type { ListingPromptPack } from "@trendyol-etsy/shared";

import type { EtsyPrepView } from "../buildEtsyPrepView";
import { buildProductPromptContext } from "./buildProductPromptContext";
import { etsyMasterRulebook } from "./masterRulebook";

export function buildListingPromptPack(detail: EtsyPrepView): ListingPromptPack {
  const context = buildProductPromptContext(detail);

  return {
    prompt: [
      "Role",
      etsyMasterRulebook.listingRole,
      "",
      "Non-Negotiable Rules",
      ...etsyMasterRulebook.listingGuardrails.map((rule) => `- ${rule}`),
      "",
      "Language Rules",
      ...etsyMasterRulebook.languageRules.map((rule) => `- ${rule}`),
      "",
      "SEO Rules",
      ...etsyMasterRulebook.listingSeoRules.map((rule) => `- ${rule}`),
      "",
      "Sanitized Product Facts",
      ...context.listingFacts.map((fact) => `- ${fact}`),
      "",
      "Output Format",
      JSON.stringify(
        {
          title: "...",
          description: "...",
          tags: "tag1, tag2, tag3",
        },
        null,
        2,
      ),
      "Return ONLY the JSON object.",
    ].join("\n"),
    outputContract: etsyMasterRulebook.outputContracts.listing,
  };
}

// apps/api/src/modules/etsyPrep/prompts/buildImagePromptPack.ts
import type { ImagePromptPack } from "@trendyol-etsy/shared";

import type { EtsyPrepView } from "../buildEtsyPrepView";
import { buildProductPromptContext } from "./buildProductPromptContext";
import { etsyMasterRulebook } from "./masterRulebook";

const sceneVariations = [
  "Bright studio tabletop scene with a clean front angle and minimal props.",
  "Soft morning window light with a slight top-down camera angle.",
  "Neutral lifestyle shelf setup with shallow depth and tidy styling.",
  "Warm gift-table composition with centered framing and soft shadows.",
  "Editorial catalog shot with crisp side angle and muted backdrop.",
  "Minimal fabric backdrop with close three-quarter framing.",
  "Airy home desk setting with natural light and restrained accessories.",
];

export function buildImagePromptPack(detail: EtsyPrepView): ImagePromptPack {
  const context = buildProductPromptContext(detail);

  return {
    mainPrompt: [
      "Use the manual reference image as the single source of truth for the product.",
      etsyMasterRulebook.imageRole,
      "",
      "Product Identity",
      ...context.imageBrief.productIdentity.map((fact) => `- ${fact}`),
      "",
      "Guardrails",
      ...etsyMasterRulebook.imageGuardrails.map((rule) => `- ${rule}`),
      "",
      "Creative Direction",
      ...etsyMasterRulebook.imagePromptStructure.mainPromptSections.map((rule) => `- ${rule}`),
    ].join("\n"),
    variations: sceneVariations.map(
      (variation) =>
        `Same exact product from the reference image. ${variation} Keep product form, color, material feel, print, and structural parts unchanged.`,
    ),
    guardrailSummary: [...etsyMasterRulebook.imageGuardrails],
  };
}
```

- [ ] **Step 5: Focused API testlerini tekrar calistir ve sanitize edilmis builder'lari kilitle**

Run: `pnpm --filter @trendyol-etsy/api test -- tests/unit/buildProductPromptContext.test.ts tests/unit/buildListingPromptPack.test.ts tests/unit/buildImagePromptPack.test.ts`

Expected: PASS with listing prompt containing `Language Rules` and `Sanitized Product Facts`, and image prompt containing no `PRODUCT_CONTEXT`, raw URL, or marketplace noise.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/etsyPrep/prompts/promptSanitizers.ts apps/api/src/modules/etsyPrep/prompts/masterRulebook.ts apps/api/src/modules/etsyPrep/prompts/buildProductPromptContext.ts apps/api/src/modules/etsyPrep/prompts/buildListingPromptPack.ts apps/api/src/modules/etsyPrep/prompts/buildImagePromptPack.ts apps/api/tests/unit/buildProductPromptContext.test.ts apps/api/tests/unit/buildListingPromptPack.test.ts apps/api/tests/unit/buildImagePromptPack.test.ts
git commit -m "feat: sanitize etsy prompt pack builders"
```

## Task 2: Harden generated listing validation and API error handling

**Files:**
- Create: `apps/api/src/modules/etsyPrep/prompts/validateGeneratedListing.ts`
- Modify: `apps/api/src/modules/etsyPrep/prompts/parseListingPackResult.ts`
- Modify: `apps/api/src/modules/etsyPrep/prompts/generateListingPackWithOpenAi.ts`
- Modify: `apps/api/src/routes/products.ts`
- Modify: `apps/api/tests/unit/parseListingPackResult.test.ts`
- Modify: `apps/api/tests/integration/etsyPrep.test.ts`

- [ ] **Step 1: Parser ve guardrail davranisi icin failing unit testleri yaz**

```ts
// apps/api/tests/unit/parseListingPackResult.test.ts
import { describe, expect, it } from "vitest";

import type { EtsyPrepView } from "../../src/modules/etsyPrep/buildEtsyPrepView";
import { buildProductPromptContext } from "../../src/modules/etsyPrep/prompts/buildProductPromptContext";
import { parseListingPackResult } from "../../src/modules/etsyPrep/prompts/parseListingPackResult";

const detail = {
  product: {
    id: "prod_1",
    title: "Oversize Hoodie",
    brand: "North Apparel",
    category: "Sweatshirt",
    descriptionRaw: "Soft cotton hoodie for daily wear.",
    attributes: [{ key: "Materyal", value: "Pamuk" }],
    images: ["https://cdn.example.com/hoodie-1.jpg"],
  },
  variants: [],
  draft: {
    id: "draft_1",
    productId: "prod_1",
    englishTitle: null,
    shortDescription: null,
    longDescription: null,
    tags: [],
    materials: [],
    attributes: [],
    seoNotes: null,
    policyNotes: null,
    generatedVersion: 0,
    editedVersion: 0,
    lastGeneratedAt: null,
    manualEditsPresent: false,
  },
} as unknown as EtsyPrepView;

const context = buildProductPromptContext(detail);

describe("parseListingPackResult", () => {
  it("normalizes tags and rejects fenced, marketplace, Turkish, or unsupported-claim output", () => {
    expect(
      parseListingPackResult(
        JSON.stringify({
          title: "Soft Cotton Hoodie",
          description: "Soft cotton hoodie for everyday wear.",
          tags: "hoodie, streetwear gift, hoodie",
        }),
        context,
      ),
    ).toEqual({
      title: "Soft Cotton Hoodie",
      description: "Soft cotton hoodie for everyday wear.",
      tags: "hoodie, streetwear gift",
    });

    expect(() =>
      parseListingPackResult(
        "```json\n{\"title\":\"Soft Cotton Hoodie\",\"description\":\"Soft cotton hoodie\",\"tags\":\"hoodie\"}\n```",
        context,
      ),
    ).toThrow(/markdown/i);

    expect(() =>
      parseListingPackResult(
        JSON.stringify({
          title: "Premium Hoodie",
          description: "Indirimli fiyat icin Trendyol linkine bakin",
          tags: "hoodie, gift",
        }),
        context,
      ),
    ).toThrow(/banned|english|claim/i);
  });
});
```

- [ ] **Step 2: Focused parser testini calistir ve mevcut kontrol seviyesinin yetersiz kaldigini dogrula**

Run: `pnpm --filter @trendyol-etsy/api test -- tests/unit/parseListingPackResult.test.ts`

Expected: FAIL because the current parser accepts fenced output, Turkish leakage, marketplace tokens, and unsupported marketing claims.

- [ ] **Step 3: Validation helper'ini ve strict parser entegrasyonunu uygula**

```ts
// apps/api/src/modules/etsyPrep/prompts/validateGeneratedListing.ts
import type { GeneratedListingPackResult } from "@trendyol-etsy/shared";

import type { ProductPromptContext } from "./buildProductPromptContext";

const BANNED_OUTPUT_PATTERNS = [
  /\btrendyol\b/i,
  /yorumlarini inceleyin/i,
  /indirimli fiyat/i,
  /https?:\/\//i,
  /\bcdn\./i,
] as const;

const TURKISH_HINT_PATTERN = /\b(ve|icin|kadin|erkek|yumusak|renk|beden|hediye)\b|[ığüşöçİ]/i;
const CLAIM_TOKENS = ["handmade", "organic", "premium", "luxury", "gift-ready"] as const;

export class InvalidGeneratedListingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidGeneratedListingError";
  }
}

function assertNoBannedTokens(value: string) {
  if (BANNED_OUTPUT_PATTERNS.some((pattern) => pattern.test(value))) {
    throw new InvalidGeneratedListingError("Generated listing contains banned marketplace or URL tokens.");
  }
}

function assertMostlyEnglish(value: string) {
  if (TURKISH_HINT_PATTERN.test(value)) {
    throw new InvalidGeneratedListingError("Generated listing must be predominantly English.");
  }
}

function assertNoUnsupportedClaims(value: string, context: ProductPromptContext) {
  const haystack = value.toLowerCase();
  const allowed = new Set(context.allowedClaimTokens.map((token) => token.toLowerCase()));

  for (const token of CLAIM_TOKENS) {
    if (haystack.includes(token) && !allowed.has(token)) {
      throw new InvalidGeneratedListingError(`Generated listing uses unsupported claim token: ${token}`);
    }
  }
}

function assertTitleIsNotVariantDump(title: string) {
  if ((title.match(/[|,/;-]/g) ?? []).length >= 5) {
    throw new InvalidGeneratedListingError("Generated title looks like a variant matrix dump.");
  }
}

export function validateGeneratedListing(result: GeneratedListingPackResult, context: ProductPromptContext) {
  const combined = `${result.title}\n${result.description}\n${result.tags}`;
  assertNoBannedTokens(combined);
  assertMostlyEnglish(combined);
  assertNoUnsupportedClaims(combined, context);
  assertTitleIsNotVariantDump(result.title);
}

// apps/api/src/modules/etsyPrep/prompts/parseListingPackResult.ts
import type { GeneratedListingPackResult } from "@trendyol-etsy/shared";

import type { ProductPromptContext } from "./buildProductPromptContext";
import { InvalidGeneratedListingError, validateGeneratedListing } from "./validateGeneratedListing";

function normalizeTagsString(value: string) {
  return [...new Set(value.split(",").map((item) => item.trim()).filter(Boolean))].join(", ");
}

export function parseListingPackResult(
  rawText: string,
  context: ProductPromptContext,
): GeneratedListingPackResult {
  if (/```/.test(rawText)) {
    throw new InvalidGeneratedListingError("Generated listing must not include markdown code fences.");
  }

  const parsed = JSON.parse(rawText) as Record<string, unknown>;
  if (typeof parsed.title !== "string" || !parsed.title.trim()) {
    throw new InvalidGeneratedListingError("title must be a non-empty string");
  }
  if (typeof parsed.description !== "string" || !parsed.description.trim()) {
    throw new InvalidGeneratedListingError("description must be a non-empty string");
  }
  if (typeof parsed.tags !== "string") {
    throw new InvalidGeneratedListingError("tags must be a comma-separated string");
  }

  const result = {
    title: parsed.title.trim(),
    description: parsed.description.trim(),
    tags: normalizeTagsString(parsed.tags),
  };

  if (!result.tags) {
    throw new InvalidGeneratedListingError("tags string must contain at least one tag");
  }

  validateGeneratedListing(result, context);
  return result;
}
```

- [ ] **Step 4: `prompt-pack` sanitizationini ve `422 INVALID_LISTING_OUTPUT` davranisini kapsayan failing integration testlerini yaz**

```ts
// apps/api/tests/integration/etsyPrep.test.ts
it("returns sanitized prompt packs without raw urls or JSON dumps", async () => {
  const response = await app.request(
    `http://localhost/owners/berke/products/${seeded.product.id}/etsy-prep/prompt-pack`,
    { method: "POST" },
    env,
  );

  expect(response.status).toBe(200);
  const payload = await response.json();
  expect(payload.listingPromptPack.prompt).toContain("Sanitized Product Facts");
  expect(payload.listingPromptPack.prompt).not.toMatch(/descriptionRaw|Images|PRODUCT_CONTEXT|https?:\\/\\/|cdn\\./i);
  expect(payload.imagePromptPack.mainPrompt).not.toMatch(/PRODUCT_CONTEXT|attributes|variants|images|existingDraft|https?:\\/\\/|cdn\\./i);
});

it("returns 422 when OpenAI output leaks marketplace copy or unsupported claims", async () => {
  vi.spyOn(openAiOAuthModule, "resolveActiveOpenAiCredential").mockResolvedValue({
    profile: {
      id: "profile_main",
      label: "OpenAI Workspace",
      emailMasked: "wo***@company.com",
      provider: "openai-oauth",
      isActive: true,
      status: "connected",
      lastSeenAt: null,
      lastValidatedAt: null,
      lastError: null,
      connectorStatusSnapshot: null,
      updatedAt: Date.now(),
    },
    accessToken: "token_test",
    apiKey: null,
    selectedWorkspaceProjectId: null,
  });

  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                title: "Premium Hoodie",
                description: "Indirimli fiyat icin Trendyol linkine bakin",
                tags: "hoodie, gift",
              }),
            },
          },
        ],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    ),
  );

  const promptResponse = await app.request(
    `http://localhost/owners/berke/products/${seeded.product.id}/etsy-prep/prompt-pack`,
    { method: "POST" },
    env,
  );
  expect(promptResponse.status).toBe(200);

  const generateResponse = await app.request(
    `http://localhost/owners/berke/products/${seeded.product.id}/etsy-prep/generate-listing-pack`,
    { method: "POST" },
    env,
  );

  expect(generateResponse.status).toBe(422);
  expect(await generateResponse.json()).toEqual(
    expect.objectContaining({
      error: expect.objectContaining({
        code: "INVALID_LISTING_OUTPUT",
      }),
    }),
  );
});
```

- [ ] **Step 5: Generate akisini sanitize context ile bagla ve route'ta acik hata cevabi dondur**

```ts
// apps/api/src/modules/etsyPrep/prompts/generateListingPackWithOpenAi.ts
import type { GenerateListingPackResponse } from "@trendyol-etsy/shared";

import type { D1Database, Env } from "../../config/bindings";
import { OpenAiAuthError, resolveActiveOpenAiCredential } from "../../ai/openAiOAuth";
import type { EtsyPrepView } from "../buildEtsyPrepView";
import { buildProductPromptContext } from "./buildProductPromptContext";
import { buildEtsyPromptPackResponse } from "./buildEtsyPromptPackResponse";
import { parseListingPackResult } from "./parseListingPackResult";

export async function generateListingPackWithOpenAi(
  db: D1Database,
  env: Env,
  detail: EtsyPrepView,
): Promise<GenerateListingPackResponse> {
  const promptPack = buildEtsyPromptPackResponse(detail);
  const validationContext = buildProductPromptContext(detail);
  const credential = await resolveActiveOpenAiCredential(db, env);

  const response = await fetch(`${readApiBaseUrl(env)}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: readModel(env),
      messages: [{ role: "user", content: promptPack.listingPromptPack.prompt }],
      response_format: { type: "json_object" },
      temperature: 0.2,
    }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new OpenAiAuthError(
      response.status === 401 || response.status === 403 ? "PROFILE_NEEDS_REAUTH" : "GENERATION_FAILED",
      "OpenAI listing prompt istegi basarisiz oldu.",
      response.status === 401 || response.status === 403 ? 409 : 502,
    );
  }

  const rawText = extractOutputText(payload);
  if (!rawText) {
    throw new OpenAiAuthError("GENERATION_FAILED", "OpenAI yaniti metin icermiyor.", 502);
  }

  return {
    provider: "openai-oauth",
    rulebookVersion: promptPack.rulebookVersion,
    result: parseListingPackResult(rawText, validationContext),
  };
}

// apps/api/src/routes/products.ts
import { InvalidGeneratedListingError } from "../modules/etsyPrep/prompts/validateGeneratedListing";

app.post("/:productId/etsy-prep/generate-listing-pack", async (c) => {
  const ownerKey = parseOwnerKey(c.req.param("ownerKey"));
  if (!ownerKey) {
    return c.json({ error: "Kayit bulunamadi" }, 404);
  }

  const detail = await loadEtsyPrepDetail(ownerKey, c.req.param("productId"), c.env);
  if (!detail) {
    return c.json({ error: "Kayit bulunamadi" }, 404);
  }

  try {
    return c.json(await generateListingPackWithOpenAi(c.env.DB, c.env, detail));
  } catch (error) {
    if (error instanceof OpenAiAuthError) {
      return c.json(
        toOpenAiErrorResponse(error),
        error.statusCode as 400 | 401 | 403 | 404 | 409 | 422 | 500 | 502 | 503,
      );
    }

    if (error instanceof InvalidGeneratedListingError) {
      return c.json(
        {
          error: {
            code: "INVALID_LISTING_OUTPUT",
            message: error.message,
          },
        },
        422,
      );
    }

    throw error;
  }
});
```

- [ ] **Step 6: Unit + integration testlerini calistir**

Run: `pnpm --filter @trendyol-etsy/api test -- tests/unit/parseListingPackResult.test.ts tests/integration/etsyPrep.test.ts`

Expected: PASS with sanitized `prompt-pack` output, exact prompt reuse for automatic generation, and invalid model output returning `422 INVALID_LISTING_OUTPUT`.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/etsyPrep/prompts/validateGeneratedListing.ts apps/api/src/modules/etsyPrep/prompts/parseListingPackResult.ts apps/api/src/modules/etsyPrep/prompts/generateListingPackWithOpenAi.ts apps/api/src/routes/products.ts apps/api/tests/unit/parseListingPackResult.test.ts apps/api/tests/integration/etsyPrep.test.ts
git commit -m "feat: validate generated etsy listings"
```

## Task 3: Surface lightweight prompt-pack metadata in the web UI and lock regressions

**Files:**
- Modify: `apps/web/src/features/etsyPrep/components/EtsyPrepWorkspace.tsx`
- Modify: `apps/web/src/features/etsyPrep/components/ListingPromptPackCard.tsx`
- Modify: `apps/web/src/features/etsyPrep/components/ImagePromptPackCard.tsx`
- Modify: `apps/web/src/features/etsyPrep/components/EtsyPrepWorkspace.test.tsx`
- Modify: `apps/web/tests/e2e/product-detail-etsy-prep.spec.ts`

- [ ] **Step 1: Metadata ve sanitized prompt preview davranisi icin failing web testlerini yaz**

```tsx
// apps/web/src/features/etsyPrep/components/EtsyPrepWorkspace.test.tsx
await expect(screen.findByText(/2 ozellik .* 1 varyant .* 1 referans gorsel/i)).resolves.toBeInTheDocument();

await user.click(screen.getByRole("button", { name: /ana promptu kopyala/i }));
expect(clipboardWrite).toHaveBeenNthCalledWith(
  2,
  "Use the manual reference image as the single source of truth for the product.",
);

await user.click(screen.getByRole("button", { name: /7 varyasyonu kopyala/i }));
expect(clipboardWrite).toHaveBeenNthCalledWith(
  3,
  [
    "1. Bright studio tabletop scene with a clean front angle and minimal props.",
    "2. Soft morning window light with a slight top-down camera angle.",
    "3. Neutral lifestyle shelf setup with shallow depth and tidy styling.",
    "4. Warm gift-table composition with centered framing and soft shadows.",
    "5. Editorial catalog shot with crisp side angle and muted backdrop.",
    "6. Minimal fabric backdrop with close three-quarter framing.",
    "7. Airy home desk setting with natural light and restrained accessories.",
  ].join("\n"),
);

expect(screen.getByText(/use the manual reference image as the single source of truth/i)).toBeInTheDocument();
expect(screen.queryByText(/PRODUCT_CONTEXT|https:\/\/cdn\.example\.com/i)).not.toBeInTheDocument();

// apps/web/tests/e2e/product-detail-etsy-prep.spec.ts
await expect(page.getByText(/2 ozellik .* 1 varyant .* 1 referans gorsel/i)).toBeVisible();
await expect(page.getByText("PRODUCT_CONTEXT")).toHaveCount(0);
await expect(page.getByText("https://cdn.example.com/hoodie-1.jpg")).toHaveCount(0);
```

- [ ] **Step 2: Focused web unit testini calistir ve metadata satirinin henuz gorunmedigini dogrula**

Run: `pnpm --filter @trendyol-etsy/web test -- src/features/etsyPrep/components/EtsyPrepWorkspace.test.tsx`

Expected: FAIL because the current cards do not render `productSnapshot` metadata even though the API response already carries it.

- [ ] **Step 3: `productSnapshot` metadata'sini kartlara tasiyan hafif UI guncellemesini yap**

```tsx
// apps/web/src/features/etsyPrep/components/EtsyPrepWorkspace.tsx
function formatPromptPackMeta(
  snapshot:
    | {
        attributeCount: number;
        variantCount: number;
        imageCount: number;
      }
    | null
    | undefined,
) {
  if (!snapshot) {
    return null;
  }

  return `${snapshot.attributeCount} ozellik • ${snapshot.variantCount} varyant • ${snapshot.imageCount} referans gorsel`;
}

export function EtsyPrepWorkspace({ ownerKey, productId, onBack }: EtsyPrepWorkspaceProps) {
  const workspace = useEtsyPrepWorkspace(ownerKey, productId);
  const promptPackMeta = formatPromptPackMeta(workspace.promptPack?.productSnapshot);

  // ...
  <ListingPromptPackCard
    prompt={workspace.promptPack.listingPromptPack.prompt}
    rulebookVersion={workspace.promptPack.rulebookVersion}
    snapshotMeta={promptPackMeta}
    onCopy={workspace.copyListingPrompt}
    onGenerate={workspace.generateListingPack}
    copyMessage={workspace.copyMessage}
    error={workspace.listingPackState.error}
    provider={workspace.listingPackState.provider}
    isGenerating={workspace.listingPackState.isGenerating}
    generateDisabled={!workspace.canGenerateListingPack || workspace.isSaving}
  />
  <ImagePromptPackCard
    mainPrompt={workspace.promptPack.imagePromptPack.mainPrompt}
    variations={workspace.promptPack.imagePromptPack.variations}
    guardrailSummary={workspace.promptPack.imagePromptPack.guardrailSummary}
    snapshotMeta={promptPackMeta}
    onCopyMain={workspace.copyImageMainPrompt}
    onCopyVariations={workspace.copyImageVariations}
  />
}

// apps/web/src/features/etsyPrep/components/ListingPromptPackCard.tsx
interface ListingPromptPackCardProps {
  prompt: string;
  rulebookVersion: string;
  snapshotMeta?: string | null;
  onCopy: () => void;
  onGenerate: () => void;
  copyMessage?: string | null;
  error?: string | null;
  provider?: string | null;
  isGenerating: boolean;
  generateDisabled: boolean;
}

export function ListingPromptPackCard({
  prompt,
  rulebookVersion,
  snapshotMeta,
  onCopy,
  onGenerate,
  copyMessage,
  error,
  provider,
  isGenerating,
  generateDisabled,
}: ListingPromptPackCardProps) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      {/* header */}
      <p className="mt-2 text-xs text-slate-500">
        Rulebook: {rulebookVersion}
        {snapshotMeta ? ` • ${snapshotMeta}` : ""}
      </p>
      {/* existing buttons + prompt preview */}
    </section>
  );
}

// apps/web/src/features/etsyPrep/components/ImagePromptPackCard.tsx
interface ImagePromptPackCardProps {
  mainPrompt: string;
  variations: string[];
  guardrailSummary: string[];
  snapshotMeta?: string | null;
  onCopyMain: () => void;
  onCopyVariations: () => void;
}

export function ImagePromptPackCard({
  mainPrompt,
  variations,
  guardrailSummary,
  snapshotMeta,
  onCopyMain,
  onCopyVariations,
}: ImagePromptPackCardProps) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      {/* header */}
      {snapshotMeta ? <p className="mt-2 text-xs text-slate-500">{snapshotMeta}</p> : null}
      <p className="mt-1 text-sm text-slate-600">
        Referans gorseli manuel yukleyip bu promptu tercih ettiginiz gorsel aracinda kullanin.
      </p>
      {/* existing guardrails + preview + variations */}
    </section>
  );
}
```

- [ ] **Step 4: Playwright fixture'larini sanitized promptlarla guncelle ve e2e beklentilerini ekle**

```ts
// apps/web/tests/e2e/product-detail-etsy-prep.spec.ts
await page.route("**/products/prod_1/etsy-prep/prompt-pack", async (route) => {
  await route.fulfill({
    status: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      rulebookVersion: "etsy-prompt-pack-v1",
      generatedAt: Date.parse("2026-03-29T09:00:00.000Z"),
      productSnapshot: {
        productId: "prod_1",
        title: "Oversize Hoodie",
        brand: "North Apparel",
        category: "Sweatshirt",
        attributeCount: 2,
        variantCount: 1,
        imageCount: 1,
      },
      listingPromptPack: {
        prompt: [
          "Role",
          "You are an Etsy listing strategist, Etsy copywriter, and policy-aware SEO assistant.",
          "",
          "Language Rules",
          "- Output English only except brand names and immutable technical proper nouns.",
          "",
          "Sanitized Product Facts",
          "- Source title: Oversize Hoodie",
          "- Brand: North Apparel",
          "- Materyal: Pamuk",
          "- Renk: Siyah",
          "",
          "Return ONLY the JSON object.",
        ].join("\\n"),
        outputContract: { type: "json", fields: ["title", "description", "tags"] },
      },
      imagePromptPack: {
        mainPrompt: "Use the manual reference image as the single source of truth for the product.",
        variations: [
          "Bright studio tabletop scene with a clean front angle and minimal props.",
          "Soft morning window light with a slight top-down camera angle.",
          "Neutral lifestyle shelf setup with shallow depth and tidy styling.",
          "Warm gift-table composition with centered framing and soft shadows.",
          "Editorial catalog shot with crisp side angle and muted backdrop.",
          "Minimal fabric backdrop with close three-quarter framing.",
          "Airy home desk setting with natural light and restrained accessories.",
        ],
        guardrailSummary: ["Do not redesign the product."],
      },
    }),
  });
});

await expect(page.getByText(/2 ozellik .* 1 varyant .* 1 referans gorsel/i)).toBeVisible();
await expect(page.getByText("PRODUCT_CONTEXT")).toHaveCount(0);
await expect(page.getByText("https://cdn.example.com/hoodie-1.jpg")).toHaveCount(0);
```

- [ ] **Step 5: Web unit ve e2e testlerini calistir**

Run: `pnpm --filter @trendyol-etsy/web test -- src/features/etsyPrep/components/EtsyPrepWorkspace.test.tsx`

Expected: PASS with metadata visible on both prompt-pack cards and image copy actions still working.

Run: `pnpm --filter @trendyol-etsy/web test:e2e -- product-detail-etsy-prep.spec.ts`

Expected: PASS with sanitized prompt previews, visible metadata, one-click listing generation, and unchanged save flow.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/etsyPrep/components/EtsyPrepWorkspace.tsx apps/web/src/features/etsyPrep/components/ListingPromptPackCard.tsx apps/web/src/features/etsyPrep/components/ImagePromptPackCard.tsx apps/web/src/features/etsyPrep/components/EtsyPrepWorkspace.test.tsx apps/web/tests/e2e/product-detail-etsy-prep.spec.ts
git commit -m "test: lock etsy prompt pack regressions"
```
