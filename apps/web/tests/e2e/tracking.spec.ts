import { expect, test } from "@playwright/test";

test("owner isolation with trash restore and hard delete", async ({ page }) => {
  const seedUrl = "https://www.trendyol.com/north-apparel/oversize-hoodie-p-123";
  const makeItem = (id: string, ownerKey: "berke" | "kaan", trendyolUrl: string) => ({
    id,
    ownerKey,
    trendyolUrl,
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

  const berkeItems: Array<ReturnType<typeof makeItem>> = [];
  const kaanItems: Array<ReturnType<typeof makeItem>> = [];
  const berkeTrash: Array<ReturnType<typeof makeItem>> = [];

  await page.route("**/owners/*/products/refresh-runs/active", async (route) => {
    await route.fulfill({
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ run: null }),
    });
  });

  await page.route("**/owners/berke/products*", async (route) => {
    const method = route.request().method();
    const pathname = new URL(route.request().url()).pathname;

    if (method === "GET" && pathname === "/owners/berke/products") {
      return route.fulfill({
        status: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: { trackedCount: berkeItems.length, activeCount: berkeItems.length, reviewNeededCount: 0 },
          items: berkeItems,
          filters: {},
        }),
      });
    }

    if (method === "POST" && pathname === "/owners/berke/products") {
      berkeItems.push(makeItem("berke_prod_1", "berke", seedUrl));
      return route.fulfill({
        status: 201,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product: {
            id: "berke_prod_1",
            ownerKey: "berke",
            trendyolUrl: seedUrl,
            sourceProductId: "123",
            title: "Oversize Hoodie",
            variantCount: 3,
          },
        }),
      });
    }

    if (method === "DELETE" && pathname.startsWith("/owners/berke/products/")) {
      const productId = pathname.split("/").at(-1);
      const index = berkeItems.findIndex((item) => item.id === productId);
      const [deleted] = index >= 0 ? berkeItems.splice(index, 1) : [];
      if (deleted) {
        berkeTrash.push(deleted);
      }
      return route.fulfill({ status: 204, body: "" });
    }

    return route.continue();
  });

  await page.route("**/owners/kaan/products*", async (route) => {
    const method = route.request().method();
    const pathname = new URL(route.request().url()).pathname;

    if (method === "GET" && pathname === "/owners/kaan/products") {
      return route.fulfill({
        status: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: { trackedCount: kaanItems.length, activeCount: kaanItems.length, reviewNeededCount: 0 },
          items: kaanItems,
          filters: {},
        }),
      });
    }

    if (method === "POST" && pathname === "/owners/kaan/products") {
      kaanItems.push(makeItem("kaan_prod_1", "kaan", seedUrl));
      return route.fulfill({
        status: 201,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product: {
            id: "kaan_prod_1",
            ownerKey: "kaan",
            trendyolUrl: seedUrl,
            sourceProductId: "123",
            title: "Oversize Hoodie",
            variantCount: 3,
          },
        }),
      });
    }

    return route.continue();
  });

  await page.route("**/owners/berke/trash*", async (route) => {
    const method = route.request().method();
    const pathname = new URL(route.request().url()).pathname;

    if (method === "GET" && pathname === "/owners/berke/trash") {
      if (berkeTrash.length === 0 && berkeItems.length > 0) {
        const [moved] = berkeItems.splice(0, 1);
        if (moved) {
          berkeTrash.push(moved);
        }
      }

      return route.fulfill({
        status: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: berkeTrash, total: berkeTrash.length }),
      });
    }

    if (method === "POST" && pathname.endsWith("/restore")) {
      const restored = berkeTrash.shift();
      if (restored) {
        berkeItems.push(restored);
      }
      return route.fulfill({
        status: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ok: true }),
      });
    }

    if (method === "DELETE") {
      const productId = pathname.split("/").at(-1);
      const index = berkeTrash.findIndex((item) => item.id === productId);
      if (index >= 0) {
        berkeTrash.splice(index, 1);
      }
      return route.fulfill({ status: 204, body: "" });
    }

    return route.continue();
  });

  await page.route("**/owners/kaan/trash*", async (route) => {
    await route.fulfill({
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [], total: 0 }),
    });
  });

  page.on("dialog", (dialog) => dialog.accept());

  await page.goto("/");
  await page.getByPlaceholder("https://www.trendyol.com/...").fill(seedUrl);
  await page.getByRole("button", { name: /^ekle$/i }).click();

  await page.getByRole("link", { name: /ürünler \/ kaan/i }).click();
  await page.getByPlaceholder("https://www.trendyol.com/...").fill(seedUrl);
  await page.getByRole("button", { name: /^ekle$/i }).click();

  await page.getByRole("link", { name: /ürünler \/ berke/i }).click();
  await page.getByRole("button", { name: /^sil$/i }).click();
  await page.getByRole("link", { name: /çöp kutusu/i }).click();
  await expect(page.getByText(/oversize hoodie/i)).toBeVisible();

  await page.getByRole("button", { name: /geri yükle/i }).click();
  await page.getByRole("link", { name: /ürünler \/ berke/i }).click();
  await page.getByRole("button", { name: /^sil$/i }).click();
  await page.getByRole("link", { name: /çöp kutusu/i }).click();
  await page.getByRole("button", { name: /kalıcı sil/i }).click();

  await page.getByRole("link", { name: /ürünler \/ kaan/i }).click();
  await expect(page.getByText(/oversize hoodie/i)).toBeVisible();
});
