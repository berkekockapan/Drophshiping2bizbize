# ShipEntegra Quick Form Import Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ABD quick formunda gercek tasima maliyeti ile gumruk vergisi oranini tek manuel ithalat girdileri olarak birakip ShipEntegra ithalat masrafini cekirdek hesap motoruna ve UI'a yerlestirmek.

**Architecture:** Mevcut `calculateScenario()` motoru korunacak ama ABD ithalat etkisi artik tek satirlik `duty` mantigi yerine ShipEntegra matrahi + gumruk vergisi + sabit `%15` ek vergi + tek helper dosyasinda yalitilmis tasiyici islem bedeli olarak uretilecek. UI tarafinda quick form, sonuc paneli ve ucret dokumu ayni `ScenarioSnapshot` alanlarini okuyacak; boylece import bloklari, breakdown ve net kar hesaplari ayni kaynaktan beslenecek.

**Tech Stack:** TypeScript, React 19, TanStack Query, Vitest, React Testing Library, Playwright, Tailwind CSS

---

> **Research correction (2026-03-30):** Resmi ShipEntegra public kaynaklari, public hesaplayicinin yalnizca `general_duty` ve `additional_duty` dondurdugunu; UI tarafinin ise toplam sonucu `+ Tasiyici Islem Bedeli` olarak ayri gosterdigini ve bu bedelin "uygulanmakta olan ucret politikasi ve hizmet kosullarina bagli olarak farklilik gosterdigini" belirtmektedir. Yani public kaynaklarda dogrulanmis sabit bir tasiyici islem bedeli yoktur. Buna ragmen bu plan, kullanici talebine gore ilk surumde tasiyici islem bedelini **is kurali olarak** `1 USD` sabit kabul eder ve bunu tek helper dosyasinda yalitir. Resmi bir ShipEntegra kaynak baglandiginda yalnizca bu helper ve ilgili testler degistirilecektir.

## Scope Check

Bu spec tek bir alt sistemi anlatiyor: `apps/web/src/features/etsyCostCalculator` icindeki quick mode hesap ve sunum akisi. Ayrica ayri bir backend, storage migrasyonu veya yeni manuel draft alani gerektirmedigi icin tek plan olarak tutuldu.

**Uygulama varsayimi:** Spec tasiyici islem bedeli icin resmi public sayisal bir deger vermiyor. Bu plan, kullanici talebine gore ilk surum davranisini `shipentegraImportBasisUsd > 0 ? 1 : 0` USD olarak sabitler ve bunu tek helper fonksiyonunda izole eder. Is kurali degisirse yalnizca helper + ilgili testler guncellenir.

## File Structure / Responsibility Map

### Create
- `apps/web/src/features/etsyCostCalculator/lib/calculateShipentegraCarrierFee.ts` - ShipEntegra tasiyici islem bedeli kuralini tek yerde tutar.
- `apps/web/src/features/etsyCostCalculator/lib/calculateShipentegraCarrierFee.test.ts` - sabit `1 USD` carrier fee davranisini ve sifir/negatif guard'larini kilitler.

### Modify
- `apps/web/src/features/etsyCostCalculator/lib/types.ts` - yeni ShipEntegra ara degerlerini `ScenarioSnapshot` icine ekler.
- `apps/web/src/features/etsyCostCalculator/lib/calculateScenario.ts` - yeni ithalat matrahini, alt kalemleri, warning metnini ve operasyonel toplam formulunu uretir.
- `apps/web/src/features/etsyCostCalculator/lib/calculateScenario.test.ts` - ABD senaryosunda yeni alt kalemleri ve toplamlari dogrular.
- `apps/web/src/features/etsyCostCalculator/lib/buildQuickModeViewModel.test.ts` - quick mode'un yeni ShipEntegra alanlarini yukariya tasidigini kilitler.
- `apps/web/src/features/etsyCostCalculator/lib/groupBreakdownRows.ts` - yeni ithalat satirlarini operasyonel maliyet grubuna alir.
- `apps/web/src/features/etsyCostCalculator/lib/groupBreakdownRows.test.ts` - breakdown gruplarinin yeni satirlari dogru sirada gosterdigini dogrular.
- `apps/web/src/features/etsyCostCalculator/lib/validation.ts` - `manualDutyPercent` icin kullaniciya gosterilen metni yeni anlami ile uyumlu yapar.
- `apps/web/src/features/etsyCostCalculator/lib/validation.test.ts` - gumruk vergisi orani hata metnini kilitler.
- `apps/web/src/features/etsyCostCalculator/components/QuickModeForm.tsx` - yeni etiket, yardim metni ve ShipEntegra ithalat ozet blogunu render eder.
- `apps/web/src/features/etsyCostCalculator/components/QuickModeForm.test.tsx` - ABD profilinde yeni label ve ozet blogunun gorundugunu test eder.
- `apps/web/src/features/etsyCostCalculator/components/ResultsPanel.tsx` - gercek tasima maliyeti ile ShipEntegra ithalat masrafini ayri gosterir.
- `apps/web/src/features/etsyCostCalculator/components/ResultsPanel.test.tsx` - sonuc panelindeki yeni maliyet satirlarini dogrular.
- `apps/web/src/features/etsyCostCalculator/components/FeeBreakdownTable.tsx` - yeni ShipEntegra satirlari icin help copy ekler.
- `apps/web/src/features/etsyCostCalculator/components/FeeBreakdownTable.test.tsx` - yeni alt kalemlerin render edildigini kilitler.
- `apps/web/src/features/etsyCostCalculator/hooks/useEtsyCostCalculatorState.test.tsx` - quick mode / grouped breakdown entegrasyonunu dogrular.
- `apps/web/src/features/etsyCostCalculator/routes/EtsyCostCalculatorPage.tsx` - quick form'a aktif ShipEntegra preview senaryosunu baglar.
- `apps/web/src/features/etsyCostCalculator/routes/EtsyCostCalculatorPage.test.tsx` - sayfa seviyesinde yeni quick form blogunu ve etiketleri dogrular.
- `apps/web/tests/e2e/etsy-cost-calculator.spec.ts` - kullanici akisinda yeni ShipEntegra modeli gorunur mu diye kontrol eder.

