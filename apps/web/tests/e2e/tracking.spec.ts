import { expect, test } from "@playwright/test";

test("user adds a Trendyol link, opens product detail, and sees the gallery image", async ({ page }) => {
  const seedUrl = "https://www.trendyol.com/north-apparel/oversize-hoodie-p-123";
  const items: Array<{
    id: string;
    title: string;
    brand: string;
    status: string;
    parseStatus: string;
    thumbnailImage: string | null;
    currentPrice: number;
    minPrice: number;
    maxPrice: number;
    inStockVariantCount: number;
    totalVariantCount: number;
  }> = [];

  await page.route("**/products/prod_1*", async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue();
      return;
    }

    await route.fulfill({
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product: {
          id: "prod_1",
          trendyolUrl: seedUrl,
          sourceProductId: "123",
          title: "Oversize Hoodie",
          brand: "North Apparel",
          category: "Sweatshirt",
          descriptionRaw: "Soft brushed cotton hoodie with relaxed fit.",
          attributes: [],
          images: ["https://cdn.example.com/hoodie-1.jpg", "https://cdn.example.com/hoodie-2.jpg"],
          status: "ACTIVE",
          parseStatus: "OK",
          lastCheckedAt: Date.now(),
        },
        currentState: {
          currentPrice: 42990,
          minPrice: 42990,
          maxPrice: 42990,
          inStockVariantCount: 3,
          totalVariantCount: 3,
          lastChangeAt: Date.now(),
          lastCheckedAt: Date.now(),
        },
        variants: [],
        priceHistory: [],
        stockHistory: [],
        notifications: [],
      }),
    });
  });

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
        thumbnailImage: "https://cdn.example.com/hoodie-1.jpg",
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

  await expect(page.getByRole("link", { name: /ürün görseli: oversize hoodie/i })).toBeVisible();
  await page.getByRole("link", { name: /ürün görseli: oversize hoodie/i }).click();
  await expect(page).toHaveURL(/\/products\/prod_1$/);
  await expect(page.getByRole("img", { name: /oversize hoodie ana görsel/i })).toBeVisible();
});
