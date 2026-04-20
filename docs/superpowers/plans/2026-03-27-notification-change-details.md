# Tracking Bildirimlerinde Degisiklik Detayi Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kayitli urun yenilemelerinde fiyat, varyant fiyat, stok, baslik, aciklama ve gorsel degisimlerini bildirim merkezinde okunur `eski -> yeni` detaylariyla gostermek.

**Architecture:** Mevcut `/owners/:ownerKey/notifications` akisi ve `notifications` tablosu korunacak. Degisiklik tespiti ve notification metin uretimi `apps/api/src/modules/sync/diffProductState.ts` icinde merkezilestirilecek; backend yeni detayli `title/body` metinleri uretecek, web tarafi ise mevcut liste komponenti ile bu metinleri gostermeye devam edecek ve uzun govde metinleri icin kucuk bir okunurluk iyilestirmesi alacak.

**Tech Stack:** TypeScript, Vitest, React, React Testing Library, Hono/D1 tabanli API modulleri

---

## Dosya Haritasi

**Modify**
- `apps/api/src/modules/sync/diffProductState.ts:60-235` — notification tipleri, fiyat/stok/icerik notification builder yardimcilari ve diff sirasinda notification uretimi
- `apps/api/tests/unit/diffProductState.test.ts:1-166` — unit seviyesinde notification metni ve tip kapsami
- `apps/api/tests/integration/processRefreshJob.test.ts:1-439` — refresh akisinin notification tablosuna yazdigi detayli kayitlari dogrulama
- `apps/web/src/features/notifications/components/NotificationList.tsx:1-57` — uzun govde metinlerinin daha rahat kirilmasi ve opsiyonel bos durum mesaji

**Create**
- `apps/web/src/features/notifications/components/NotificationList.test.tsx` — notification kartlarinin detayli metni ve gruplanmis gorunumunu dogrulayan regression testi

**Verify**
- `apps/api/package.json` scriptleri uzerinden `pnpm --filter @trendyol-etsy/api test`
- `apps/web/package.json` scriptleri uzerinden `pnpm --filter @trendyol-etsy/web test`
- Gerekirse tum repo icin `pnpm test` ve `pnpm typecheck`

---

### Task 1: API unit testleri ile hedef notification metnini kilitle

**Files:**
- Modify: `apps/api/tests/unit/diffProductState.test.ts:1-166`
- Test: `apps/api/tests/unit/diffProductState.test.ts`

- [ ] **Step 1: Icerik degisimleri icin failing test ekle**

`apps/api/tests/unit/diffProductState.test.ts` icine mevcut `describe("diffProductState", ...)` blogunun altina su testi ekle:

```ts
it("creates detailed notifications for title, description, and image changes", () => {
  const result = diffProductState(
    createPreviousSnapshot(),
    {
      productId: "prod_1",
      title: "North Apparel Oversize Hoodie Renewed",
      descriptionRaw: "Soft brushed cotton hoodie with relaxed fit. Yeni sezon kumasi ve yenilenmis kalip.",
      imagesRaw: JSON.stringify([
        "https://cdn.example.com/hoodie-3.jpg",
        "https://cdn.example.com/hoodie-2.jpg",
        "https://cdn.example.com/hoodie-4.jpg",
      ]),
      price: 42990,
      checkedAt: 1_710_000_800_000,
      variants: [
        {
          variantKey: "S-Siyah",
          option1: "S",
          option2: "Siyah",
          option3: null,
          stockState: "IN_STOCK",
          price: 42990,
          rawPayload: {},
        },
        {
          variantKey: "M-Siyah",
          option1: "M",
          option2: "Siyah",
          option3: null,
          stockState: "IN_STOCK",
          price: 42990,
          rawPayload: {},
        },
      ],
    },
  );

  expect(result.notifications).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        type: "TITLE_CHANGED",
        severity: "info",
        title: "Urun basligi degisti",
        body: '"North Apparel Oversize Hoodie" -> "North Apparel Oversize Hoodie Renewed"',
      }),
      expect.objectContaining({
        type: "DESCRIPTION_CHANGED",
        severity: "info",
        title: "Urun aciklamasi guncellendi",
      }),
      expect.objectContaining({
        type: "IMAGES_CHANGED",
        severity: "info",
        title: "Urun gorselleri guncellendi",
        body: "Gorsel sayisi 2 -> 3",
      }),
    ]),
  );
});
```

