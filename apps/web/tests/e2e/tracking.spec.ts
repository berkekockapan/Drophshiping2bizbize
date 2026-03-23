import { expect, test } from "@playwright/test";

test("user adds a Trendyol link, favorites it, downloads the selected image, and deletes it", async ({ page }) => {
  const seedUrl = "https://www.trendyol.com/north-apparel/oversize-hoodie-p-123";
  const items: Array<{
    id: string;
    trendyolUrl: string;
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
    isFavorite: boolean;
  }> = [];

  await page.route("**/products/prod_1/images/download**", async (route) => {
    await route.fulfill({
      status: 200,
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Disposition": 'attachment; filename="oversize-hoodie.jpg"',
      },
      body: Buffer.from([255, 216, 255, 217]),
    });
  });

  await page.route("**/products/prod_1*", async (route) => {
    const request = route.request();
    if (request.method() !== "GET" || request.url().includes("/images/download")) {
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

  await page.route("**/tracking/products/prod_1/favorite", async (route) => {
    const body = JSON.parse(route.request().postData() ?? "{}") as { isFavorite?: boolean };
    if (items[0]) {
      items[0].isFavorite = Boolean(body.isFavorite);
    }

    await route.fulfill({
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: "prod_1", isFavorite: items[0]?.isFavorite ?? false }),
    });
  });

  await page.route("**/tracking/products/prod_1", async (route) => {
    if (route.request().method() !== "DELETE") {
      await route.continue();
      return;
    }

    items.splice(
      items.findIndex((item) => item.id === "prod_1"),
      1,
    );

    await route.fulfill({ status: 204, body: "" });
  });

  await page.route("**/tracking/products*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (request.method() === "GET") {
      const itemsForView = url.searchParams.get("favorite") === "true" ? items.filter((item) => item.isFavorite) : items;

      await route.fulfill({
        status: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: {
            trackedCount: items.length,
            activeCount: items.length,
            reviewNeededCount: 0,
          },
          items: itemsForView,
          filters: { favorite: url.searchParams.get("favorite") === "true" },
        }),
      });
      return;
    }

    if (request.method() === "POST") {
      items.push({
        id: "prod_1",
        trendyolUrl: seedUrl,
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
        isFavorite: false,
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

  page.on("dialog", (dialog) => dialog.accept());

  await page.goto("/");
  await page.getByPlaceholder("https://www.trendyol.com/...").fill(seedUrl);
  await page.getByRole("button", { name: "Ekle" }).click();

  await expect(page.getByRole("link", { name: /ürün görseli: oversize hoodie/i })).toBeVisible();
  await page.getByRole("button", { name: /favoriye ekle/i }).click();
  await page.getByRole("button", { name: /favoriler/i }).click();
  await expect(page.getByText(/oversize hoodie/i)).toBeVisible();

  await page.getByRole("link", { name: /ürün görseli: oversize hoodie/i }).click();
  await expect(page).toHaveURL(/\/products\/prod_1$/);

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /jpg indir/i }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain(".jpg");

  await page.goBack();
  await page.getByRole("button", { name: /favoriler/i }).click();
  await page.getByRole("button", { name: /^sil$/i }).click();
  await expect(page.getByText(/henüz favori ürün yok/i)).toBeVisible();
});
