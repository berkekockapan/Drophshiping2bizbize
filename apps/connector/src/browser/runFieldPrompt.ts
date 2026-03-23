import type { Page } from "playwright";

import type { GenerateFieldRequest, GenerateFieldResponse } from "../providers/base";

const CHATGPT_URL = "https://chatgpt.com/";
const PROMPT_INPUT_SELECTOR =
  "textarea[data-testid='prompt-textarea'], textarea#prompt-textarea, div#prompt-textarea[contenteditable='true']";

function buildPrompt(request: GenerateFieldRequest) {
  return [
    `You are generating Etsy field output for ${request.field}.`,
    "Return ONLY valid JSON.",
    '{ "field": "<same-field>", "value": "<final text>" }',
    request.prompt,
    `Context: ${JSON.stringify(request.context)}`,
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

function normalizeGeneratedResponse(
  request: GenerateFieldRequest,
  parsed: Record<string, unknown>,
): GenerateFieldResponse {
  const value = String(parsed.value ?? "").trim();
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
