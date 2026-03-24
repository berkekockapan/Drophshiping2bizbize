import type { D1Database, Env } from "../../config/bindings";
import { OpenAiAuthError, resolveActiveOpenAiCredential } from "./openAiOAuth";

export interface GenerateDraftWithOpenAiInput {
  productId: string;
  language: "en";
  sourceTitle: string;
  sourceDescription?: string | null;
  sourceAttributes?: Array<{ key: string; value: string }>;
}

export interface GenerateDraftWithOpenAiResult {
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

function readApiBaseUrl(env: Env) {
  return (env.OPENAI_API_BASE_URL?.trim() || "https://api.openai.com/v1").replace(/\/+$/, "");
}

function readModel(env: Env) {
  return env.OPENAI_DEFAULT_MODEL?.trim() || "gpt-5-mini";
}

function buildFallbackTags(sourceTitle: string) {
  return [
    sourceTitle,
    "etsy listing",
    "handmade",
    "gift idea",
    "small business",
    "customizable",
    "trendy",
    "minimal",
    "decor",
    "home",
    "office",
    "premium",
    "limited",
  ]
    .map((item) =>
      item
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 20),
    )
    .filter(Boolean)
    .slice(0, 13);
}

function buildPrompt(input: GenerateDraftWithOpenAiInput) {
  return [
    "You are generating Etsy listing draft fields.",
    "Return ONLY valid JSON. No markdown fences, no explanations.",
    "JSON schema:",
    "{",
    '  "englishTitle": string,',
    '  "shortDescription": string,',
    '  "longDescription": string,',
    '  "tags": string[13],',
    '  "materials": string[],',
    '  "attributes": { "key": string, "value": string }[],',
    '  "seoNotes": string,',
    '  "policyNotes": string',
    "}",
    "Rules:",
    "- Language: English",
    "- Keep title clear and natural",
    "- Provide exactly 13 tags, each max 20 chars",
    "- Avoid trademark claims",
    "",
    `Product ID: ${input.productId}`,
    `Source title: ${input.sourceTitle}`,
    `Source description: ${input.sourceDescription ?? ""}`,
    `Source attributes: ${JSON.stringify(input.sourceAttributes ?? [])}`,
  ].join("\n");
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
      // Try next.
    }
  }

  return null;
}

function extractOutputText(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = payload as Record<string, unknown>;
  const choices = Array.isArray(record.choices) ? record.choices : [];
  for (const choice of choices) {
    if (!choice || typeof choice !== "object") {
      continue;
    }

    const message = (choice as { message?: unknown }).message;
    if (!message || typeof message !== "object") {
      continue;
    }

    const content = (message as { content?: unknown }).content;
    if (typeof content === "string" && content.trim().length > 0) {
      return content.trim();
    }
  }

  if (typeof record.output_text === "string" && record.output_text.trim().length > 0) {
    return record.output_text.trim();
  }

  return null;
}

function toStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => String(item).trim()).filter(Boolean);
}

function toAttributes(value: unknown): Array<{ key: string; value: string }> {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is { key?: unknown; value?: unknown } => Boolean(item) && typeof item === "object")
    .map((item) => ({
      key: String(item.key ?? "").trim(),
      value: String(item.value ?? "").trim(),
    }))
    .filter((item) => item.key.length > 0 && item.value.length > 0);
}

function normalizeGeneratedResponse(
  input: GenerateDraftWithOpenAiInput,
  parsed: Record<string, unknown>,
  model: string,
): GenerateDraftWithOpenAiResult {
  const sourceTitle = input.sourceTitle.trim() || "Handmade Product";
  const fallbackTags = buildFallbackTags(sourceTitle);
  const parsedTags = toStringArray(parsed.tags)
    .map((tag) => tag.slice(0, 20))
    .slice(0, 13);
  const tags = parsedTags.length === 13 ? parsedTags : [...parsedTags, ...fallbackTags].slice(0, 13);

  return {
    englishTitle: String(parsed.englishTitle ?? `${sourceTitle} | Etsy Listing`).trim(),
    shortDescription: String(parsed.shortDescription ?? `${sourceTitle} for Etsy shoppers.`).trim(),
    longDescription: String(
      parsed.longDescription ??
        "Draft generated by OpenAI OAuth connection. Please review tone, claims, and policy fit before publishing.",
    ).trim(),
    tags,
    materials: toStringArray(parsed.materials),
    attributes: toAttributes(parsed.attributes),
    seoNotes: String(parsed.seoNotes ?? "Focus on intent-rich long-tail phrases.").trim(),
    policyNotes: String(parsed.policyNotes ?? "Avoid unsupported claims and trademark misuse.").trim(),
    model,
  };
}

export async function generateDraftWithOpenAi(
  db: D1Database,
  env: Env,
  input: GenerateDraftWithOpenAiInput,
): Promise<GenerateDraftWithOpenAiResult> {
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
      messages: [
        {
          role: "user",
          content: buildPrompt(input),
        },
      ],
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

  const model =
    payload && typeof payload === "object" && typeof (payload as { model?: unknown }).model === "string"
      ? ((payload as { model: string }).model || readModel(env))
      : readModel(env);

  return normalizeGeneratedResponse(input, parsed, model);
}
