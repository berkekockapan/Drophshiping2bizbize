export interface PromptSourceVariant {
  variantKey: string;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  currentPrice: number | null;
  currentStockState: string;
}

export interface BuildDraftPromptInput {
  product: {
    id: string;
    title: string | null;
    brand: string | null;
    category: string | null;
    descriptionRaw: string | null;
    attributes?: Array<{ key: string; value: string }> | null;
  };
  variants: PromptSourceVariant[];
}

export interface DraftPromptPayload {
  instructions: string;
  source: {
    productId: string;
    productTitle: string;
    brand: string | null;
    category: string | null;
    description: string | null;
    attributes: Array<{ key: string; value: string }>;
    variants: PromptSourceVariant[];
  };
  constraints: {
    locale: "en";
    maxTitleLength: number;
    requiredTagCount: number;
  };
}

export function buildDraftPrompt(input: BuildDraftPromptInput): DraftPromptPayload {
  return {
    instructions:
      "Create an Etsy-ready listing in English. Keep title <= 140 chars and provide exactly 13 tags. Avoid policy-risky claims.",
    source: {
      productId: input.product.id,
      productTitle: input.product.title ?? "Untitled product",
      brand: input.product.brand,
      category: input.product.category,
      description: input.product.descriptionRaw,
      attributes: input.product.attributes ?? [],
      variants: input.variants,
    },
    constraints: {
      locale: "en",
      maxTitleLength: 140,
      requiredTagCount: 13,
    },
  };
}