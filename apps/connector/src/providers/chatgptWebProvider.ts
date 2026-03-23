import { BrowserSession } from "../browser/browserSession";
import { runFieldPrompt } from "../browser/runFieldPrompt";
import { runPrompt } from "../browser/runPrompt";
import type {
  AIProvider,
  GenerateFieldRequest,
  GenerateFieldResponse,
  GenerateRequest,
  GenerateResponse,
  UpsertProfileInput,
} from "./base";
import type { ConnectorProfile, ProfileStore } from "../store/profileStore";

export class ChatGptWebProvider implements AIProvider {
  readonly id = "chatgpt-web";

  constructor(
    private readonly store: ProfileStore,
    private readonly browserSession = new BrowserSession(),
  ) {}

  async listProfiles(): Promise<ConnectorProfile[]> {
    return this.store.listProfiles();
  }

  async getActiveProfile() {
    return this.store.getActiveProfile();
  }

  async activateProfile(profileId: string) {
    return this.store.setActiveProfile(profileId);
  }

  async upsertProfile(input: UpsertProfileInput) {
    const profile = await this.store.saveProfile(input);

    if (input.makeActive) {
      return this.store.setActiveProfile(profile.id);
    }

    return profile;
  }

  private async ensureActiveProfile() {
    const activeProfile = await this.store.getActiveProfile();
    if (!activeProfile) {
      throw new Error("No active ChatGPT profile. Add and activate a profile first.");
    }
  }

  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    await this.ensureActiveProfile();
    const page = await this.browserSession.ensurePage();
    return runPrompt(page, request);
  }

  async generateField(request: GenerateFieldRequest): Promise<GenerateFieldResponse> {
    await this.ensureActiveProfile();
    const page = await this.browserSession.ensurePage();
    return runFieldPrompt(page, request);
  }
}
