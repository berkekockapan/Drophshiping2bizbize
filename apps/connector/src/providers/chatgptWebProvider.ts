import { BrowserSession } from "../browser/browserSession";
import { runPrompt } from "../browser/runPrompt";
import type { AIProvider, GenerateRequest, GenerateResponse } from "./base";
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

  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    const page = await this.browserSession.ensurePage();
    return runPrompt(page, request);
  }
}