- [ ] **Step 2: Varyant fiyat ve stok metni icin ikinci failing test ekle**

Ayni test dosyasina su testi ekle:

```ts
it("creates variant-specific price and stock notifications with readable labels", () => {
  const result = diffProductState(
    createPreviousSnapshot(),
    {
      productId: "prod_1",
      title: "North Apparel Oversize Hoodie",
      descriptionRaw: "Soft brushed cotton hoodie with relaxed fit.",
      imagesRaw: JSON.stringify([
        "https://cdn.example.com/hoodie-1.jpg",
        "https://cdn.example.com/hoodie-2.jpg",
      ]),
      price: 39990,
      checkedAt: 1_710_000_900_000,
      variants: [
        {
          variantKey: "S-Siyah",
          option1: "S",
          option2: "Siyah",
          option3: null,
          stockState: "IN_STOCK",
          price: 37990,
          rawPayload: {},
        },
        {
          variantKey: "M-Siyah",
          option1: "M",
          option2: "Siyah",
          option3: null,
          stockState: "OUT_OF_STOCK",
          price: 39990,
          rawPayload: {},
        },
      ],
    },
  );

  expect(result.notifications).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        type: "PRICE_DECREASED",
        title: "Urun fiyati dustu",
        body: "429,90 TL -> 399,90 TL",
      }),
      expect.objectContaining({
        type: "PRICE_DECREASED",
        title: "S / Siyah varyanti fiyati dustu",
        body: "429,90 TL -> 379,90 TL",
      }),
      expect.objectContaining({
        type: "OUT_OF_STOCK",
        title: "M / Siyah varyanti stok disi oldu",
        body: "Stokta -> Stokta degil",
      }),
    ]),
  );
});
```

- [ ] **Step 3: Testleri calistir ve yeni beklentilerin fail ettigini dogrula**

Run:

```bash
pnpm --filter @trendyol-etsy/api test -- diffProductState.test.ts
```

Expected: FAIL. `SyncNotification.type` icinde `TITLE_CHANGED` / `DESCRIPTION_CHANGED` / `IMAGES_CHANGED` olmadigi ve mevcut metinlerin halen Ingilizce/ham sayi oldugu gorulmeli.

- [ ] **Step 4: Mevcut bildirim beklentilerini yeni Turkce formatla guncelle**

Mevcut `creates stock history only when a variant state changes` testindeki notification assertion'ini asagidaki gibi daralt:

```ts
expect(result.notifications).toEqual(
  expect.arrayContaining([
    expect.objectContaining({
      type: "PRICE_DECREASED",
      title: "Urun fiyati dustu",
      body: "429,90 TL -> 399,90 TL",
    }),
    expect.objectContaining({
      type: "PRICE_DECREASED",
      title: "S / Siyah varyanti fiyati dustu",
      body: "429,90 TL -> 399,90 TL",
    }),
    expect.objectContaining({
      type: "PRICE_DECREASED",
      title: "M / Siyah varyanti fiyati dustu",
      body: "429,90 TL -> 399,90 TL",
    }),
    expect.objectContaining({
      type: "OUT_OF_STOCK",
      title: "M / Siyah varyanti stok disi oldu",
      body: "Stokta -> Stokta degil",
    }),
  ]),
);
```

Bu adim yine fail etmelidir; ama implementasyon bitince beklenen ciktinin net spesifikasyonu hazir olur.

- [ ] **Step 5: Unit test degisikliklerini commit et**

```bash
git add apps/api/tests/unit/diffProductState.test.ts
git commit -m "test: define detailed refresh notifications"
```

---

### Task 2: `diffProductState` icinde detayli notification uretimini uygula

**Files:**
- Modify: `apps/api/src/modules/sync/diffProductState.ts:60-235`
- Test: `apps/api/tests/unit/diffProductState.test.ts`