---

### Task 1: Model ShipEntegra import math inside the calculator core

**Files:**
- Create: `apps/web/src/features/etsyCostCalculator/lib/calculateShipentegraCarrierFee.ts`
- Create: `apps/web/src/features/etsyCostCalculator/lib/calculateShipentegraCarrierFee.test.ts`
- Modify: `apps/web/src/features/etsyCostCalculator/lib/types.ts`
- Modify: `apps/web/src/features/etsyCostCalculator/lib/calculateScenario.ts`
- Modify: `apps/web/src/features/etsyCostCalculator/lib/calculateScenario.test.ts`
- Modify: `apps/web/src/features/etsyCostCalculator/lib/buildQuickModeViewModel.test.ts`
- Modify: `apps/web/src/features/etsyCostCalculator/lib/validation.ts`
- Modify: `apps/web/src/features/etsyCostCalculator/lib/validation.test.ts`

- [ ] **Step 1: Write the failing model tests**

```ts
import { describe, expect, it } from "vitest";

import { calculateShipentegraCarrierFee } from "./calculateShipentegraCarrierFee";

describe("calculateShipentegraCarrierFee", () => {
  it("returns zero for non-positive basis and a fixed 1 USD fee for positive basis", () => {
    expect(calculateShipentegraCarrierFee(0)).toBe(0);
    expect(calculateShipentegraCarrierFee(-8)).toBe(0);
    expect(calculateShipentegraCarrierFee(12)).toBe(1);
  });
});
```

```ts
it("models ShipEntegra import costs as separate operational rows for US scenarios", () => {
  const result = calculateScenario({
    ...createDefaultDraft(),
    usdTryRate: 40,
    destinationProfile: "US",
    salePriceUsd: 50,
    saleDiscountPercent: 20,
    coupon: { type: "fixed_usd", value: 4 },
    manualDutyPercent: 10,
    valueSources: { duty: "manual_override" },
    productCost: { amount: 18, currency: "USD" },
    actualShippingCost: { amount: 5, currency: "USD" },
    packagingCost: { amount: 1, currency: "USD" },
    shipentegraOperationCost: { amount: 2, currency: "USD" },
  });

  expect(result.shipentegraImportBasisUsd).toBe(36);
  expect(result.shipentegraDutyUsd).toBe(3.6);
  expect(result.shipentegraAdditionalDutyUsd).toBe(5.4);
  expect(result.shipentegraCarrierFeeUsd).toBe(1);
  expect(result.shipentegraImportTotalUsd).toBe(10);
  expect(result.totalOperationalCostsUsd).toBe(36);
  expect(result.breakdown.find((row) => row.key === "us_duty_fee")?.label).toBe("ShipEntegra gumruk vergisi");
  expect(result.breakdown.find((row) => row.key === "shipentegra_additional_duty_fee")?.amountUsd).toBe(5.4);
  expect(result.breakdown.find((row) => row.key === "shipentegra_carrier_fee")?.amountUsd).toBe(1);
  expect(result.breakdown.find((row) => row.key === "shipentegra_import_total")?.amountUsd).toBe(10);
  expect(result.warnings.find((warning) => warning.key === "shipentegra_import")?.message).toMatch(/ShipEntegra ithalat modeli/i);
});
```

```ts
expect(view.recommendedScenario?.shipentegraImportBasisUsd).toBe(41.59);
expect(view.recommendedScenario?.shipentegraDutyUsd).toBe(4.16);
expect(view.recommendedScenario?.shipentegraAdditionalDutyUsd).toBe(6.24);
expect(view.recommendedScenario?.shipentegraCarrierFeeUsd).toBe(1);
expect(view.recommendedScenario?.shipentegraImportTotalUsd).toBe(11.4);
expect(view.enteredPriceScenario?.shipentegraImportTotalUsd).toBe(9.28);
```

```ts
expect(validateDraft({
  ...createDefaultDraft(),
  destinationProfile: "US",
  manualDutyPercent: 101,
})).toMatchObject({
  manualDutyPercent: expect.stringMatching(/gumruk vergisi/i),
});
```

