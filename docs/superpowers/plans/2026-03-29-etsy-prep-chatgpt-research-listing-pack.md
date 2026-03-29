# Etsy Prep ChatGPT Research Listing Pack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mevcut listing prompt sistemine browse-first manuel `ChatGPT Research Prompt Pack` ekleyip strict JSON tabanli `systemListingPromptPack` akisini korumak.

**Architecture:** API tarafi `prompt-pack` cevabini iki listing prompt modu dondurecek sekilde genisletir; `generate-listing-pack` sadece system promptu kullanmaya devam eder. Web tarafi `Listing Prompt Pack` kartini iki kopyalama aksiyonuyla gunceller, research promptu kullaniciya browse-first manuel akis olarak sunar ve mevcut otomatik generate akisini bozmadan korur.

**Tech Stack:** TypeScript, Hono, Cloudflare Worker/D1, React, TanStack Query, Vitest, Playwright

---

## File Structure

### Shared contracts and API prompt builders
- Modify: `packages/shared/src/contracts/etsyPromptPack.ts` - iki listing prompt modu icin response contract'ini genisletir.
- Modify: `packages/shared/src/index.ts` - yeni contract export'u zaten varsa type uyumunu korur.
- Create: `apps/api/src/modules/etsyPrep/prompts/buildChatGptResearchPromptPack.ts` - browse-first, sectioned-text research promptunu uretir.
- Modify: `apps/api/src/modules/etsyPrep/prompts/buildListingPromptPack.ts` - system prompt builder olarak rolunu netlestirir.
- Modify: `apps/api/src/modules/etsyPrep/prompts/buildEtsyPromptPackResponse.ts` - `systemListingPromptPack` ve `chatGptResearchPromptPack` alanlarini birlikte dondurur.
- Modify: `apps/api/tests/unit/buildListingPromptPack.test.ts` - system prompt builder kontratini korur.
- Create: `apps/api/tests/unit/buildChatGptResearchPromptPack.test.ts` - browse-first research prompt kontratini test eder.
- Modify: `apps/api/tests/integration/etsyPrep.test.ts` - `prompt-pack` response'unun iki listing modu dondurdugunu dogrular.

### Web prompt-pack UI
- Modify: `apps/web/src/features/etsyPrep/components/ListingPromptPackCard.tsx` - iki kopyalama butonu ve mod aciklamasini ekler.
- Modify: `apps/web/src/features/etsyPrep/components/EtsyPrepWorkspace.tsx` - yeni prompt alanlarini karta gecirir.
- Modify: `apps/web/src/features/etsyPrep/hooks/useEtsyPrepWorkspace.ts` - research/system prompt kopyalama aksiyonlarini ayirir.
- Modify: `apps/web/src/app/api.ts` - yeni contract alanlariyla tip uyumunu korur.
- Modify: `apps/web/src/features/etsyPrep/components/EtsyPrepWorkspace.test.tsx` - iki farkli kopyalama akisina gore beklentileri gunceller.
- Modify: `apps/web/tests/e2e/product-detail-etsy-prep.spec.ts` - yeni manual research prompt butonunu ve mevcut generate akisinin korunmasini dogrular.

## Task 1: Extend prompt-pack contracts and add the ChatGPT research builder

**Files:**
- Modify: `packages/shared/src/contracts/etsyPromptPack.ts`
- Create: `apps/api/src/modules/etsyPrep/prompts/buildChatGptResearchPromptPack.ts`
- Modify: `apps/api/src/modules/etsyPrep/prompts/buildListingPromptPack.ts`
- Modify: `apps/api/src/modules/etsyPrep/prompts/buildEtsyPromptPackResponse.ts`
- Modify: `apps/api/tests/unit/buildListingPromptPack.test.ts`
- Create: `apps/api/tests/unit/buildChatGptResearchPromptPack.test.ts`
- Modify: `apps/api/tests/integration/etsyPrep.test.ts`

- [ ] **Step 1: Failing unit ve integration testlerini yaz**

