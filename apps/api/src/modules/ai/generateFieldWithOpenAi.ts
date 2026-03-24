import type { Env, D1Database } from "../../config/bindings";
import {
  OpenAiAuthError,
  resolveActiveOpenAiCredential,
} from "./openAiOAuth";

type EtsyPrepField = "title" | "description" | "tags";

export interface GenerateFieldWithOpenAiInput {
  field: EtsyPrepField;
  prompt: string;
  context: Record<string, unknown>;
}

export interface GenerateFieldWithOpenAiResult {
  field: EtsyPrepField;
  value: string;
  provider: "openai-oauth";
}

function readApiBaseUrl(env: Env) {
  return (env.OPENAI_API_BASE_URL?.trim() || "https://api.openai.com/v1").replace(/\/+$/, "");
}

function readModel(env: Env) {
  return env.OPENAI_DEFAULT_MODEL?.trim() || "gpt-5-mini";
}

function parseJsonPayload(rawText: string): Record<string, unknown> | null {
  const candidates = [
    rawText,
    rawText.match(/```json\s*([\s\S]*?)```/i)?.[1] ?? null,
    rawText.match(/```\s*([\s\S]*?)```/i)?.[1] ?? null,
    rawText.match(/\{[\s\S]*\}/)?.[0] ?? null,
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === "object") {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // Try next candidate.
    }
  }

  return null;
}

function extractOutputText(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = payload as Record<string, unknown>;

  if (typeof record.output_text === "string" && record.output_text.trim().length > 0) {
    return record.output_text.trim();
  }

  const output = Array.isArray(record.output) ? record.output : [];
  for (const item of output) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const content = Array.isArray((item as { content?: unknown }).content)
      ? ((item as { content?: unknown }).content as unknown[])
      : [];

    for (const chunk of content) {
      if (!chunk || typeof chunk !== "object") {
        continue;
      }

      const chunkRecord = chunk as Record<string, unknown>;
      if (typeof chunkRecord.text === "string" && chunkRecord.text.trim().length > 0) {
        return chunkRecord.text.trim();
      }
    }
  }

  const choices = Array.isArray((record as { choices?: unknown }).choices)
    ? ((record as { choices?: unknown }).choices as unknown[])
    : [];
  for (const choice of choices) {
    if (!choice || typeof choice !== "object") {
      continue;
    }

    const message = (choice as { message?: unknown }).message;
    if (message && typeof message === "object") {
      const content = (message as { content?: unknown }).content;
      if (typeof content === "string" && content.trim().length > 0) {
        return content.trim();
      }
    }
  }

  return null;
}

function firstNonEmptyString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return "";
}

function normalizeTagsValue(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter(Boolean)
      .join(", ");
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .join(", ");
  }

  return "";
}

function normalizeGeneratedFieldValue(
  input: GenerateFieldWithOpenAiInput,
  parsed: Record<string, unknown>,
): string {
  const value =
    input.field === "title"
      ? firstNonEmptyString(parsed.title, parsed.englishTitle, parsed.value)
      : input.field === "description"
        ? firstNonEmptyString(parsed.longDescription, parsed.description, parsed.value)
        : normalizeTagsValue(parsed.tags ?? parsed.value);

  if (!value) {
    throw new OpenAiAuthError(
      "GENERATION_FAILED",
      "OpenAI yanıtında beklenen alan değeri bulunamadı.",
    );
  }

  return value;
}

function buildMessages(input: GenerateFieldWithOpenAiInput) {
  const systemMessage = [
    "You generate Etsy listing fields.",
    "Return only valid JSON. No markdown, no explanations.",
  ].join(" ");

  const userPrompt = [
    `Field: ${input.field}`,
    input.prompt,
    `Context: ${JSON.stringify(input.context)}`,
  ].join("\n");

  return [
    { role: "system", content: systemMessage },
    { role: "user", content: userPrompt },
  ];
}

export async function generateFieldWithOpenAi(
  db: D1Database,
  env: Env,
  input: GenerateFieldWithOpenAiInput,
): Promise<GenerateFieldWithOpenAiResult> {
  const credential = await resolveActiveOpenAiCredential(db, env);
  const bearerToken = credential.apiKey ?? credential.accessToken;
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${bearerToken}`,
  };

  if (credential.selectedWorkspaceProjectId) {
    headers["OpenAI-Project"] = credential.selectedWorkspaceProjectId;
  }
  if (env.OPENAI_ORGANIZATION?.trim()) {
    headers["OpenAI-Organization"] = env.OPENAI_ORGANIZATION.trim();
  }

  const response = await fetch(`${readApiBaseUrl(env)}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: readModel(env),
      messages: buildMessages(input),
      response_format: { type: "json_object" },
      temperature: 0.2,
    }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const upstreamError =
      payload && typeof payload === "object" && (payload as { error?: { message?: string } }).error?.message
        ? (payload as { error: { message: string } }).error.message
        : null;

    if (response.status === 401 || response.status === 403) {
      throw new OpenAiAuthError(
        "PROFILE_NEEDS_REAUTH",
        upstreamError || "OpenAI yetkilendirmesi geçersiz. Hesabı yeniden bağlayın.",
      );
    }

    throw new OpenAiAuthError(
      "GENERATION_FAILED",
      upstreamError || `OpenAI üretim isteği başarısız oldu (${response.status}).`,
    );
  }

  const outputText = extractOutputText(payload);
  if (!outputText) {
    throw new OpenAiAuthError("GENERATION_FAILED", "OpenAI yanıt metni çözümlenemedi.");
  }

  const parsed = parseJsonPayload(outputText);
  if (!parsed) {
    throw new OpenAiAuthError("GENERATION_FAILED", "OpenAI yanıtı geçerli JSON içermiyor.");
  }

  return {
    field: input.field,
    value: normalizeGeneratedFieldValue(input, parsed),
    provider: "openai-oauth",
  };
}
