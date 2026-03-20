import { chromium, type Browser, type Page } from "playwright";

export class BrowserSession {
  private browser: Browser | null = null;
  private page: Page | null = null;

  constructor(private readonly options: { headless?: boolean } = {}) {}

  async ensurePage() {
    if (this.page) {
      return this.page;
    }

    if (!this.browser) {
      this.browser = await chromium.launch({ headless: this.options.headless ?? false });
    }

    this.page = await this.browser.newPage();
    return this.page;
  }

  async close() {
    await this.page?.close().catch(() => undefined);
    await this.browser?.close().catch(() => undefined);
    this.page = null;
    this.browser = null;
  }
}