- [ ] **Step 1: Notification tipi ve yardimci imzalarini genislet**

`SyncNotification` tipini ve ust taraftaki yardimci fonksiyon bolumunu su iskeletle guncelle:

```ts
export interface SyncNotification {
  type:
    | "PRICE_INCREASED"
    | "PRICE_DECREASED"
    | "OUT_OF_STOCK"
    | "BACK_IN_STOCK"
    | "PARSE_ERROR"
    | "TITLE_CHANGED"
    | "DESCRIPTION_CHANGED"
    | "IMAGES_CHANGED";
  severity: "info" | "warning";
  title: string;
  body: string;
}

function formatPrice(value: number | null) {
  if (value == null) {
    return "Bos";
  }

  return `${(value / 100).toFixed(2).replace(".", ",")} TL`;
}

function truncateText(value: string | null, maxLength: number, emptyLabel = "Bos") {
  const normalized = normalizeText(value);
  if (!normalized) {
    return emptyLabel;
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 3)}...`;
}

function getVariantLabel(variant: Pick<PreviousVariantSnapshot, "variantKey" | "option1" | "option2" | "option3">) {
  return [variant.option1, variant.option2, variant.option3].filter(Boolean).join(" / ") || variant.variantKey;
}
```

- [ ] **Step 2: Fiyat ve stok builderlarini Turkce, okunur metinle yeniden yaz**

Mevcut `buildPriceNotification` ve `buildStockNotification` fonksiyonlarini asagidaki yapiyla degistir:

```ts
function buildPriceNotification(previousPrice: number, nextPrice: number, variantLabel?: string): SyncNotification {
  const increased = nextPrice > previousPrice;
  return {
    type: increased ? "PRICE_INCREASED" : "PRICE_DECREASED",
    severity: "info",
    title: variantLabel
      ? `${variantLabel} varyanti fiyati ${increased ? "artti" : "dustu"}`
      : `Urun fiyati ${increased ? "artti" : "dustu"}`,
    body: `${formatPrice(previousPrice)} -> ${formatPrice(nextPrice)}`,
  };
}

function formatStockState(value: "IN_STOCK" | "OUT_OF_STOCK") {
  return value === "IN_STOCK" ? "Stokta" : "Stokta degil";
}

function buildStockNotification(
  previousStockState: "IN_STOCK" | "OUT_OF_STOCK",
  nextStockState: "IN_STOCK" | "OUT_OF_STOCK",
  variantLabel: string,
): SyncNotification {
  const outOfStock = nextStockState === "OUT_OF_STOCK";
  return {
    type: outOfStock ? "OUT_OF_STOCK" : "BACK_IN_STOCK",
    severity: outOfStock ? "warning" : "info",
    title: outOfStock ? `${variantLabel} varyanti stok disi oldu` : `${variantLabel} varyanti yeniden stokta`,
    body: `${formatStockState(previousStockState)} -> ${formatStockState(nextStockState)}`,
  };
}
```

- [ ] **Step 3: Icerik degisimleri icin yeni builderlari ekle**

Ayni dosyada `normalizeJson` altina su fonksiyonlari ekle:

```ts
function buildTitleChangedNotification(previousTitle: string | null, nextTitle: string): SyncNotification {
  return {
    type: "TITLE_CHANGED",
    severity: "info",
    title: "Urun basligi degisti",
    body: `"${truncateText(previousTitle, 80)}" -> "${truncateText(nextTitle, 80)}"`,
  };
}

function buildDescriptionChangedNotification(previousDescription: string | null, nextDescription: string | null): SyncNotification {
  return {
    type: "DESCRIPTION_CHANGED",
    severity: "info",
    title: "Urun aciklamasi guncellendi",
    body: `"${truncateText(previousDescription, 120, "Aciklama yok")}" -> "${truncateText(nextDescription, 120, "Aciklama yok")}"`,
  };
}

