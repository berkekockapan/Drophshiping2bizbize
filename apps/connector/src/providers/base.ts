import type { ConnectorProfile } from "../store/profileStore";

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

export interface AIProvider {
  readonly id: string;
  listProfiles(): Promise<ConnectorProfile[]>;
  getActiveProfile(): Promise<ConnectorProfile | null>;
  activateProfile(profileId: string): Promise<ConnectorProfile>;
  generate(request: GenerateRequest): Promise<GenerateResponse>;
}