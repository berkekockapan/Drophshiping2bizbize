import type { ConnectionAttempt } from "../store/connectionAttemptStore";
import type { ConnectorProfile, ConnectorProfileStatus, ProviderId } from "../store/profileStore";

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

export const generateFieldNames = ["title", "description", "tags"] as const;
export type GenerateFieldName = (typeof generateFieldNames)[number];

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
  status?: ConnectorProfileStatus;
  lastValidatedAt?: number | null;
  lastError?: string | null;
  sessionSecret?: string | null;
  makeActive?: boolean;
}

export interface ConnectorHealth {
  status: "online";
  provider: ProviderId;
  activeProfile: ConnectorProfile | null;
  connectionAttempt: ConnectionAttempt | null;
}

export type ConnectorErrorCode =
  | "NO_ACTIVE_PROFILE"
  | "PROFILE_NEEDS_REAUTH"
  | "LOGIN_IN_PROGRESS"
  | "CONNECTOR_OFFLINE"
  | "GENERATION_FAILED"
  | "PROVIDER_UI_CHANGED";

export class ConnectorProviderError extends Error {
  constructor(
    public readonly code: ConnectorErrorCode,
    message: string,
    public readonly statusCode = 409,
  ) {
    super(message);
    this.name = "ConnectorProviderError";
  }
}

export interface AIProvider {
  readonly id: string;
  listProfiles(): Promise<ConnectorProfile[]>;
  getActiveProfile(): Promise<ConnectorProfile | null>;
  getHealth(): Promise<ConnectorHealth>;
  startConnection(provider: "openai"): Promise<ConnectionAttempt>;
  getConnectionAttempt(attemptId: string): Promise<ConnectionAttempt | null>;
  cancelConnectionAttempt(attemptId: string): Promise<ConnectionAttempt | null>;
  reconnectProfile(profileId: string): Promise<ConnectionAttempt>;
  deleteProfile(profileId: string): Promise<void>;
  activateProfile(profileId: string): Promise<ConnectorProfile>;
  upsertProfile(input: UpsertProfileInput): Promise<ConnectorProfile>;
  generate(request: GenerateRequest): Promise<GenerateResponse>;
  generateField(request: GenerateFieldRequest): Promise<GenerateFieldResponse>;
}
