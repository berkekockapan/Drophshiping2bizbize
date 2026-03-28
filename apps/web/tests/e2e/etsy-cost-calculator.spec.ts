import { expect, test } from "@playwright/test";

test("loads defaults, saves a preset, and resets fee overrides", async ({ page }) => {
  const settings = {
    id: "default",
    refreshIntervalHours: 5,
    promptPreferences: null,
    connectorHealthcheckEnabled: true,
    aiTargetBaseUrl: null,
    aiTargetManagementKey: null,
    aiTargetLabel: null,
    aiTargetApiKey: null,
    etsyCostCalculator: null as Record<string, unknown> | null,
  };

  await page.route("**/settings", async (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({
        status: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
    }

    const payload = JSON.parse(route.request().postData() ?? "{}");
    settings.etsyCostCalculator = payload.etsyCostCalculator ?? settings.etsyCostCalculator;
    return route.fulfill({
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
  });

  await page.route("**/owners/*/products/refresh-runs/active", async (route) => {
    await route.fulfill({ status: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ run: null }) });
  });

  await page.route("**/owners/*/products*", async (route) => {
    await route.fulfill({
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ summary: { trackedCount: 0, activeCount: 0, reviewNeededCount: 0 }, items: [], filters: {} }),
    });
  });

  await page.goto("/");
  await page.getByRole("link", { name: /etsy maliyet hesaplayici/i }).click();
  await expect(page).toHaveURL(/\/etsy-cost-calculator$/);
  await expect(page.getByRole("heading", { name: /etsy maliyet hesaplayici/i })).toBeVisible();

  await page.getByRole("spinbutton", { name: /liste fiyati/i }).fill("50");
  await page.getByRole("spinbutton", { name: /urun maliyeti/i }).fill("20");
  await page.getByRole("spinbutton", { name: /gercek kargo maliyeti/i }).fill("5");
  await page.getByLabel(/hedef kar modu/i).selectOption("net_profit_usd");
  await page.getByRole("spinbutton", { name: /hedef kar degeri/i }).fill("20");
  await expect(page.getByText(/kampanyali minimum guvenli fiyat/i)).toBeVisible();

  await page.getByLabel(/preset adi/i).fill("ABD basic");
  await page.getByRole("button", { name: /preset kaydet/i }).click();
  await expect
    .poll(
      () =>
        Boolean(
          settings.etsyCostCalculator &&
            Array.isArray((settings.etsyCostCalculator as { presets?: Array<{ name: string }> }).presets) &&
            (settings.etsyCostCalculator as { presets?: Array<{ name: string }> }).presets?.some((preset) => preset.name === "ABD basic"),
        ),
      { timeout: 5_000 },
  )
  .toBe(true);
  await page.reload();
  await expect(page.locator("option", { hasText: /abd basic/i })).toHaveCount(1);

  await page.getByRole("button", { name: /gelismis fee ayarlari/i }).click();
  await page.getByLabel(/transaction fee/i).fill("7");
  await page.getByRole("button", { name: /varsayilan ayarlara don/i }).click();
  await expect(page.getByLabel(/transaction fee/i)).toHaveValue("6.5");
});
