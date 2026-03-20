import type { AIProvider, GenerateRequest, GenerateResponse } from "./base";
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

  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    const titleStem = request.sourceTitle.trim() || "Handmade Product";
    const tags = buildTags(titleStem);

    return {
      englishTitle: `${titleStem} | Handmade Etsy Listing`,
      shortDescription: `${titleStem} için Etsy optimize kýsa açýklama.`,
      longDescription: [
        `${titleStem} ürününün güçlü özelliklerini öne çýkaran detaylý açýklama.`,
        "Malzeme, kullaným alaný ve bakým notlarý doðal bir akýþta verilir.",
      ].join(" "),
      tags,
      materials: ["cotton", "polyester"],
      attributes: request.sourceAttributes ?? [],
      seoNotes: "Use high-intent long tail keywords in first 40 characters.",
      policyNotes: "Avoid trademarked terms and unverifiable health claims.",
      model: "mock-v1",
    };
  }
}