- [ ] **Step 2: Run the focused model tests and confirm they fail**

Run:

```bash
pnpm --filter @trendyol-etsy/web exec vitest run src/features/etsyCostCalculator/lib/calculateShipentegraCarrierFee.test.ts src/features/etsyCostCalculator/lib/calculateScenario.test.ts src/features/etsyCostCalculator/lib/buildQuickModeViewModel.test.ts src/features/etsyCostCalculator/lib/validation.test.ts
```

Expected: FAIL with missing helper module, missing `shipentegra*` snapshot fields, and outdated duty validation copy.

- [ ] **Step 3: Implement the new ShipEntegra helper, snapshot fields, and core math**

```ts
const FIXED_SHIPENTEGRA_CARRIER_FEE_USD = 1;

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateShipentegraCarrierFee(shipentegraImportBasisUsd: number) {
  return shipentegraImportBasisUsd > 0 ? round2(FIXED_SHIPENTEGRA_CARRIER_FEE_USD) : 0;
}
```

```ts
export interface ScenarioSnapshot {
  listedSalePriceUsd?: number;
  discountedSalePriceUsd?: number;
  productRevenueUsd?: number;
  collectedShippingUsd?: number;
  collectedExtrasUsd?: number;
  totalCollectedUsd?: number;
  dutyBaseUsd?: number;
  shipentegraImportBasisUsd: number;
  shipentegraDutyUsd: number;
  shipentegraAdditionalDutyUsd: number;
  shipentegraCarrierFeeUsd: number;
  shipentegraImportTotalUsd: number;
  normalizedRevenueUsd: number;
  normalizedRevenueTry: number;
  totalEtsyFeesUsd: number;
  totalEtsyFeesTry: number;
  totalOperationalCostsUsd: number;
  totalOperationalCostsTry: number;
  netProfitUsd: number;
  netProfitTry: number;
  netMarginPercent: number;
  breakdown: BreakdownRow[];
  warnings: ScenarioWarning[];
}
```

```ts
import { calculateShipentegraCarrierFee } from "./calculateShipentegraCarrierFee";

const shipentegraImportBasisUsd = draft.destinationProfile === "US" ? productRevenueUsd : 0;
const shipentegraDutyUsd =
  shipentegraImportBasisUsd > 0 && appliedDutyPercent > 0
    ? round2(shipentegraImportBasisUsd * (appliedDutyPercent / 100))
    : 0;
const shipentegraAdditionalDutyUsd =
  shipentegraImportBasisUsd > 0 ? round2(shipentegraImportBasisUsd * 0.15) : 0;
const shipentegraCarrierFeeUsd =
  draft.destinationProfile === "US" ? calculateShipentegraCarrierFee(shipentegraImportBasisUsd) : 0;
const shipentegraImportTotalUsd = round2(
  shipentegraDutyUsd + shipentegraAdditionalDutyUsd + shipentegraCarrierFeeUsd,
);

const operationalCostsUsd = round2(
  toUsd(draft.productCost, draft.usdTryRate) +
    toUsd(draft.actualShippingCost, draft.usdTryRate) +
    toUsd(draft.packagingCost, draft.usdTryRate) +
    toUsd(draft.shipentegraOperationCost, draft.usdTryRate) +
    shipentegraDutyUsd +
    shipentegraAdditionalDutyUsd +
    shipentegraCarrierFeeUsd +
    draft.customCosts.filter((line) => line.enabled).reduce((sum, line) => sum + toUsd(line.value, draft.usdTryRate), 0) +
    resolveOverheadUsd(draft),
);

if (draft.destinationProfile === "US" && shipentegraImportTotalUsd > 0) {
  warnings.push({
    key: "shipentegra_import",
    message:
      typeof draft.resolvedDutyPercent === "number"
        ? "ShipEntegra ithalat modeli secili profil ile uygulandi; matrah indirim ve kupon sonrasi urun geliridir."
        : "ShipEntegra ithalat modeli hizli formdaki gumruk vergisi orani ile uygulandi; matrah indirim ve kupon sonrasi urun geliridir.",
  });
}

if (draft.destinationProfile === "US" && shipentegraImportTotalUsd > 0) {
  breakdown.push(
    {
      key: "us_duty_fee",
      label: "ShipEntegra gumruk vergisi",
      amountUsd: shipentegraDutyUsd,
      amountTry: toTry(shipentegraDutyUsd, draft.usdTryRate),
      sourceType:
        draft.valueSources.duty ?? (typeof draft.resolvedDutyPercent === "number" ? "analysis_selected" : "manual_override"),
      note:
        typeof draft.resolvedDutyPercent === "number"
          ? "Secili profil oranina gore hesaplandi; matrah indirim ve kupon sonrasi urun geliridir."
          : "Hizli formdaki gumruk vergisi orani ile hesaplandi; matrah indirim ve kupon sonrasi urun geliridir.",
    },
    {
      key: "shipentegra_additional_duty_fee",
      label: "ShipEntegra ek vergi (%15)",
      amountUsd: shipentegraAdditionalDutyUsd,
      amountTry: toTry(shipentegraAdditionalDutyUsd, draft.usdTryRate),
      sourceType: "system_default",
      note: "Turkiye cikisli gonderiler icin sabit %15 ek vergi.",
    },
    {
      key: "shipentegra_carrier_fee",
      label: "ShipEntegra tasiyici islem bedeli",
      amountUsd: shipentegraCarrierFeeUsd,
      amountTry: toTry(shipentegraCarrierFeeUsd, draft.usdTryRate),
      sourceType: "system_default",
      note: "Ilk surumde kullanici is kurali ile sabitlenen 1 USD tasiyici islem bedeli.",
    },
    {
      key: "shipentegra_import_total",
      label: "ShipEntegra toplam ithalat masrafi",
      amountUsd: shipentegraImportTotalUsd,
      amountTry: toTry(shipentegraImportTotalUsd, draft.usdTryRate),
      sourceType: "system_default",
      note: "Gumruk vergisi + ek vergi + tasiyici islem bedeli toplami.",
    },
  );
}

return {
  listedSalePriceUsd,
  discountedSalePriceUsd,
  productRevenueUsd,
  collectedShippingUsd,
  collectedExtrasUsd,
  totalCollectedUsd,
  dutyBaseUsd: shipentegraImportBasisUsd,
  shipentegraImportBasisUsd,
  shipentegraDutyUsd,
  shipentegraAdditionalDutyUsd,
  shipentegraCarrierFeeUsd,
  shipentegraImportTotalUsd,
  normalizedRevenueUsd: totalCollectedUsd,
  normalizedRevenueTry: revenueTry,
  totalEtsyFeesUsd,
  totalEtsyFeesTry: toTry(totalEtsyFeesUsd, draft.usdTryRate),
  totalOperationalCostsUsd: operationalCostsUsd,
  totalOperationalCostsTry: toTry(operationalCostsUsd, draft.usdTryRate),
  netProfitUsd,
  netProfitTry,
  netMarginPercent: totalCollectedUsd > 0 ? round2((netProfitUsd / totalCollectedUsd) * 100) : 0,
  breakdown,
  warnings,
};
```

