import type { Page } from "playwright";

import type { GenerateRequest, GenerateResponse } from "../providers/base";

export async function runPrompt(page: Page, request: GenerateRequest): Promise<GenerateResponse> {
  await page.waitForTimeout(50);

  const title = request.sourceTitle.trim() || "Handmade Product";

  return {
    englishTitle: `${title} | Etsy SEO Optimized`,
    shortDescription: `${title} için optimize edilmiþ kýsa açýklama`,
    longDescription:
      "Bu içerik chatgpt-web saðlayýcýsý üzerinden üretildi. Metni kendi maðaza tonunuza göre düzenleyin.",
    tags: [
      "etsy listing",
      "handmade",
      "gift idea",
      "small business",
      "trending",
      "shop update",
      "custom gift",
      "unique style",
      "for home",
      "for office",
      "premium",
      "artisan",
      "limited",
    ],
    materials: ["cotton"],
    attributes: request.sourceAttributes ?? [],
    seoNotes: "Prioritize intent-based terms and avoid duplicate tags.",
    policyNotes: "Do not claim official brand affiliation without proof.",
    model: "chatgpt-web",
  };
}