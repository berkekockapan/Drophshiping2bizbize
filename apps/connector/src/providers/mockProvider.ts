import type {
  AIProvider,
  GenerateFieldRequest,
  GenerateFieldResponse,
  GenerateRequest,
  GenerateResponse,
  UpsertProfileInput,
} from "./base";
import type { ConnectorProfile, ProfileStore } from "../store/profileStore";

function normalizeTag(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildTags(title: string): string[] {
  const base = [
    title,
    "handmade gift",
    "minimalist decor",
    "boho style",
    "cozy outfit",
    "daily wear",
    "customizable",
    "small business",
    "gift for her",
    "gift for him",
    "aesthetic",
    "trendy",
    "limited edition",
  ];

  return base.map(normalizeTag).filter(Boolean).slice(0, 13);
}

function buildFieldValue(request: GenerateFieldRequest) {
  const productId = String(request.context.productId ?? "unknown-product").trim() || "unknown-product";

  switch (request.field) {
    case "title":
      return `mock title for ${productId}`;
    case "description":
      return `mock description for ${productId}`;
    case "tags":
      return `mock tags for ${productId}`;
  }
}

export class MockProvider implements AIProvider {
  readonly id = "mock";

  constructor(private readonly store: ProfileStore) {}

  private async ensureDefaultProfile() {
    const profiles = await this.store.listProfiles();
    if (profiles.length > 0) {
      return;
    }

    await this.store.saveProfile({
      id: "mock-default",
      label: "Mock Workspace",
      emailMasked: "mo***@local.dev",
      provider: "mock",
    });
  }

  async listProfiles(): Promise<ConnectorProfile[]> {
    await this.ensureDefaultProfile();
    return this.store.listProfiles();
  }

  async getActiveProfile() {
    await this.ensureDefaultProfile();
    return this.store.getActiveProfile();
  }

  async activateProfile(profileId: string) {
    await this.ensureDefaultProfile();
    return this.store.setActiveProfile(profileId);
  }

  async upsertProfile(input: UpsertProfileInput) {
    const profile = await this.store.saveProfile(input);

    if (input.makeActive) {
      return this.store.setActiveProfile(profile.id);
    }

    return profile;
  }

  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    const titleStem = request.sourceTitle.trim() || "Handmade Product";
    const tags = buildTags(titleStem);

    return {
      englishTitle: `${titleStem} | Handmade Etsy Listing`,
      shortDescription: `${titleStem} için Etsy optimize kısa açıklama.`,
      longDescription: [
        `${titleStem} ürününün güçlü özelliklerini öne çıkaran detaylı açıklama.`,
        "Malzeme, kullanım alanı ve bakım notları doğal bir akışta verilir.",
      ].join(" "),
      tags,
      materials: ["cotton", "polyester"],
      attributes: request.sourceAttributes ?? [],
      seoNotes: "Use high-intent long tail keywords in first 40 characters.",
      policyNotes: "Avoid trademarked terms and unverifiable health claims.",
      model: "mock-v1",
    };
  }

  async generateField(request: GenerateFieldRequest): Promise<GenerateFieldResponse> {
    return {
      field: request.field,
      value: buildFieldValue(request),
      provider: this.id,
    };
  }
}