```ts
if (draft.manualDutyPercent < 0 || draft.manualDutyPercent > 100) {
  errors.manualDutyPercent = "Gumruk vergisi orani %0 ile %100 arasinda olmali.";
}
```

- [ ] **Step 4: Re-run the focused model tests**

Run:

```bash
pnpm --filter @trendyol-etsy/web exec vitest run src/features/etsyCostCalculator/lib/calculateShipentegraCarrierFee.test.ts src/features/etsyCostCalculator/lib/calculateScenario.test.ts src/features/etsyCostCalculator/lib/buildQuickModeViewModel.test.ts src/features/etsyCostCalculator/lib/validation.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/etsyCostCalculator/lib/calculateShipentegraCarrierFee.ts apps/web/src/features/etsyCostCalculator/lib/calculateShipentegraCarrierFee.test.ts apps/web/src/features/etsyCostCalculator/lib/types.ts apps/web/src/features/etsyCostCalculator/lib/calculateScenario.ts apps/web/src/features/etsyCostCalculator/lib/calculateScenario.test.ts apps/web/src/features/etsyCostCalculator/lib/buildQuickModeViewModel.test.ts apps/web/src/features/etsyCostCalculator/lib/validation.ts apps/web/src/features/etsyCostCalculator/lib/validation.test.ts
git commit -m "feat: model shipentegra import costs in calculator core"
```

### Task 2: Surface ShipEntegra import rows in breakdown and result summaries

**Files:**
- Modify: `apps/web/src/features/etsyCostCalculator/lib/groupBreakdownRows.ts`
- Modify: `apps/web/src/features/etsyCostCalculator/lib/groupBreakdownRows.test.ts`
- Modify: `apps/web/src/features/etsyCostCalculator/components/ResultsPanel.tsx`
- Modify: `apps/web/src/features/etsyCostCalculator/components/ResultsPanel.test.tsx`
- Modify: `apps/web/src/features/etsyCostCalculator/components/FeeBreakdownTable.tsx`
- Modify: `apps/web/src/features/etsyCostCalculator/components/FeeBreakdownTable.test.tsx`
- Modify: `apps/web/src/features/etsyCostCalculator/hooks/useEtsyCostCalculatorState.test.tsx`

- [ ] **Step 1: Write the failing presentation tests**

```ts
it("keeps ShipEntegra import rows inside operational costs in stable order", () => {
  const snapshot = calculateScenario({
    ...createDefaultDraft(),
    destinationProfile: "US",
    manualDutyPercent: 11,
    valueSources: { duty: "manual_override" },
    salePriceUsd: 52,
  });

  const groups = groupBreakdownRows(snapshot);
  const operationalRows = groups[2]?.rows.map((row) => row.key) ?? [];

  expect(groups.map((group) => group.key)).toEqual(["revenue", "etsy_fees", "operational_costs", "summary"]);
  expect(operationalRows).toEqual(
    expect.arrayContaining([
      "actual_shipping_cost",
      "us_duty_fee",
      "shipentegra_additional_duty_fee",
      "shipentegra_carrier_fee",
      "shipentegra_import_total",
    ]),
  );
  expect(operationalRows.indexOf("shipentegra_import_total")).toBeGreaterThan(operationalRows.indexOf("shipentegra_carrier_fee"));
});
```

