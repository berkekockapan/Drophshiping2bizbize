export interface EtsyPromptPackProductSnapshot {
  productId: string;
  title: string | null;
  brand: string | null;
  category: string | null;
  attributeCount: number;
  variantCount: number;
  imageCount: number;
}

export interface SystemListingPromptPack {
  prompt: string;
  outputContract: {
    type: "json";
    fields: ["title", "description", "tags"];
  };
}

export type ListingPromptPack = SystemListingPromptPack;

export interface ChatGptResearchPromptPack {
  prompt: string;
  outputFormat: "sectioned-text";
  researchMode: "required";
  expectedSections: ["title", "description", "tags"];
}

export interface ImagePromptPack {
  mainPrompt: string;
  variations: string[];
  guardrailSummary: string[];
}

export interface EtsyPromptPackResponse {
  rulebookVersion: string;
  generatedAt: number;
  productSnapshot: EtsyPromptPackProductSnapshot;
  listingPromptPack: SystemListingPromptPack;
  systemListingPromptPack: SystemListingPromptPack;
  chatGptResearchPromptPack: ChatGptResearchPromptPack;
  imagePromptPack: ImagePromptPack;
}

export interface GeneratedListingPackResult {
  title: string;
  description: string;
  tags: string;
}

export interface GenerateListingPackResponse {
  provider: "openai-oauth";
  rulebookVersion: string;
  result: GeneratedListingPackResult;
}
