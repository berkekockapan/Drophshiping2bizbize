import { BrowserSession } from "../browser/browserSession";
import { runPrompt } from "../browser/runPrompt";
import type { AIProvider, GenerateRequest, GenerateResponse, UpsertProfileInput } from "./base";
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

  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    const activeProfile = await this.store.getActiveProfile();
    if (!activeProfile) {
      throw new Error("No active ChatGPT profile. Add and activate a profile first.");
    }

    const page = await this.browserSession.ensurePage();
    return runPrompt(page, request);
  }
}