```ts
// apps/api/tests/unit/buildChatGptResearchPromptPack.test.ts
import { describe, expect, it } from "vitest";

import type { EtsyPrepView } from "../../src/modules/etsyPrep/buildEtsyPrepView";
import { buildChatGptResearchPromptPack } from "../../src/modules/etsyPrep/prompts/buildChatGptResearchPromptPack";

const detail = {
  product: {
    id: "prod_1",
    title: "Cream Crossbody Handbag",
    brand: "EG BAGS",
    category: "Handbag",
    descriptionRaw: "Orta boy krem capraz canta.",
    attributes: [{ key: "Materyal", value: "Suni Deri" }],
    images: ["https://cdn.example.com/bag-1.jpg"],
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

describe("buildChatGptResearchPromptPack", () => {
  it("requires Etsy research and returns a 3-section final output contract", () => {
    const pack = buildChatGptResearchPromptPack(detail);

    expect(pack.outputFormat).toBe("sectioned-text");
    expect(pack.researchMode).toBe("required");
    expect(pack.expectedSections).toEqual(["title", "description", "tags"]);
    expect(pack.prompt).toContain("Browse the Etsy Seller Handbook");
    expect(pack.prompt).toContain("research competing Etsy listings");
    expect(pack.prompt).toContain("Return only the final answer in exactly 3 sections");
    expect(pack.prompt).toContain("1. Title");
    expect(pack.prompt).toContain("2. Description");
    expect(pack.prompt).toContain("3. Tags");
  });
});
```

- [ ] **Step 2: Focused API testlerini calistir ve yeni contract alanlarinin eksik oldugunu dogrula**

Run: `pnpm --filter @trendyol-etsy/api test -- tests/unit/buildListingPromptPack.test.ts tests/unit/buildChatGptResearchPromptPack.test.ts tests/integration/etsyPrep.test.ts`

Expected: FAIL because `prompt-pack` response'u henuz iki listing prompt modu dondurmuyor.

- [ ] **Step 3: Shared contract ve API builder'lari uygula**

```ts
// packages/shared/src/contracts/etsyPromptPack.ts
export interface SystemListingPromptPack {
  prompt: string;
  outputContract: {
    type: "json";
    fields: ["title", "description", "tags"];
  };
}

export interface ChatGptResearchPromptPack {
  prompt: string;
  outputFormat: "sectioned-text";
  researchMode: "required";
  expectedSections: ["title", "description", "tags"];
}

export interface EtsyPromptPackResponse {
  rulebookVersion: string;
  generatedAt: number;
  productSnapshot: EtsyPromptPackProductSnapshot;
  systemListingPromptPack: SystemListingPromptPack;
  chatGptResearchPromptPack: ChatGptResearchPromptPack;
  imagePromptPack: ImagePromptPack;
}

// apps/api/src/modules/etsyPrep/prompts/buildChatGptResearchPromptPack.ts
import type { ChatGptResearchPromptPack } from "@trendyol-etsy/shared";

import type { EtsyPrepView } from "../buildEtsyPrepView";
import { buildProductPromptContext } from "./buildProductPromptContext";

export function buildChatGptResearchPromptPack(detail: EtsyPrepView): ChatGptResearchPromptPack {
  const context = buildProductPromptContext(detail);

  return {
    outputFormat: "sectioned-text",
    researchMode: "required",
    expectedSections: ["title", "description", "tags"],
    prompt: [
      "You are an Etsy SEO strategist and conversion-focused copywriter.",
      "Before writing anything, browse the Etsy Seller Handbook and research competing Etsy listings in the same product group.",
      "Use the research only as internal reasoning. Do not show research notes in the final answer.",
      "Find the strongest buyer-intent keywords, recurring competitor patterns, weak competitor habits, and gaps this product can win on.",
      "Write a high-conversion Etsy listing that stays truthful to the supplied product facts.",
      "The description does not need to be short. It should be clear, persuasive, SEO-aware, and naturally weave the selected tag concepts into the body text.",
      "You may use light emoji only if it improves readability and does not feel spammy.",
      "Do not include origin, warranty, care instructions, shipping promises, marketplace names, or unsupported claims unless explicitly proven by the product facts.",
      "Return only the final answer in exactly 3 sections:",
      "1. Title",
      "2. Description",
      "3. Tags",
      "",
      "PRODUCT FACTS",
      ...context.listingFacts.map((fact) => `- ${fact}`),
    ].join("\\n"),
  };
}

// apps/api/src/modules/etsyPrep/prompts/buildEtsyPromptPackResponse.ts
import { buildChatGptResearchPromptPack } from "./buildChatGptResearchPromptPack";

const systemListingPromptPack = buildListingPromptPack(detail);
const chatGptResearchPromptPack = buildChatGptResearchPromptPack(detail);

return {
  rulebookVersion: etsyMasterRulebook.version,
  generatedAt: Date.now(),
  productSnapshot: { ... },
  systemListingPromptPack,
  chatGptResearchPromptPack,
  imagePromptPack,
};
```