```tsx
const recommendedScenario: ScenarioSnapshot = {
  listedSalePriceUsd: 49.63,
  discountedSalePriceUsd: 44.67,
  productRevenueUsd: 44.67,
  collectedShippingUsd: 0,
  collectedExtrasUsd: 0,
  totalCollectedUsd: 44.67,
  dutyBaseUsd: 44.67,
  shipentegraImportBasisUsd: 44.67,
  shipentegraDutyUsd: 4.47,
  shipentegraAdditionalDutyUsd: 6.7,
  shipentegraCarrierFeeUsd: 1,
  shipentegraImportTotalUsd: 12.17,
  normalizedRevenueUsd: 60,
  normalizedRevenueTry: 2400,
  totalEtsyFeesUsd: 11.65,
  totalEtsyFeesTry: 466,
  totalOperationalCostsUsd: 28,
  totalOperationalCostsTry: 1120,
  netProfitUsd: 20.35,
  netProfitTry: 814,
  netMarginPercent: 33.92,
  warnings: [{ key: "recommended_warning", message: "Onerilen senaryo uyarisi." }],
  breakdown: [
    { key: "actual_shipping_cost", label: "Gercek tasima maliyeti", amountUsd: 5, amountTry: 200, sourceType: "manual_override" },
  ],
};

const enteredScenario: ScenarioSnapshot = {
  listedSalePriceUsd: 39,
  discountedSalePriceUsd: 35.1,
  productRevenueUsd: 33.1,
  collectedShippingUsd: 4,
  collectedExtrasUsd: 1,
  totalCollectedUsd: 38.1,
  dutyBaseUsd: 33.1,
  shipentegraImportBasisUsd: 33.1,
  shipentegraDutyUsd: 3.31,
  shipentegraAdditionalDutyUsd: 4.97,
  shipentegraCarrierFeeUsd: 1,
  shipentegraImportTotalUsd: 9.28,
  normalizedRevenueUsd: 48,
  normalizedRevenueTry: 1920,
  totalEtsyFeesUsd: 9.4,
  totalEtsyFeesTry: 376,
  totalOperationalCostsUsd: 23,
  totalOperationalCostsTry: 920,
  netProfitUsd: 15.6,
  netProfitTry: 624,
  netMarginPercent: 32.5,
  warnings: [{ key: "negative_profit", message: "Bu senaryoda net kar negatife dusuyor." }],
  breakdown: [
    { key: "actual_shipping_cost", label: "Gercek tasima maliyeti", amountUsd: 5, amountTry: 200, sourceType: "manual_override" },
  ],
};

expect(screen.getByText(/gercek tasima maliyeti/i)).toBeInTheDocument();
expect(screen.getByText(/shipentegra ithalat masrafi/i)).toBeInTheDocument();
expect(screen.getByText(/\$11\.28/i)).toBeInTheDocument();
```

```tsx
render(
  <FeeBreakdownTable
    groups={[
      {
        key: "operational_costs",
        label: "Operasyonel maliyetler",
        rows: [
          {
            key: "shipentegra_additional_duty_fee",
            label: "ShipEntegra ek vergi (%15)",
            formattedUsd: "$5.40",
            formattedTry: "216,00 ₺",
            badgeLabel: "Sistem",
            note: "Turkiye cikisli gonderiler icin sabit %15 ek vergi.",
          },
          {
            key: "shipentegra_carrier_fee",
            label: "ShipEntegra tasiyici islem bedeli",
            formattedUsd: "$1.00",
            formattedTry: "40,00 ₺",
            badgeLabel: "Sistem",
          },
          {
            key: "shipentegra_import_total",
            label: "ShipEntegra toplam ithalat masrafi",
            formattedUsd: "$10.00",
            formattedTry: "400,00 ₺",
            badgeLabel: "Sistem",
          },
        ],
      },
    ]}
  />,
);

expect(screen.getByText(/shipentegra ek vergi/i)).toBeInTheDocument();
expect(screen.getByText(/shipentegra tasiyici islem bedeli/i)).toBeInTheDocument();
expect(screen.getByText(/shipentegra toplam ithalat masrafi/i)).toBeInTheDocument();
expect(screen.getAllByRole("button", { name: /yardim/i }).length).toBeGreaterThan(0);
```

```ts
expect(result.current.quickMode.recommendedScenario?.shipentegraImportTotalUsd).toBe(11.4);
expect(result.current.analysisBreakdownGroups.flatMap((group) => group.rows.map((row) => row.key))).toContain("shipentegra_import_total");
```

- [ ] **Step 2: Run the focused presentation tests and confirm they fail**

Run:

```bash
pnpm --filter @trendyol-etsy/web exec vitest run src/features/etsyCostCalculator/lib/groupBreakdownRows.test.ts src/features/etsyCostCalculator/components/ResultsPanel.test.tsx src/features/etsyCostCalculator/components/FeeBreakdownTable.test.tsx src/features/etsyCostCalculator/hooks/useEtsyCostCalculatorState.test.tsx
```

