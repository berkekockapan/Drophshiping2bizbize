import type { Locator, Page } from "playwright";

import type { GenerateFieldRequest, GenerateFieldResponse } from "../providers/base";

const CHATGPT_URL = "https://chatgpt.com/";
const PROMPT_INPUT_SELECTOR =
  "textarea[data-testid='prompt-textarea'], textarea#prompt-textarea, div#prompt-textarea[contenteditable='true']";

function buildPrompt(request: GenerateFieldRequest) {
  const contextKeys = Object.keys(request.context);
  if (contextKeys.length === 0) {
    return request.prompt;
  }

  return [request.prompt, `Context: ${JSON.stringify(request.context)}`].join("\n");
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

async function waitForNonEmptyText(page: Page, locator: Locator, timeout: number) {
  await locator.waitFor({ state: "visible", timeout });
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeout) {
    const text = (await locator.innerText()).trim();
    if (text.length > 0) {
      return text;
    }

    await page.waitForTimeout(250);
  }

  throw new Error("Assistant response was empty.");
}

async function readAssistantMessage(
  page: Page,
  countsBeforeSubmit: { assistantMessages: number; fallbackArticles: number },
) {
  const nextAssistantByRole = page
    .locator("[data-message-author-role='assistant']")
    .nth(countsBeforeSubmit.assistantMessages);

  try {
    return await waitForNonEmptyText(page, nextAssistantByRole, 120_000);
  } catch {
    // Continue to fallback selectors.
  }

  const nextFallbackAssistant = page.locator("main article").nth(countsBeforeSubmit.fallbackArticles);
  return waitForNonEmptyText(page, nextFallbackAssistant, 30_000);
}

function firstNonEmptyString(...candidates: unknown[]) {
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim();
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

export function normalizeGeneratedFieldValue(
  request: GenerateFieldRequest,
  parsed: Record<string, unknown>,
): GenerateFieldResponse {
  const value =
    request.field === "title"
      ? firstNonEmptyString(parsed.title, parsed.englishTitle, parsed.value)
      : request.field === "description"
        ? firstNonEmptyString(parsed.longDescription, parsed.description, parsed.value)
        : normalizeTagsValue(parsed.tags ?? parsed.value);

  if (!value) {
    throw new Error("ChatGPT response did not include a field value.");
  }

  return {
    field: request.field,
    value,
    provider: "chatgpt-web",
  };
}

export async function runFieldPrompt(
  page: Page,
  request: GenerateFieldRequest,
): Promise<GenerateFieldResponse> {
  const prompt = buildPrompt(request);
  const countsBeforeSubmit = {
    assistantMessages: await page.locator("[data-message-author-role='assistant']").count(),
    fallbackArticles: await page.locator("main article").count(),
  };

  if (!page.url().startsWith(CHATGPT_URL)) {
    await page.goto(CHATGPT_URL, { waitUntil: "domcontentloaded" });
  }

  await submitPrompt(page, prompt);
  const rawAssistantText = await readAssistantMessage(page, countsBeforeSubmit);
  const parsed = parseJsonPayload(rawAssistantText);

  if (!parsed) {
    throw new Error("ChatGPT response did not contain valid JSON.");
  }

  return normalizeGeneratedFieldValue(request, parsed);
}