- [ ] **Step 4: Focused API testlerini tekrar calistir**

Run: `pnpm --filter @trendyol-etsy/api test -- tests/unit/buildListingPromptPack.test.ts tests/unit/buildChatGptResearchPromptPack.test.ts tests/integration/etsyPrep.test.ts`

Expected: PASS with both listing prompt modes present and `generate-listing-pack` still tied to the system prompt.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/contracts/etsyPromptPack.ts apps/api/src/modules/etsyPrep/prompts/buildChatGptResearchPromptPack.ts apps/api/src/modules/etsyPrep/prompts/buildListingPromptPack.ts apps/api/src/modules/etsyPrep/prompts/buildEtsyPromptPackResponse.ts apps/api/tests/unit/buildListingPromptPack.test.ts apps/api/tests/unit/buildChatGptResearchPromptPack.test.ts apps/api/tests/integration/etsyPrep.test.ts
git commit -m "feat: add chatgpt research listing prompt pack"
```

## Task 2: Update the Etsy prep UI for dual listing prompt modes

**Files:**
- Modify: `apps/web/src/app/api.ts`
- Modify: `apps/web/src/features/etsyPrep/hooks/useEtsyPrepWorkspace.ts`
- Modify: `apps/web/src/features/etsyPrep/components/ListingPromptPackCard.tsx`
- Modify: `apps/web/src/features/etsyPrep/components/EtsyPrepWorkspace.tsx`
- Modify: `apps/web/src/features/etsyPrep/components/EtsyPrepWorkspace.test.tsx`
- Modify: `apps/web/tests/e2e/product-detail-etsy-prep.spec.ts`

- [ ] **Step 1: Failing web testlerini yeni kopyalama akisina gore yaz**

```tsx
// apps/web/src/features/etsyPrep/components/EtsyPrepWorkspace.test.tsx
await user.click(await screen.findByRole("button", { name: /chatgpt arastirma promptunu kopyala/i }));
expect(clipboardWrite).toHaveBeenNthCalledWith(
  1,
  expect.stringContaining("Before writing anything, browse the Etsy Seller Handbook"),
);

await user.click(screen.getByRole("button", { name: /sistem promptunu kopyala/i }));
expect(clipboardWrite).toHaveBeenNthCalledWith(
  2,
  expect.stringContaining("Return ONLY the JSON object."),
);

expect(screen.getByText(/chatgpt research mode/i)).toBeInTheDocument();
expect(screen.getByText(/system generate mode/i)).toBeInTheDocument();
```

- [ ] **Step 2: Focused web testini calistir ve eski tek buton davranisinin kirdigini dogrula**

Run: `pnpm --filter @trendyol-etsy/web test -- src/features/etsyPrep/components/EtsyPrepWorkspace.test.tsx`

Expected: FAIL because current UI only exposes one listing prompt copy action.

- [ ] **Step 3: Hook ve kart bilesenini iki listing prompt modunu gosterecek sekilde guncelle**

```tsx
// apps/web/src/features/etsyPrep/components/ListingPromptPackCard.tsx
interface ListingPromptPackCardProps {
  researchPrompt: string;
  systemPrompt: string;
  rulebookVersion: string;
  snapshotMeta?: string | null;
  onCopyResearch: () => void;
  onCopySystem: () => void;
  onGenerate: () => void;
  copyMessage?: string | null;
  error?: string | null;
  provider?: string | null;
  isGenerating: boolean;
  generateDisabled: boolean;
}

