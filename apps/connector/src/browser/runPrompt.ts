import type { Page } from "playwright";

import type { GenerateRequest, GenerateResponse } from "../providers/base";

type DraftAttribute = { key: string; value: string };

const CHATGPT_URL = "https://chatgpt.com/";
const PROMPT_INPUT_SELECTOR =
  "textarea[data-testid='prompt-textarea'], textarea#prompt-textarea, div#prompt-textarea[contenteditable='true']";

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

function buildPrompt(request: GenerateRequest) {
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
    `Product ID: ${request.productId}`,
    `Source title: ${request.sourceTitle}`,
    `Source description: ${request.sourceDescription ?? ""}`,
    `Source attributes: ${JSON.stringify(request.sourceAttributes ?? [])}`,
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
      // Ignore and try the next candidate.
    }
  }

  return null;
}

function toStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => String(item).trim()).filter(Boolean);
}

function toAttributes(value: unknown): DraftAttribute[] {
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
  request: GenerateRequest,
  parsed: Record<string, unknown>,
): GenerateResponse {
  const sourceTitle = request.sourceTitle.trim() || "Handmade Product";
  const fallbackTags = buildFallbackTags(sourceTitle);
  const parsedTags = toStringArray(parsed.tags)
    .map((tag) => tag.slice(0, 20))
    .slice(0, 13);

  const tags =
    parsedTags.length === 13
      ? parsedTags
      : [...parsedTags, ...fallbackTags].slice(0, 13);

  return {
    englishTitle: String(parsed.englishTitle ?? `${sourceTitle} | Etsy Listing`).trim(),
    shortDescription: String(parsed.shortDescription ?? `${sourceTitle} for Etsy shoppers.`).trim(),
    longDescription: String(
      parsed.longDescription ??
        "Draft generated from ChatGPT Web connector. Please review tone, claims, and policy fit before publishing.",
    ).trim(),
    tags,
    materials: toStringArray(parsed.materials),
    attributes: toAttributes(parsed.attributes),
    seoNotes: String(parsed.seoNotes ?? "Focus on intent-rich long-tail phrases.").trim(),
    policyNotes: String(parsed.policyNotes ?? "Avoid unsupported claims and trademark misuse.").trim(),
    model: String(parsed.model ?? "chatgpt-web"),
  };
}

async function ensurePromptInput(page: Page) {
  await page.waitForSelector(PROMPT_INPUT_SELECTOR, { timeout: 30_000 });
  return page.locator(PROMPT_INPUT_SELECTOR).first();
}

async function submitPrompt(page: Page, prompt: string) {
  const input = await ensurePromptInput(page);
  await input.click();
  await input.fill(prompt);
  await page.keyboard.press("Enter");
}

async function readAssistantMessage(page: Page) {
  const assistantByRole = page.locator("[data-message-author-role='assistant']").last();

  try {
    await assistantByRole.waitFor({ state: "visible", timeout: 120_000 });
    const text = (await assistantByRole.innerText()).trim();
    if (text.length > 0) {
      return text;
    }
  } catch {
    // Continue to fallback selectors.
  }

  const fallbackAssistant = page.locator("main article").last();
  await fallbackAssistant.waitFor({ state: "visible", timeout: 30_000 });
  const fallbackText = (await fallbackAssistant.innerText()).trim();

  if (!fallbackText) {
    throw new Error("Assistant response was empty.");
  }

  return fallbackText;
}

export async function runPrompt(page: Page, request: GenerateRequest): Promise<GenerateResponse> {
  const prompt = buildPrompt(request);

  if (!page.url().startsWith(CHATGPT_URL)) {
    await page.goto(CHATGPT_URL, { waitUntil: "domcontentloaded" });
  }

  await submitPrompt(page, prompt);
  const rawAssistantText = await readAssistantMessage(page);
  const parsed = parseJsonPayload(rawAssistantText);

  if (!parsed) {
    throw new Error("ChatGPT response did not contain valid JSON.");
  }

  return normalizeGeneratedResponse(request, parsed);
}
