import { expect, test } from "@playwright/test";

test("loads quick mode, saves a preset, opens advanced settings, and switches analysis", async ({ page }) => {
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

  await page.goto("/etsy-cost-calculator?ownerKey=berke&productId=prod_1");
  await expect(page).toHaveURL(/\/etsy-cost-calculator\?ownerKey=berke&productId=prod_1$/);
  await expect(page.getByRole("heading", { name: /etsy maliyet hesaplayici/i })).toBeVisible();
  await expect(page.getByRole("tab", { name: /hedef kar icin satis fiyati bul/i })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("button", { name: /abd hedef profili/i })).toBeVisible();
  await expect(page.getByText(/toplam gider ozeti/i)).toBeVisible();
  await expect(page.getByRole("heading", { name: /abd ithalat vergisi/i })).toHaveCount(0);

  await page.getByRole("button", { name: /abd hedef profili/i }).click();
  await expect(page.getByLabel(/manuel duty %/i)).toBeVisible();
  await page.getByLabel("İndirim %").fill("30");
  await page.getByLabel("Alıcıdan alınan kargo (USD)").fill("0");
  await page.getByLabel("Ekstra tahsilat (USD)").fill("0");
  await page.getByLabel(/^Urun maliyeti$/i).fill("18");
  await page.getByLabel(/^Gercek kargo$/i).fill("5");
  await page.getByLabel(/manuel duty %/i).fill("11");
  await page.getByLabel(/hedef kar degeri/i).fill("10");

  await expect(page.getByText(/onerilen etsy satis fiyati/i)).toBeVisible();
  await expect(page.getByText(/indirimli liste fiyati/i)).toBeVisible();

  await page.getByLabel(/opsiyonel satis fiyati/i).fill("39");

  await page.getByRole("button", { name: /hazir ayarlar/i }).click();
  await expect(page.getByRole("region", { name: /hazir ayar araci/i })).toBeVisible();
  await page.getByLabel(/hazir ayar adi/i).fill("ABD hizli");
  await page.getByRole("button", { name: /hazir ayari kaydet/i }).click();

  await expect
    .poll(
      () =>
        Boolean(
          settings.etsyCostCalculator &&
            Array.isArray((settings.etsyCostCalculator as { presets?: Array<{ name: string }> }).presets) &&
            (settings.etsyCostCalculator as { presets?: Array<{ name: string }> }).presets?.some((preset) => preset.name === "ABD hizli"),
        ),
      { timeout: 5_000 },
    )
    .toBe(true);

  await page.getByRole("button", { name: /gelismis ayarlar/i }).click();
  await expect(page.getByRole("dialog", { name: /gelismis ayarlar/i })).toBeVisible();
  await page.getByRole("button", { name: /gelismis ayarlari kapat/i }).click();

  await page.getByRole("tab", { name: /mevcut fiyati analiz et/i }).click();
  await expect(page.getByRole("tab", { name: /mevcut fiyati analiz et/i })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText(/toplam gider ozeti/i)).toBeVisible();
});
