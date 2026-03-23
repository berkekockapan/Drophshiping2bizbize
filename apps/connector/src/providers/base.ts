import type { ConnectorProfile, ProviderId } from "../store/profileStore";

export interface GenerateRequest {
  productId: string;
  language: "en";
  sourceTitle: string;
  sourceDescription?: string | null;
  sourceAttributes?: Array<{ key: string; value: string }>;
}

export interface GenerateResponse {
  englishTitle: string;
  shortDescription: string;
  longDescription: string;
  tags: string[];
  materials: string[];
  attributes: Array<{ key: string; value: string }>;
  seoNotes: string;
  policyNotes: string;
  model: string;
}

export type GenerateFieldName = "title" | "description" | "tags";

export interface GenerateFieldRequest {
  field: GenerateFieldName;
  prompt: string;
  context: Record<string, unknown>;
}

export interface GenerateFieldResponse {
  field: GenerateFieldName;
  value: string;
  provider: ProviderId;
}

export interface UpsertProfileInput {
  id: string;
  label: string;
  emailMasked: string | null;
  provider: ProviderId;
  sessionSecret?: string | null;
  makeActive?: boolean;
}

export interface AIProvider {
  readonly id: string;
  listProfiles(): Promise<ConnectorProfile[]>;
  getActiveProfile(): Promise<ConnectorProfile | null>;
  activateProfile(profileId: string): Promise<ConnectorProfile>;
  upsertProfile(input: UpsertProfileInput): Promise<ConnectorProfile>;
  generate(request: GenerateRequest): Promise<GenerateResponse>;
  generateField?(request: GenerateFieldRequest): Promise<GenerateFieldResponse>;
}