Expected: FAIL because the grouped breakdown and summary panels do not yet know about the new ShipEntegra rows.

- [ ] **Step 3: Update grouped breakdown logic, result summary copy, and help text**

```ts
function isOperationalCostKey(key: string) {
  return (
    key === "product_cost" ||
    key === "actual_shipping_cost" ||
    key === "packaging_cost" ||
    key === "shipentegra_operation_cost" ||
    key === "us_duty_fee" ||
    key === "shipentegra_additional_duty_fee" ||
    key === "shipentegra_carrier_fee" ||
    key === "shipentegra_import_total" ||
    key.startsWith("custom_cost_") ||
    key === "overhead_cost"
  );
}

export function groupBreakdownRows(snapshot: ScenarioSnapshot): BreakdownGroup[] {
  const rows = formatBreakdown(snapshot.breakdown);
  const revenueRows = createRevenueRows(snapshot as SnapshotPresentationFields);
  const etsyFeeRows = rows.filter((row) => isEtsyFeeKey(row.key));
  const operationalCostRows = rows.filter((row) => isOperationalCostKey(row.key));

  return [
    { key: "revenue", label: "Gelir", rows: revenueRows },
    { key: "etsy_fees", label: "Etsy ucretleri", rows: etsyFeeRows },
    { key: "operational_costs", label: "Operasyonel maliyetler", rows: operationalCostRows },
    { key: "summary", label: "Sonuc ozeti", rows: [createSummaryRow(snapshot)] },
  ] as unknown as BreakdownGroup[];
}
```

```tsx
function getBreakdownAmount(snapshot: ScenarioSnapshot | null, key: string) {
  return snapshot?.breakdown.find((row) => row.key === key)?.amountUsd ?? 0;
}

const actualShippingCostUsd = getBreakdownAmount(activeScenario, "actual_shipping_cost");

<div className="mt-4 rounded-2xl border border-slate-100 p-4 text-sm text-slate-700">
  <p className="font-semibold text-slate-900">Toplam gider ozeti</p>
  <p className="mt-2">Toplam tahsilat: {formatUsd(revenueMetrics.totalCollectedUsd)}</p>
  <p>Urun geliri: {formatUsd(revenueMetrics.productRevenueUsd)}</p>
  <p>Gercek tasima maliyeti: {formatUsd(actualShippingCostUsd)}</p>
  <p>ShipEntegra ithalat masrafi: {formatUsd(activeScenario?.shipentegraImportTotalUsd ?? 0)}</p>
  <p>Toplam Etsy ucreti: {formatUsd(activeScenario?.totalEtsyFeesUsd ?? 0)}</p>
  <p>Toplam operasyonel maliyet: {formatUsd(activeScenario?.totalOperationalCostsUsd ?? 0)}</p>
  <p>Toplam gider: {formatUsd((activeScenario?.totalOperationalCostsUsd ?? 0) + (activeScenario?.totalEtsyFeesUsd ?? 0))}</p>
</div>
```

```ts
const HELP_COPY: Record<string, string> = {
  total_collected: "Musteriden toplanan toplam tutar.",
  product_revenue: "Urun satisindan gelen gelir.",
  actual_shipping_cost: "Siparis icin gercek odenen tasima maliyeti.",
  us_duty_fee: "ShipEntegra modelindeki gumruk vergisi tutari.",
  shipentegra_additional_duty_fee: "Turkiye cikisli gonderiler icin sabit %15 ek vergi tutari.",
  shipentegra_carrier_fee: "Ilk surum icin kullanici is kurali ile sabitlenen 1 USD tasiyici islem bedeli.",
  shipentegra_import_total: "Gumruk vergisi, ek vergi ve tasiyici islem bedelinin toplami.",
  summary_net_profit: "Tum giderlerden sonra elinde kalan net kazanc.",
  overhead_cost: "Siparis basina dagitilan genel gider payi.",
};
```

- [ ] **Step 4: Re-run the focused presentation tests**

Run:

```bash
pnpm --filter @trendyol-etsy/web exec vitest run src/features/etsyCostCalculator/lib/groupBreakdownRows.test.ts src/features/etsyCostCalculator/components/ResultsPanel.test.tsx src/features/etsyCostCalculator/components/FeeBreakdownTable.test.tsx src/features/etsyCostCalculator/hooks/useEtsyCostCalculatorState.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/etsyCostCalculator/lib/groupBreakdownRows.ts apps/web/src/features/etsyCostCalculator/lib/groupBreakdownRows.test.ts apps/web/src/features/etsyCostCalculator/components/ResultsPanel.tsx apps/web/src/features/etsyCostCalculator/components/ResultsPanel.test.tsx apps/web/src/features/etsyCostCalculator/components/FeeBreakdownTable.tsx apps/web/src/features/etsyCostCalculator/components/FeeBreakdownTable.test.tsx apps/web/src/features/etsyCostCalculator/hooks/useEtsyCostCalculatorState.test.tsx
git commit -m "feat: show shipentegra import breakdown in summary panels"
```

### Task 3: Render the ShipEntegra quick-form summary and wire page/e2e coverage