function summarizeImageChange(previousImagesRaw: string | null, nextImagesRaw: string): string {
  try {
    const previousImages = previousImagesRaw ? (JSON.parse(previousImagesRaw) as string[]) : [];
    const nextImages = JSON.parse(nextImagesRaw) as string[];

    if (previousImages.length !== nextImages.length) {
      return `Gorsel sayisi ${previousImages.length} -> ${nextImages.length}`;
    }

    if (previousImages[0] !== nextImages[0]) {
      return "Kapak gorseli degisti";
    }

    return "Gorsel listesi guncellendi";
  } catch {
    return "Gorsel listesi guncellendi";
  }
}

function buildImagesChangedNotification(previousImagesRaw: string | null, nextImagesRaw: string): SyncNotification {
  return {
    type: "IMAGES_CHANGED",
    severity: "info",
    title: "Urun gorselleri guncellendi",
    body: summarizeImageChange(previousImagesRaw, nextImagesRaw),
  };
}
```

- [ ] **Step 4: Diff akisinda notification push noktalarini ekle/guncelle**

`diffProductState` icindeki ilgili bloklari asagidaki davranisla degistir:

```ts
if (normalizeText(previous.title) !== normalizeText(incoming.title)) {
  contentHistory.push({
    fieldKey: "TITLE",
    previousValueRaw: previous.title,
    newValueRaw: incoming.title,
    changedAt: incoming.checkedAt,
  });
  changedFields.add("TITLE");
  notifications.push(buildTitleChangedNotification(previous.title, incoming.title));
}

if (normalizeText(previous.descriptionRaw) !== normalizeText(incoming.descriptionRaw)) {
  contentHistory.push({
    fieldKey: "DESCRIPTION",
    previousValueRaw: previous.descriptionRaw,
    newValueRaw: incoming.descriptionRaw,
    changedAt: incoming.checkedAt,
  });
  changedFields.add("DESCRIPTION");
  notifications.push(buildDescriptionChangedNotification(previous.descriptionRaw, incoming.descriptionRaw));
}

if (normalizeJson(previous.imagesRaw) !== normalizeJson(incoming.imagesRaw)) {
  contentHistory.push({
    fieldKey: "IMAGES",
    previousValueRaw: previous.imagesRaw,
    newValueRaw: incoming.imagesRaw,
    changedAt: incoming.checkedAt,
  });
  changedFields.add("IMAGES");
  notifications.push(buildImagesChangedNotification(previous.imagesRaw, incoming.imagesRaw));
}

if (previous.currentState.currentPrice !== incoming.price && previous.currentState.currentPrice !== null) {
  notifications.push(buildPriceNotification(previous.currentState.currentPrice, incoming.price));
}

