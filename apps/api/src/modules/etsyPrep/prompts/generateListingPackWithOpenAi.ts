import type { GenerateListingPackResponse } from "@dropshiping2bizbize/shared";

import type { D1Database, Env } from "../../../config/bindings";
import { OpenAiAuthError, resolveActiveOpenAiCredential } from "../../ai/openAiOAuth";
import type { EtsyPrepView } from "../buildEtsyPrepView";
import { buildEtsyPromptPackResponse } from "./buildEtsyPromptPackResponse";
import { buildProductPromptContext } from "./buildProductPromptContext";
import { parseListingPackResult } from "./parseListingPackResult";

function readApiBaseUrl(env: Env) {
  return (env.OPENAI_API_BASE_URL?.trim() || "https://api.openai.com/v1").replace(/\/+$/, "");
}

function readModel(env: Env) {
  return env.OPENAI_DEFAULT_MODEL?.trim() || "gpt-5-mini";
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

      const text = (chunk as { text?: unknown }).text;
      if (typeof text === "string" && text.trim().length > 0) {
        return text.trim();
      }
    }
  }

  const choices = Array.isArray(record.choices) ? record.choices : [];
  for (const choice of choices) {
    if (!choice || typeof choice !== "object") {
      continue;
    }

    const message = (choice as { message?: unknown }).message;
    if (message && typeof message === "object" && typeof (message as { content?: unknown }).content === "string") {
      return ((message as { content: string }).content || "").trim();
    }
  }

  return null;
}

export async function generateListingPackWithOpenAi(
  db: D1Database,
  env: Env,
  detail: EtsyPrepView,
): Promise<GenerateListingPackResponse> {
  const promptPack = buildEtsyPromptPackResponse(detail);
  const validationContext = buildProductPromptContext(detail);
  const credential = await resolveActiveOpenAiCredential(db, env);
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${credential.apiKey ?? credential.accessToken}`,
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
      messages: [{ role: "user", content: promptPack.listingPromptPack.prompt }],
      response_format: { type: "json_object" },
      temperature: 0.2,
    }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new OpenAiAuthError(
      response.status === 401 || response.status === 403 ? "PROFILE_NEEDS_REAUTH" : "GENERATION_FAILED",
      "OpenAI listing prompt istegi basarisiz oldu.",
      response.status === 401 || response.status === 403 ? 409 : 502,
    );
  }

  const rawText = extractOutputText(payload);
  if (!rawText) {
    throw new OpenAiAuthError("GENERATION_FAILED", "OpenAI yaniti metin icermiyor.", 502);
  }

  return {
    provider: "openai-oauth",
    rulebookVersion: promptPack.rulebookVersion,
    result: parseListingPackResult(rawText, validationContext),
  };
}

