import { expect, test } from "@playwright/test";

test("user adds a Trendyol link and sees it on the tracking center", async ({ page }) => {
  const seedUrl = "https://www.trendyol.com/north-apparel/oversize-hoodie-p-123";
  const items: Array<{
    id: string;
    title: string;
    brand: string;
    status: string;
    parseStatus: string;
    currentPrice: number;
    minPrice: number;
    maxPrice: number;
    inStockVariantCount: number;
    totalVariantCount: number;
  }> = [];

  await page.route("**/tracking/products*", async (route) => {
    const request = route.request();

    if (request.method() === "GET") {
      await route.fulfill({
        status: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: {
            trackedCount: items.length,
            activeCount: items.length,
            reviewNeededCount: 0,
          },
          items,
          filters: {},
        }),
      });
      return;
    }

    if (request.method() === "POST") {
      items.push({
        id: "prod_1",
        title: "Oversize Hoodie",
        brand: "North Apparel",
        status: "ACTIVE",
        parseStatus: "OK",
        currentPrice: 42990,
        minPrice: 42990,
        maxPrice: 42990,
        inStockVariantCount: 3,
        totalVariantCount: 3,
      });

      await route.fulfill({
        status: 201,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product: {
            id: "prod_1",
            trendyolUrl: seedUrl,
            sourceProductId: "123",
            title: "Oversize Hoodie",
            variantCount: 3,
          },
        }),
      });
      return;
    }

    await route.continue();
  });

  await page.goto("/");
  await page.getByPlaceholder("https://www.trendyol.com/...").fill(seedUrl);
  await page.getByRole("button", { name: "Ekle" }).click();

  await expect(page.getByText("Oversize Hoodie")).toBeVisible();
});