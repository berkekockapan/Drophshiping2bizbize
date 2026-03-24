import type {
  AIProvider,
  ConnectorHealth,
  GenerateFieldRequest,
  GenerateFieldResponse,
  GenerateRequest,
  GenerateResponse,
  UpsertProfileInput,
} from "./base";
import type { ConnectionAttempt } from "../store/connectionAttemptStore";
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
  private connectionAttempts = new Map<string, ConnectionAttempt>();
  private latestAttemptId: string | null = null;

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
      status: "connected",
      lastValidatedAt: Date.now(),
      lastError: null,
    });
  }

  private rememberAttempt(attempt: ConnectionAttempt) {
    this.connectionAttempts.set(attempt.id, attempt);
    this.latestAttemptId = attempt.id;
    return attempt;
  }

  async listProfiles(): Promise<ConnectorProfile[]> {
    await this.ensureDefaultProfile();
    return this.store.listProfiles();
  }

  async getActiveProfile() {
    await this.ensureDefaultProfile();
    return this.store.getActiveProfile();
  }

  async getHealth(): Promise<ConnectorHealth> {
    const activeProfile = await this.getActiveProfile();

    return {
      status: "online",
      provider: this.id,
      activeProfile,
      connectionAttempt: this.latestAttemptId ? (this.connectionAttempts.get(this.latestAttemptId) ?? null) : null,
    };
  }

  async startConnection(_provider: "openai") {
    const now = Date.now();
    const profileId = `mock-profile-${now}`;
    await this.upsertProfile({
      id: profileId,
      label: `Mock Workspace ${new Date(now).toISOString()}`,
      emailMasked: "mo***@local.dev",
      provider: "mock",
      status: "connected",
      lastValidatedAt: now,
      lastError: null,
      makeActive: true,
    });

    return this.rememberAttempt({
      id: `mock-attempt-${now}`,
      provider: "openai",
      status: "completed",
      profileId,
      error: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  async getConnectionAttempt(attemptId: string) {
    return this.connectionAttempts.get(attemptId) ?? null;
  }

  async reconnectProfile(profileId: string) {
    await this.ensureDefaultProfile();
    const now = Date.now();
    await this.store.updateProfile(profileId, {
      status: "connected",
      lastValidatedAt: now,
      lastError: null,
    });

    return this.rememberAttempt({
      id: `mock-attempt-${now}`,
      provider: "openai",
      status: "completed",
      profileId,
      error: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  async deleteProfile(profileId: string) {
    await this.store.deleteProfile(profileId);
  }

  async activateProfile(profileId: string) {
    await this.ensureDefaultProfile();
    return this.store.setActiveProfile(profileId);
  }

  async upsertProfile(input: UpsertProfileInput) {
    const profile = await this.store.saveProfile({
      id: input.id,
      label: input.label,
      emailMasked: input.emailMasked,
      provider: input.provider,
      status: input.status ?? "connected",
      lastValidatedAt: input.lastValidatedAt ?? Date.now(),
      lastError: input.lastError ?? null,
      sessionSecret: input.sessionSecret,
    });

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