for (const variant of incoming.variants) {
  const previousVariant = previousVariants.get(variant.variantKey);
  if (!previousVariant) {
    continue;
  }

  const variantLabel = getVariantLabel(previousVariant);

  if (previousVariant.currentPrice !== variant.price) {
    priceHistory.push({
      variantId: previousVariant.id,
      previousPrice: previousVariant.currentPrice,
      newPrice: variant.price,
      changedAt: incoming.checkedAt,
      changeReason: "VARIANT_PRICE_CHANGED",
    });
    changedFields.add("VARIANT_PRICE");

    if (previousVariant.currentPrice !== null) {
      notifications.push(buildPriceNotification(previousVariant.currentPrice, variant.price, variantLabel));
    }
  }

  if (previousVariant.currentStockState !== variant.stockState) {
    stockHistory.push({
      variantId: previousVariant.id,
      previousStockState: previousVariant.currentStockState,
      newStockState: variant.stockState,
      changedAt: incoming.checkedAt,
    });
    changedFields.add("VARIANT_STOCK");
    notifications.push(buildStockNotification(previousVariant.currentStockState, variant.stockState, variantLabel));
  }
}
```

- [ ] **Step 5: Hedef unit testleri calistir, gecirdikten sonra commit et**

Run:

```bash
pnpm --filter @trendyol-etsy/api test -- diffProductState.test.ts
```

Expected: PASS. Yeni testler `TITLE_CHANGED`, `DESCRIPTION_CHANGED`, `IMAGES_CHANGED` notification'larini ve Turkce fiyat/stok govdelerini dogrulamali.

Commit:

```bash
git add apps/api/src/modules/sync/diffProductState.ts apps/api/tests/unit/diffProductState.test.ts
git commit -m "feat: add detailed refresh notifications"
```

---

### Task 3: Refresh integration testleriyle DB'ye yazilan notification kayitlarini dogrula

**Files:**
- Modify: `apps/api/tests/integration/processRefreshJob.test.ts:1-439`
- Test: `apps/api/tests/integration/processRefreshJob.test.ts`

- [ ] **Step 1: Icerik degisimlerinde notification tablosunu kontrol eden failing integration test ekle**

`writes TITLE, DESCRIPTION, and IMAGES history rows only for changed content` testinin hemen altina su testi ekle:

```ts
it("writes detailed content notifications for refresh changes", async () => {
  const { env, sqlite } = createTestEnv();
  const seeded = await createTrackedProduct(
    env,
    { trendyolUrl: "https://www.trendyol.com/north-apparel/oversize-hoodie-p-123?merchantId=1" },
    {
      fetchImpl: async () => new Response(basicProductHtml, { status: 200 }),
      now: new Date("2026-03-20T00:00:00.000Z"),
    },
  );

  await processRefreshJob(
    env,
    { productId: seeded.product.id },
    {
      source: "MANUAL",
      fetchImpl: async () => new Response(changedContentHtml, { status: 200 }),
      now: new Date("2026-03-20T01:00:00.000Z"),
    },
  );

  const notifications = sqlite
    .prepare("select type, severity, title, body from notifications where product_id = ? order by created_at asc, id asc")
    .all(seeded.product.id) as Array<{ type: string; severity: string; title: string; body: string }>;

  expect(notifications).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ type: "TITLE_CHANGED", title: "Urun basligi degisti" }),
      expect.objectContaining({ type: "DESCRIPTION_CHANGED", title: "Urun aciklamasi guncellendi" }),
      expect.objectContaining({ type: "IMAGES_CHANGED", title: "Urun gorselleri guncellendi", body: "Kapak gorseli degisti" }),
    ]),
  );
});
```

- [ ] **Step 2: Product ve varyant fiyat notification'larini DB seviyesinde kilitleyen ikinci failing test ekle**

`writes variant price history rows with refresh audit links when a variant price changes` testinin altina su testi ekle:

```ts
it("stores readable product and variant price notifications after refresh", async () => {
  const { env, sqlite } = createTestEnv();
  const seeded = await createTrackedProduct(
    env,
    { trendyolUrl: "https://www.trendyol.com/erkugo/bogumlu-kahve-bardagi-borosilikat-sunum-bardagi-isi-dayanikli-bardak-350-ml-bubblecup-p-859521469" },
    {
      fetchImpl: async () => new Response(envoyWinnerPriceHtml, { status: 200 }),
      now: new Date("2026-03-20T00:00:00.000Z"),
    },
  );

  await processRefreshJob(
    env,
    { productId: seeded.product.id },
    {
      source: "MANUAL",
      fetchImpl: async () => new Response(envoyWinnerPriceRaisedHtml, { status: 200 }),
      now: new Date("2026-03-20T01:00:00.000Z"),
    },
  );

  const notifications = sqlite
    .prepare("select type, title, body from notifications where product_id = ? order by created_at asc, id asc")
    .all(seeded.product.id) as Array<{ type: string; title: string; body: string }>;

  expect(notifications).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        type: "PRICE_INCREASED",
        title: "Urun fiyati artti",
        body: "49,90 TL -> 59,90 TL",
      }),
      expect.objectContaining({
        type: "PRICE_INCREASED",
        title: "1163720857 varyanti fiyati artti",
        body: "49,90 TL -> 59,90 TL",
      }),
    ]),
  );
});
```

- [ ] **Step 3: Parse hata regression'ini aynen korudugunu dogrula ve gerekiyorsa assertion'i daralt**

Mevcut `marks parse failures without deleting the product` testini yeniden calistirinca yeni tip genislemesinin parse hata yolunu etkilemedigini gormelisin. Bu testte ek kod yazmana gerek yok; yalnizca mevcut assertion'in su hali korudugunu teyit et:

```ts
expect(response.notifications[0].type).toBe("PARSE_ERROR");
expect(notifications).toEqual([{ type: "PARSE_ERROR", severity: "warning" }]);
```

Bu adim fail etmezse dosyada kod degisikligi yapma; regression korumasi yeterli.

- [ ] **Step 4: API integration testlerini gecir ve commit et**

Run:

```bash
pnpm --filter @trendyol-etsy/api test -- processRefreshJob.test.ts
```

Expected: PASS. `notifications` tablosunda icerik ve fiyat/stok degisimleri icin okunur `title/body` kayitlari bulunmali.

Commit:

```bash
git add apps/api/tests/integration/processRefreshJob.test.ts
git commit -m "test: verify stored refresh notification details"
```

---

### Task 4: Notification listesi icin web regression testi ve kucuk okunurluk iyilestirmesi ekle

**Files:**
- Modify: `apps/web/src/features/notifications/components/NotificationList.tsx:1-57`
- Create: `apps/web/src/features/notifications/components/NotificationList.test.tsx`
- Test: `apps/web/src/features/notifications/components/NotificationList.test.tsx`

- [ ] **Step 1: NotificationList icin failing render testi yaz**

`apps/web/src/features/notifications/components/NotificationList.test.tsx` dosyasini olustur ve su icerikle baslat:

```tsx
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { NotificationList } from "./NotificationList";

