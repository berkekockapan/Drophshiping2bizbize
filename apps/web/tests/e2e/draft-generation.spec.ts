import { expect, test } from "@playwright/test";

test("user generates and manually edits an Etsy draft title", async ({ page }) => {
  let currentTitle = "";
  let generateFieldCalls = 0;

  await page.route("**/products/prod_1", async (route) => {
    await route.fulfill({
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product: {
          id: "prod_1",
          trendyolUrl: "https://www.trendyol.com/example",
          sourceProductId: "123",
          title: "Oversize Hoodie",
          brand: "North Apparel",
          category: "Sweatshirt",
          descriptionRaw: "Yumuþak dokulu oversize hoodie",
          attributes: [{ key: "Kumaþ", value: "Pamuk" }],
          images: [],
          status: "ACTIVE",
          parseStatus: "OK",
          lastCheckedAt: Date.now(),
        },
        currentState: {
          currentPrice: 44990,
          minPrice: 34990,
          maxPrice: 44990,
          inStockVariantCount: 2,
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
    await route.fulfill({
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        summary: {
          trackedCount: 0,
          activeCount: 0,
          reviewNeededCount: 0,
        },
        items: [],
        filters: {},
      }),
    });
  });

  await page.route("**/drafts/prod_1", async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue();
      return;
    }

    await route.fulfill({
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        draft: {
          id: "draft_1",
          productId: "prod_1",
          englishTitle: currentTitle,
          shortDescription: "",
          longDescription: "",
          tags: [],
          materials: [],
          attributes: [],
          seoNotes: null,
          policyNotes: null,
          generatedVersion: 0,
          editedVersion: 0,
          lastGeneratedAt: null,
          manualEditsPresent: false,
        },
        prompt: {
          instructions: "Use 13 tags",
          source: {
            productId: "prod_1",
            productTitle: "Oversize Hoodie",
            brand: "North Apparel",
            category: "Sweatshirt",
            description: "Yumuþak dokulu oversize hoodie",
            attributes: [{ key: "Kumaþ", value: "Pamuk" }],
            variants: [],
          },
          constraints: {
            locale: "en",
            maxTitleLength: 140,
            requiredTagCount: 13,
          },
        },
      }),
    });
  });

  await page.route("http://127.0.0.1:4318/generate", async (route) => {
    await route.fulfill({
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        englishTitle: "Handmade Hoodie for Etsy",
        shortDescription: "Handmade short",
        longDescription: "Handmade long",
        tags: ["handmade", "hoodie"],
        materials: ["cotton"],
        attributes: [{ key: "Fit", value: "Oversize" }],
        seoNotes: "seo",
        policyNotes: "policy",
        model: "mock-v1",
      }),
    });
  });

  await page.route("http://127.0.0.1:4318/generate-field", async (route) => {
    generateFieldCalls += 1;
    await route.fulfill({
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        field: "title",
        value: "Should not be used",
        provider: "mock",
      }),
    });
  });

  await page.route("**/drafts/prod_1/generate", async (route) => {
    const requestBody = route.request().postDataJSON() as {
      generated: {
        englishTitle: string;
        shortDescription: string;
        longDescription: string;
        tags: string[];
        materials: string[];
        attributes: Array<{ key: string; value: string }>;
        seoNotes: string;
        policyNotes: string;
      };
    };

    currentTitle = requestBody.generated.englishTitle;

    await route.fulfill({
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: "draft_1",
        productId: "prod_1",
        englishTitle: currentTitle,
        shortDescription: requestBody.generated.shortDescription,
        longDescription: requestBody.generated.longDescription,
        tags: requestBody.generated.tags,
        materials: requestBody.generated.materials,
        attributes: requestBody.generated.attributes,
        seoNotes: requestBody.generated.seoNotes,
        policyNotes: requestBody.generated.policyNotes,
        generatedVersion: 1,
        editedVersion: 0,
        lastGeneratedAt: Date.now(),
        manualEditsPresent: false,
      }),
    });
  });

  await page.goto("/");
  await page.evaluate((path) => {
    window.history.pushState({}, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, "/products/prod_1/seo");
  await page.getByRole("button", { name: "Baþlýk Üret" }).click();

  await expect(page.getByLabel("English Title")).toHaveValue(/Handmade Hoodie/i);

  await page.getByLabel("English Title").fill("Custom edited title");
  await expect(page.getByText(/Manuel düzenleme var/i)).toBeVisible();
  expect(generateFieldCalls).toBe(0);
});