// header içinde:
// - ChatGPT Research Mode
// - System Generate Mode
// buttons:
// "ChatGPT Arastirma Promptunu Kopyala"
// "Sistem Promptunu Kopyala"
// "AI ile Uret"

// apps/web/src/features/etsyPrep/hooks/useEtsyPrepWorkspace.ts
copyResearchPrompt: () =>
  promptPackQuery.data
    ? copyTextToClipboard(
        promptPackQuery.data.chatGptResearchPromptPack.prompt,
        "ChatGPT arastirma promptu kopyalandi",
      )
    : Promise.resolve(),
copySystemPrompt: () =>
  promptPackQuery.data
    ? copyTextToClipboard(
        promptPackQuery.data.systemListingPromptPack.prompt,
        "Sistem promptu kopyalandi",
      )
    : Promise.resolve(),

// apps/web/src/features/etsyPrep/components/EtsyPrepWorkspace.tsx
<ListingPromptPackCard
  researchPrompt={workspace.promptPack.chatGptResearchPromptPack.prompt}
  systemPrompt={workspace.promptPack.systemListingPromptPack.prompt}
  rulebookVersion={workspace.promptPack.rulebookVersion}
  snapshotMeta={promptPackMeta}
  onCopyResearch={workspace.copyResearchPrompt}
  onCopySystem={workspace.copySystemPrompt}
  onGenerate={workspace.generateListingPack}
  copyMessage={workspace.copyMessage}
  error={workspace.listingPackState.error}
  provider={workspace.listingPackState.provider}
  isGenerating={workspace.listingPackState.isGenerating}
  generateDisabled={!workspace.canGenerateListingPack || workspace.isSaving}
/>
```

- [ ] **Step 4: E2E fixture'larini yeni response shape'ine gore guncelle**

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
      systemListingPromptPack: {
        prompt: "Role\\n...\\nReturn ONLY the JSON object.",
        outputContract: { type: "json", fields: ["title", "description", "tags"] },
      },
      chatGptResearchPromptPack: {
        prompt: "Before writing anything, browse the Etsy Seller Handbook...",
        outputFormat: "sectioned-text",
        researchMode: "required",
        expectedSections: ["title", "description", "tags"],
      },
      imagePromptPack: {
        mainPrompt: "Use the manual reference image as the single source of truth for the product.",
        variations: ["v1", "v2", "v3", "v4", "v5", "v6", "v7"],
        guardrailSummary: ["Do not redesign the product."],
      },
    }),
  });
});
```

- [ ] **Step 5: Focused web testleri ve e2e testini calistir**

Run: `pnpm --filter @trendyol-etsy/web test -- src/features/etsyPrep/components/EtsyPrepWorkspace.test.tsx`

Expected: PASS with separate research/system copy actions and unchanged automatic generation.

Run: `pnpm --filter @trendyol-etsy/web test:e2e -- product-detail-etsy-prep.spec.ts`

Expected: PASS with the new ChatGPT research prompt button visible and save flow still intact.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/api.ts apps/web/src/features/etsyPrep/hooks/useEtsyPrepWorkspace.ts apps/web/src/features/etsyPrep/components/ListingPromptPackCard.tsx apps/web/src/features/etsyPrep/components/EtsyPrepWorkspace.tsx apps/web/src/features/etsyPrep/components/EtsyPrepWorkspace.test.tsx apps/web/tests/e2e/product-detail-etsy-prep.spec.ts
git commit -m "feat: add browse-first chatgpt listing prompt ui"
```
