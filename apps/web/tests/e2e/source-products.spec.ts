import { expect, test } from "@playwright/test";

import type { SourceProductItem } from "../../src/app/api";

test("source products support same-category drag sort and trash flows", async ({ page }) => {
  const products: SourceProductItem[] = [
    {
      id: "sp_1",
      ownerKey: "berke" as const,
      title: "Birinci urun",
      sourceUrl: "https://example.com/1",
      platform: "etsy",
      notes: null,
      sourceCategory: { id: "cat_textile", name: "Tekstil" },
      sortOrder: 0,
      deletedAt: null,
      deletedReason: null,
      linkedEtsyCount: 0,
    },
    {
      id: "sp_2",
      ownerKey: "berke" as const,
      title: "Ikinci urun",
      sourceUrl: "https://example.com/2",
      platform: "etsy",
      notes: null,
      sourceCategory: { id: "cat_textile", name: "Tekstil" },
      sortOrder: 1,
      deletedAt: null,
      deletedReason: null,
      linkedEtsyCount: 0,
    },
  ];

  const trash: SourceProductItem[] = [
    {
      id: "sp_restore",
      ownerKey: "berke" as const,
      title: "Geri yuklenecek urun",
      sourceUrl: "https://example.com/restore",
      platform: "etsy",
      notes: null,
      sourceCategory: null,
      sortOrder: null,
      deletedAt: Date.now(),
      deletedReason: "user",
      linkedEtsyCount: 0,
    },
    {
      id: "sp_delete",
      ownerKey: "berke" as const,
      title: "Kalici silinecek urun",
      sourceUrl: "https://example.com/delete",
      platform: "etsy",
      notes: null,
      sourceCategory: null,
      sortOrder: null,
      deletedAt: Date.now(),
      deletedReason: "user",
      linkedEtsyCount: 0,
    },
  ];

  const resequence = () => {
    products.forEach((item, index) => {
      item.sortOrder = index;
    });
  };
  await page.route("**/owners/*/products/refresh-runs/active", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ run: null }),
    });
  });

  await page.route("**/owners/berke/categories*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: [] }),
    });
  });

  await page.route("**/owners/berke/products*", async (route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();

    if (method === "GET" && url.pathname === "/owners/berke/products") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          summary: { trackedCount: 0, activeCount: 0, reviewNeededCount: 0 },
          items: [],
          filters: {},
        }),
      });
      return;
    }

    await route.continue();
  });

  let categoriesLoaded = false;
  let sourceProductsLoaded = false;
  let reorderRequested = false;

  await page.route("**/owners/berke/source-product-categories", async (route) => {
    categoriesLoaded = true;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: [{ id: "cat_textile", name: "Tekstil" }] }),
    });
  });

  await page.context().route("**/owners/berke/source-products/reorder", async (route) => {
    reorderRequested = true;
    const rawBody = route.request().postData() ?? "{}";
    const body = JSON.parse(rawBody) as { orderedIds?: string[] };
    const orderedIds = body.orderedIds ?? [];
    const reordered = orderedIds.map((id, index) => {
      const item = products.find((candidate) => candidate.id === id);
      if (item) {
        item.sortOrder = index;
      }
      return item;
    });
    products.splice(0, products.length, ...reordered.filter(Boolean) as typeof products);
    resequence();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ orderedIds }),
    });
  });

  await page.route("**/owners/berke/source-products**", async (route) => {
    if (route.request().resourceType() === "document") {
      await route.continue();
      return;
    }

    const url = new URL(route.request().url());
    const method = route.request().method();

    if (method === "GET" && url.pathname === "/owners/berke/source-products") {
      sourceProductsLoaded = true;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: products,
          filters: {},
        }),
      });
      return;
    }

    if (method === "PATCH" && url.pathname === "/owners/berke/source-products/reorder") {
      reorderRequested = true;
      const rawBody = route.request().postData() ?? "{}";
      const body = JSON.parse(rawBody) as { orderedIds?: string[] };
      const orderedIds = body.orderedIds ?? [];
      const reordered = orderedIds.map((id, index) => {
        const item = products.find((candidate) => candidate.id === id);
        if (item) {
          item.sortOrder = index;
        }
        return item;
      });
      products.splice(0, products.length, ...reordered.filter(Boolean) as typeof products);
      resequence();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ orderedIds }),
      });
      return;
    }

    if (method === "DELETE" && url.pathname === "/owners/berke/source-products/sp_1") {
      const index = products.findIndex((item) => item.id === "sp_1");
      if (index >= 0) {
        const [deleted] = products.splice(index, 1);
        trash.unshift({ ...deleted, deletedAt: Date.now(), deletedReason: "user", sortOrder: null });
        resequence();
      }
      await route.fulfill({ status: 204, body: "" });
      return;
    }

    if (method === "GET" && url.pathname === "/owners/berke/source-products/trash") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: trash, total: trash.length }),
      });
      return;
    }

    if (method === "POST" && url.pathname === "/owners/berke/source-products/sp_restore/restore") {
      const index = trash.findIndex((item) => item.id === "sp_restore");
      if (index >= 0) {
        const [restored] = trash.splice(index, 1);
        products.push({ ...restored, deletedAt: null, deletedReason: null, sortOrder: products.length });
        resequence();
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
      return;
    }

    if (method === "DELETE" && url.pathname === "/owners/berke/source-products/sp_delete/permanent") {
      const index = trash.findIndex((item) => item.id === "sp_delete");
      if (index >= 0) {
        trash.splice(index, 1);
      }
      await route.fulfill({ status: 204, body: "" });
      return;
    }

    if (method === "GET" && url.pathname.startsWith("/owners/berke/source-products/")) {
      const productId = url.pathname.split("/").at(-1);
      const item = products.find((candidate) => candidate.id === productId);
      if (item) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            sourceProduct: { ...item, createdAt: Date.now(), updatedAt: Date.now(), deletedReason: null },
            linkedEtsyItems: [],
          }),
        });
        return;
      }
    }

    await route.continue();
  });

  await page.goto("/");
  await page.getByRole("link", { name: /kaynak ürünler/i }).click();
  await expect.poll(() => categoriesLoaded).toBe(true);
  await expect.poll(() => sourceProductsLoaded).toBe(true);
  await expect(page.getByRole("heading", { name: "Tekstil" })).toBeVisible();
  await expect(page.getByText("Birinci urun")).toBeVisible();
  await expect(page.getByText("Ikinci urun")).toBeVisible();

  const firstHandle = page.getByLabel("Sırala Birinci urun");
  const secondHandle = page.getByLabel("Sırala Ikinci urun");
  const firstBox = await firstHandle.boundingBox();
  const secondBox = await secondHandle.boundingBox();
  expect(firstBox).not.toBeNull();
  expect(secondBox).not.toBeNull();
  if (!firstBox || !secondBox) {
    throw new Error("Sürükleme tutacakları bulunamadı");
  }

  await page.mouse.move(firstBox.x + firstBox.width / 2, firstBox.y + firstBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(secondBox.x + secondBox.width / 2, secondBox.y + secondBox.height / 2, { steps: 12 });
  await page.mouse.up();
  await expect.poll(() => reorderRequested).toBe(true);
  await expect.poll(() => products.map((item) => item.id).join(",")).toBe("sp_2,sp_1");

  await page.getByRole("link", { name: "Kaynak Ürün Çöp Kutusu" }).click();
  await expect(page.getByText("Geri yuklenecek urun")).toBeVisible();

  await page
    .locator("article", { hasText: "Geri yuklenecek urun" })
    .getByRole("button", { name: "Geri yükle" })
    .click();
  await expect.poll(() => trash.some((item) => item.id === "sp_restore")).toBeFalsy();

  await page
    .locator("article", { hasText: "Kalici silinecek urun" })
    .getByRole("button", { name: "Kalıcı sil" })
    .click();
  await expect.poll(() => trash.some((item) => item.id === "sp_delete")).toBeFalsy();
});
