# ABD Card & Quick Form Follow-up Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Urun detayinda en uygun ABD onerisi otomatik gosterilsin, kullanici isterse degistirebilsin; hizli fiyat formu indirim ve hedef kar senaryolarini dogrudan girilebilir hale getirsin.

**Architecture:** Backend en iyi recommendation varsa low-confidence durumda bile secili profil tasiyacak; frontend bunu `review_required` uyarisiyla hesapta kullanacak. Hizli form mevcut hesap motorunu degistirmeden `saleDiscountPercent`, `buyerPaidShippingUsd`, `buyerPaidExtrasUsd` ve hedef kar alanlarini acikca expose edecek.

**Tech Stack:** Cloudflare Workers, Hono, D1/SQLite, TypeScript, React 19, TanStack Query, Vitest, Playwright

---

### Task 1: Backend secili ABD profili akisini yumusat

**Files:**
- Modify: `apps/api/src/modules/tariff/analysis/buildTariffRecommendations.ts`
- Modify: `apps/api/src/modules/tracking/buildProductCostContext.ts`
- Test: `apps/api/tests/tariff/tariffServices.test.ts`
- Test: `apps/api/tests/integration/productCostContext.test.ts`

- [ ] En iyi recommendation varsa `selectedProfile` alanina yerlestir.
- [ ] `high_confidence` ise `automatic_confirmed`, `low_confidence + selectedProfile` ise `review_required`, hic profil yoksa `locked` akisini uret.
- [ ] API testlerini calistir.

### Task 2: Urun detayinda ABD kartini goster ve degistirilebilir kil

**Files:**
- Modify: `apps/web/src/features/product/components/ProductCostPanel.tsx`
- Modify: `apps/web/src/features/product/components/ProductTariffPanel.tsx`
- Modify: `apps/web/src/features/product/components/ProductCostPanel.test.tsx`
- Modify: `apps/web/src/features/product/components/ProductTariffPanel.test.tsx`
- Modify: `apps/web/src/features/product/routes/ProductDetailPage.test.tsx`
- Modify: `apps/web/tests/e2e/product-detail-etsy-cost.spec.ts`
- Modify: `apps/web/tests/e2e/product-detail-tariff.spec.ts`

- [ ] `review_required` durumunda ABD kartinda hesap + uyari goster.
- [ ] Manuel secim yoksa GTIP panelinde otomatik oneriyi goster.
- [ ] Kullanici baska recommendation sectiginde kartin guncellendigini test et.

### Task 3: Hizli fiyat formunda indirim ve hedef kar girdilerini ac

**Files:**
- Modify: `apps/web/src/features/etsyCostCalculator/components/QuickModeForm.tsx`
- Modify: `apps/web/src/features/etsyCostCalculator/components/QuickModeForm.test.tsx`
- Modify: `apps/web/src/features/etsyCostCalculator/routes/EtsyCostCalculatorPage.test.tsx`
- Modify: `apps/web/tests/e2e/etsy-cost-calculator.spec.ts`

- [ ] `% indirim`, `musteriden alinan kargo`, `ekstra tahsilat`, `hedef kar modu`, `hedef kar degeri` alanlarini hizli formda belirginlestir.
- [ ] `%30 indirim + 10 USD hedef kar` senaryosunu testlerle dogrula.

### Task 4: Final verification

**Run:**
- `pnpm --filter @trendyol-etsy/api exec vitest run tests/integration/productCostContext.test.ts tests/tariff/tariffServices.test.ts`
- `pnpm --filter @trendyol-etsy/web exec vitest run src/features/product/components/ProductCostPanel.test.tsx src/features/product/components/ProductTariffPanel.test.tsx src/features/product/routes/ProductDetailPage.test.tsx src/features/etsyCostCalculator/components/QuickModeForm.test.tsx src/features/etsyCostCalculator/routes/EtsyCostCalculatorPage.test.tsx`
- `pnpm --filter @trendyol-etsy/web exec playwright test -c ../../playwright.config.ts tests/e2e/etsy-cost-calculator.spec.ts tests/e2e/product-detail-etsy-cost.spec.ts tests/e2e/product-detail-tariff.spec.ts`

