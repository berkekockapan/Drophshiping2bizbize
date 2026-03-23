import { describe, expect, it } from "vitest";

import { normalizeGeneratedFieldValue, runFieldPrompt } from "../../src/browser/runFieldPrompt";
import type { GenerateFieldRequest } from "../../src/providers/base";

const ASSISTANT_SELECTOR = "[data-message-author-role='assistant']";
const PROMPT_SELECTOR =
  "textarea[data-testid='prompt-textarea'], textarea#prompt-textarea, div#prompt-textarea[contenteditable='true']";

class FakeIndexedLocator {
  constructor(
    private readonly values: string[],
    private readonly index: number,
  ) {}

  async waitFor() {
    if (this.values[this.index] === undefined) {
      throw new Error(`Locator item not found at index ${this.index}`);
    }
  }

  async innerText() {
    return this.values[this.index] ?? "";
  }
}

class FakeCollectionLocator {
  constructor(private readonly values: string[]) {}

  async count() {
    return this.values.length;
  }

  nth(index: number) {
    return new FakeIndexedLocator(this.values, index);
  }

  first() {
    return {
      click: async () => undefined,
      fill: async (value: string) => {
        fakePageState.filledPrompt = value;
      },
    };
  }
}

const fakePageState = {
  filledPrompt: "",
};

class FakePage {
  readonly keyboard: { press: (key: string) => Promise<void> };

  constructor(
    private currentUrl: string,
    private readonly assistantMessages: string[],
    private readonly fallbackArticles: string[],
    private readonly onSubmit: () => void,
  ) {
    this.keyboard = {
      press: async (key: string) => {
        if (key === "Enter") {
          this.onSubmit();
        }
      },
    };
  }

  url() {
    return this.currentUrl;
  }

  async goto(url: string) {
    this.currentUrl = url;
  }

  async waitForSelector(selector: string) {
    if (selector !== PROMPT_SELECTOR) {
      throw new Error(`Unexpected selector: ${selector}`);
    }
  }

  locator(selector: string) {
    if (selector === PROMPT_SELECTOR) {
      return new FakeCollectionLocator([]);
    }

    if (selector === ASSISTANT_SELECTOR) {
      return new FakeCollectionLocator(this.assistantMessages);
    }

    if (selector === "main article") {
      return new FakeCollectionLocator(this.fallbackArticles);
    }

    throw new Error(`Unexpected locator selector: ${selector}`);
  }

  async waitForTimeout() {
    return undefined;
  }
}

describe("runFieldPrompt", () => {
  it("normalizes a title response from the newly submitted assistant message", async () => {
    fakePageState.filledPrompt = "";
    const assistantMessages = ['{"title":"Older title"}'];
    const page = new FakePage("https://chatgpt.com/", assistantMessages, [], () => {
      assistantMessages.push('{"title":"Handmade Oversize Hoodie","keywords":["hoodie","gift"]}');
    });

    const request: GenerateFieldRequest = {
      field: "title",
      prompt: 'Return ONLY valid JSON.\nOUTPUT_SCHEMA: {"required":["title"]}',
      context: { productId: "prod_1" },
    };

    const result = await runFieldPrompt(page as never, request);

    expect(result).toEqual({
      field: "title",
      value: "Handmade Oversize Hoodie",
      provider: "chatgpt-web",
    });
    expect(fakePageState.filledPrompt).toContain('OUTPUT_SCHEMA: {"required":["title"]}');
    expect(fakePageState.filledPrompt).not.toContain('"field": "<same-field>", "value": "<final text>"');
  });

  it("normalizes description payloads to the long description string", () => {
    const request: GenerateFieldRequest = {
      field: "description",
      prompt: "Return ONLY valid JSON.",
      context: {},
    };

    const result = normalizeGeneratedFieldValue(request, {
      shortDescription: "Short summary",
      longDescription: "Detailed Etsy-ready description",
      keyFeatures: ["Soft", "Oversize"],
    });

    expect(result).toEqual({
      field: "description",
      value: "Detailed Etsy-ready description",
      provider: "chatgpt-web",
    });
  });

  it("normalizes tag arrays into a stable comma-separated string", () => {
    const request: GenerateFieldRequest = {
      field: "tags",
      prompt: "Return ONLY valid JSON.",
      context: {},
    };

    const result = normalizeGeneratedFieldValue(request, {
      tags: ["oversize hoodie", " gift for her ", "", "streetwear"],
    });

    expect(result).toEqual({
      field: "tags",
      value: "oversize hoodie, gift for her, streetwear",
      provider: "chatgpt-web",
    });
  });
});