**Files:**
- Modify: `apps/web/src/features/etsyCostCalculator/components/QuickModeForm.tsx`
- Modify: `apps/web/src/features/etsyCostCalculator/components/QuickModeForm.test.tsx`
- Modify: `apps/web/src/features/etsyCostCalculator/routes/EtsyCostCalculatorPage.tsx`
- Modify: `apps/web/src/features/etsyCostCalculator/routes/EtsyCostCalculatorPage.test.tsx`
- Modify: `apps/web/tests/e2e/etsy-cost-calculator.spec.ts`

- [ ] **Step 1: Write the failing quick-form and page tests**

```tsx
const preview = calculateScenario({
  ...createDefaultDraft(),
  usdTryRate: 40,
  destinationProfile: "US",
  salePriceUsd: 50,
  saleDiscountPercent: 20,
  coupon: { type: "fixed_usd", value: 4 },
  manualDutyPercent: 10,
});

render(
  <QuickModeForm
    draft={{ ...createDefaultDraft(), destinationProfile: "US" }}
    shipentegraPreview={preview}
    validationErrors={{}}
    salePriceLabel="Opsiyonel satis fiyati (USD)"
    salePriceRequired={false}
    onChange={onChange}
  />,
);

expect(screen.getByRole("spinbutton", { name: /gumruk vergisi orani \(%\)/i })).toBeInTheDocument();
expect(screen.getByText(/shipentegra ithalat masrafi/i)).toBeInTheDocument();
expect(screen.getByText(/ek vergi tutari \(%15\)/i)).toBeInTheDocument();
expect(screen.getByText(/toplam ithalat masrafi: \$10\.00/i)).toBeInTheDocument();
```

```tsx
renderWithProviders(<EtsyCostCalculatorPage />, {
  route: "/etsy-cost-calculator?ownerKey=berke&productId=prod_1",
});

const user = userEvent.setup();
await user.click(await screen.findByRole("button", { name: /abd hedef profili/i }));

expect(screen.getByRole("spinbutton", { name: /gumruk vergisi orani \(%\)/i })).toBeInTheDocument();
expect(screen.getByText(/shipentegra ithalat masrafi/i)).toBeInTheDocument();
expect(screen.getByText(/tasiyici islem bedeli/i)).toBeInTheDocument();
```

```ts
await page.getByRole("button", { name: /abd hedef profili/i }).click();
await expect(page.getByLabel(/gumruk vergisi orani \(%\)/i)).toBeVisible();
await expect(page.getByText(/shipentegra ithalat masrafi/i)).toBeVisible();
await expect(page.getByText(/ek vergi tutari \(%15\)/i)).toBeVisible();
await expect(page.getByText(/shipentegra toplam ithalat masrafi/i)).toBeVisible();
await expect(page.getByText(/gercek tasima maliyeti/i)).toBeVisible();
```

- [ ] **Step 2: Run the focused quick-form tests and confirm they fail**

Run:

```bash
pnpm --filter @trendyol-etsy/web exec vitest run src/features/etsyCostCalculator/components/QuickModeForm.test.tsx src/features/etsyCostCalculator/routes/EtsyCostCalculatorPage.test.tsx
pnpm --filter @trendyol-etsy/web exec playwright test -c ../../playwright.config.ts tests/e2e/etsy-cost-calculator.spec.ts
```

Expected: FAIL because the quick form still uses the old manual-duty copy and does not render an inline ShipEntegra summary card.

- [ ] **Step 3: Add the inline ShipEntegra summary block and page wiring**

```tsx
import type { CalculatorDraft, ScenarioSnapshot } from "../lib/types";

function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

export function QuickModeForm({
  draft,
  shipentegraPreview,
  validationErrors,
  salePriceLabel,
  salePriceRequired,
  onChange,
}: {
  draft: CalculatorDraft;
  shipentegraPreview: ScenarioSnapshot | null;
  validationErrors: Record<string, string>;
  salePriceLabel: string;
  salePriceRequired: boolean;
  onChange: (patch: Partial<CalculatorDraft>) => void;
}) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold text-slate-900">Hizli fiyat formu</p>

      {draft.destinationProfile === "US" ? (
        <>
          <label className="grid gap-2 text-sm text-slate-700">
            <span className="inline-flex items-center gap-2">
              Gumruk vergisi orani (%)
              <HelpTooltip
                label="Gumruk vergisi orani"
                description="ShipEntegra ithalat modelindeki tek manuel ithalat degiskeni budur. Matrah indirim sonrasi urun fiyatidir."
              />
            </span>
            <input
              aria-label="Gumruk vergisi orani (%)"
              aria-invalid={Boolean(validationErrors.manualDutyPercent)}
              type="number"
              min={0}
              max={100}
              step="0.01"
              value={draft.manualDutyPercent}
              onChange={(event) => onChange({ manualDutyPercent: Number(event.target.value) })}
              className="rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-[#F1641E]"
            />
          </label>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">ShipEntegra ithalat masrafi</p>
            <p className="mt-2">Matrah (indirim sonrasi urun fiyati): {formatUsd(shipentegraPreview?.shipentegraImportBasisUsd ?? 0)}</p>
            <p>Gumruk vergisi tutari: {formatUsd(shipentegraPreview?.shipentegraDutyUsd ?? 0)}</p>
            <p>Ek vergi tutari (%15): {formatUsd(shipentegraPreview?.shipentegraAdditionalDutyUsd ?? 0)}</p>
            <p>Tasiyici islem bedeli: {formatUsd(shipentegraPreview?.shipentegraCarrierFeeUsd ?? 0)}</p>
            <p className="font-medium text-slate-900">Toplam ithalat masrafi: {formatUsd(shipentegraPreview?.shipentegraImportTotalUsd ?? 0)}</p>
          </div>
        </>
      ) : null}

      <MoneyInputField
        label="Gercek tasima maliyeti"
        value={draft.actualShippingCost}
        onChange={(value) => onChange({ actualShippingCost: value })}
      />
    </section>
  );
}
```