describe("NotificationList", () => {
  it("renders grouped detailed notifications", () => {
    render(
      <NotificationList
        items={[
          {
            id: "notif_1",
            productId: "prod_1",
            type: "PRICE_DECREASED",
            severity: "info",
            title: "Urun fiyati dustu",
            body: "429,90 TL -> 399,90 TL",
            readAt: null,
            createdAt: Date.parse("2026-03-20T10:00:00.000Z"),
          },
          {
            id: "notif_2",
            productId: "prod_1",
            type: "OUT_OF_STOCK",
            severity: "warning",
            title: "M / Siyah varyanti stok disi oldu",
            body: "Stokta -> Stokta degil",
            readAt: null,
            createdAt: Date.parse("2026-03-20T10:01:00.000Z"),
          },
        ]}
      />,
    );

    expect(screen.getByText("Uyarilar")).toBeInTheDocument();
    expect(screen.getByText("Bilgilendirmeler")).toBeInTheDocument();
    expect(screen.getByText("429,90 TL -> 399,90 TL")).toBeInTheDocument();
    expect(screen.getByText("Stokta -> Stokta degil")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Bos liste davranisini da kilitleyen ikinci test ekle**

Ayni dosyaya su testi ekle:

```tsx
it("renders empty state when there are no notifications", () => {
  render(<NotificationList items={[]} />);

  expect(screen.getByText("Henuz degisiklik bildirimi yok.")).toBeInTheDocument();
});
```

Bu test su an fail etmelidir; mevcut komponent bos durumda hicbir sey donmuyor.

- [ ] **Step 3: NotificationList komponentini bos durum ve govde kirilimi icin guncelle**

`apps/web/src/features/notifications/components/NotificationList.tsx` icini asagidaki degisikliklerle guncelle:

```tsx
export function NotificationList({ items }: NotificationListProps) {
  if (items.length === 0) {
    return (
      <section className="rounded-[28px] border border-dashed border-slate-300 bg-white px-6 py-10 text-center shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Henuz degisiklik bildirimi yok.</h2>
        <p className="mt-2 text-sm text-slate-500">Kayitli urunleri yenilediginde burada degisen alanlari goreceksin.</p>
      </section>
    );
  }

  const groups = {
    warning: items.filter((item) => item.severity === "warning"),
    info: items.filter((item) => item.severity !== "warning"),
  };

  return (
    <div className="space-y-6">
      {(Object.keys(groups) as Array<keyof typeof groups>).map((severity) => {
        const groupItems = groups[severity];
        const meta = severityMeta[severity];

        if (groupItems.length === 0) {
          return null;
        }

        return (
          <section key={severity} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">{meta.title}</h2>
            <div className="mt-5 space-y-3">
              {groupItems.map((item) => (
                <article key={item.id} className={`rounded-2xl border p-4 ${meta.itemClass}`}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-slate-900">{item.title}</h3>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${meta.badgeClass}`}>
                      {item.type}
                    </span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-600">{item.body}</p>
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Web testlerini calistir ve gerekli ise metin kodlamasini duzelt**

Run:

```bash
pnpm --filter @trendyol-etsy/web test -- NotificationList.test.tsx
```

Expected: PASS. Eğer `Uyarilar` / `Bilgilendirmeler` metinlerinde encoding sorunlari varsa ayni dosyada ASCII Turkce yazimla (`Uyarilar`, `Bilgilendirmeler`) sabitle.

- [ ] **Step 5: Web notification polish degisikliklerini commit et**

```bash
git add apps/web/src/features/notifications/components/NotificationList.tsx apps/web/src/features/notifications/components/NotificationList.test.tsx
git commit -m "feat: improve notification list readability"
```

---

### Task 5: Son dogrulama ve handoff

**Files:**
- Verify only: `apps/api/src/modules/sync/diffProductState.ts`, `apps/api/tests/unit/diffProductState.test.ts`, `apps/api/tests/integration/processRefreshJob.test.ts`, `apps/web/src/features/notifications/components/NotificationList.tsx`, `apps/web/src/features/notifications/components/NotificationList.test.tsx`

- [ ] **Step 1: API ve web hedef testlerini birlikte calistir**

Run:

```bash
pnpm --filter @trendyol-etsy/api test -- diffProductState.test.ts processRefreshJob.test.ts
pnpm --filter @trendyol-etsy/web test -- NotificationList.test.tsx
```

Expected: PASS. API tarafinda detayli notification metinleri, web tarafinda ise bos durum + govde render dogrulanmali.

- [ ] **Step 2: Tip denetimini calistir**

Run:

```bash
pnpm --filter @trendyol-etsy/api typecheck
pnpm --filter @trendyol-etsy/web typecheck
```

Expected: PASS. `SyncNotification.type` genislemesi ve yeni test dosyasi type hata uretmemeli.

- [ ] **Step 3: Tum repo test gecisini kontrol et**

Run:

```bash
pnpm test
```

Expected: PASS. Yeni notification metni mevcut baska testlerde kirmaya neden olmamali.

- [ ] **Step 4: Bildirim merkezini manuel smoke test et**

Su akisi kontrol et:

```text
1. Bir urunu kaydet.
2. HTML fixture veya gercek yenileme ile fiyat / baslik / gorsel degisikligi olustur.
3. /owners/berke/notifications ekranini ac.
4. Kartta degisimin title ve body olarak okunur geldigini dogrula.
5. Bos owner veya degisikliksiz owner icin bos durum kartinin gorundugunu dogrula.
```

Beklenen sonuc: Kartlar `eski -> yeni` mantigini acikca gostermeli; warning ve info gruplari korunmali.

- [ ] **Step 5: Son degisiklikleri tek bir handoff commit'i ile tamamla**

```bash
git add apps/api/src/modules/sync/diffProductState.ts apps/api/tests/unit/diffProductState.test.ts apps/api/tests/integration/processRefreshJob.test.ts apps/web/src/features/notifications/components/NotificationList.tsx apps/web/src/features/notifications/components/NotificationList.test.tsx
git commit -m "feat: show detailed refresh change notifications"
```

Not: Eger Task 1-4 commit'leri zaten atildiysa, bu adimda yeni degisiklik yoksa commit atlama ve yalnizca `git status` ile temiz calisma agacini dogrula.

---

## Oz-denetim Notlari

- Spec coverage: fiyat, varyant fiyat, stok, baslik, aciklama, gorsel degisimleri; bos durum ve mevcut notification endpoint'ini bozmama kapsandi.
- Placeholder scan: `TBD`, `TODO`, "uygun sekilde" gibi bos ifadeler kullanilmadi; her gorevde somut kod ve komut verildi.
- Type consistency: `SyncNotification.type` genislemesi ile test beklentileri ayni adlari kullaniyor; varyant fiyatlarinda yeni ayri type tanimlanmiyor, mevcut `PRICE_*` tipleri korunuyor.