```tsx
const quickFormPreview =
  activeTab === "analyze_price"
    ? calculator.quickMode.enteredPriceScenario ?? calculator.quickMode.recommendedScenario ?? calculator.result
    : calculator.quickMode.recommendedScenario ?? calculator.result;

<QuickModeForm
  draft={calculator.draft}
  shipentegraPreview={quickFormPreview}
  validationErrors={calculator.validationErrors}
  salePriceLabel={activeTab === "analyze_price" ? "Mevcut satis fiyati (USD)" : "Opsiyonel satis fiyati (USD)"}
  salePriceRequired={activeTab === "analyze_price"}
  onChange={calculator.updateDraft}
/>
```

- [ ] **Step 4: Re-run the quick-form/page tests and the focused E2E flow**

Run:

```bash
pnpm --filter @trendyol-etsy/web exec vitest run src/features/etsyCostCalculator/components/QuickModeForm.test.tsx src/features/etsyCostCalculator/routes/EtsyCostCalculatorPage.test.tsx
pnpm --filter @trendyol-etsy/web exec playwright test -c ../../playwright.config.ts tests/e2e/etsy-cost-calculator.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/etsyCostCalculator/components/QuickModeForm.tsx apps/web/src/features/etsyCostCalculator/components/QuickModeForm.test.tsx apps/web/src/features/etsyCostCalculator/routes/EtsyCostCalculatorPage.tsx apps/web/src/features/etsyCostCalculator/routes/EtsyCostCalculatorPage.test.tsx apps/web/tests/e2e/etsy-cost-calculator.spec.ts
git commit -m "feat: add shipentegra import preview to quick form"
```

---

## Self-Review Checklist

- **Spec coverage:** Quick form label degisikligi, inline ShipEntegra ozeti, `%15` ek vergi, kullanici is kurali ile sabitlenen `1 USD` carrier fee helper'i, sonuc paneli, ucret dokumu ve e2e dogrulamasi gorevlere dagitildi.
- **Placeholder scan:** `TBD`, `TODO`, "uygun sekilde" veya bos tanimli adim birakilmadi; numeric carrier fee varsayimi acikca sabitlendi.
- **Type consistency:** `shipentegraImportBasisUsd`, `shipentegraDutyUsd`, `shipentegraAdditionalDutyUsd`, `shipentegraCarrierFeeUsd`, `shipentegraImportTotalUsd` isimleri tum gorevlerde ayni kullanildi.

## Final Verification

- [ ] Run: `pnpm --filter @trendyol-etsy/web exec vitest run src/features/etsyCostCalculator/lib/calculateShipentegraCarrierFee.test.ts src/features/etsyCostCalculator/lib/calculateScenario.test.ts src/features/etsyCostCalculator/lib/buildQuickModeViewModel.test.ts src/features/etsyCostCalculator/lib/groupBreakdownRows.test.ts src/features/etsyCostCalculator/lib/validation.test.ts src/features/etsyCostCalculator/hooks/useEtsyCostCalculatorState.test.tsx src/features/etsyCostCalculator/components/QuickModeForm.test.tsx src/features/etsyCostCalculator/components/ResultsPanel.test.tsx src/features/etsyCostCalculator/components/FeeBreakdownTable.test.tsx src/features/etsyCostCalculator/routes/EtsyCostCalculatorPage.test.tsx`
- [ ] Run: `pnpm --filter @trendyol-etsy/web typecheck`
- [ ] Run: `pnpm --filter @trendyol-etsy/web exec playwright test -c ../../playwright.config.ts tests/e2e/etsy-cost-calculator.spec.ts`
- [ ] Manual check: ABD quick formunda `Gumruk vergisi orani (%)` input'u ve `ShipEntegra ithalat masrafi` blogu birlikte gorunuyor mu?
- [ ] Manual check: Sonuc paneli `Gercek tasima maliyeti` ile `ShipEntegra ithalat masrafi`ni ayni senaryodan okuyup ayri gosteriyor mu?
- [ ] Manual check: Ucret dokumu operasyonel maliyetler grubunda `ShipEntegra gumruk vergisi`, `ShipEntegra ek vergi (%15)`, `ShipEntegra tasiyici islem bedeli` ve `ShipEntegra toplam ithalat masrafi` satirlari var mi?
