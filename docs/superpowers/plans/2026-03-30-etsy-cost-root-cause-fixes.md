# Etsy Cost Root Cause Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hýzlý fiyat formundaki ABD duty, sonuç paneli ve ücret dökümü hesaplarýný açýklanabilir ve tutarlý hale getirmek.

**Architecture:** Tek hesap motoru korunacak; ancak gelir tabaný, ithalat/duty tabaný ve sunum katmaný daha net ayrýlacak. Çekirdek senaryo motoru yeni ara toplamlarý üretecek, grouped breakdown ve sonuç paneli bu ara toplamlarý tutarlý biçimde gösterecek.

**Tech Stack:** React, TypeScript, Vitest, Playwright, TanStack Query

---

### Task 1: Çekirdek hesap motorunu düzelt

**Files:**
- Modify: `C:/Users/berke/Desktop/Projelerim/dropshiping-win/apps/web/src/features/etsyCostCalculator/lib/types.ts`
- Modify: `C:/Users/berke/Desktop/Projelerim/dropshiping-win/apps/web/src/features/etsyCostCalculator/lib/calculateScenario.ts`
- Modify: `C:/Users/berke/Desktop/Projelerim/dropshiping-win/apps/web/src/features/etsyCostCalculator/lib/buildQuickModeViewModel.ts`
- Test: `C:/Users/berke/Desktop/Projelerim/dropshiping-win/apps/web/src/features/etsyCostCalculator/lib/calculateScenario.test.ts`
- Test: `C:/Users/berke/Desktop/Projelerim/dropshiping-win/apps/web/src/features/etsyCostCalculator/lib/buildQuickModeViewModel.test.ts`
- Test: `C:/Users/berke/Desktop/Projelerim/dropshiping-win/apps/web/src/features/etsyCostCalculator/hooks/useEtsyCostCalculatorState.test.tsx`

- [ ] Duty tabanýný `productRevenueUsd` bazýna çek.
- [ ] Senaryoya görünür ara toplamlar ekle: liste fiyatý, indirim sonrasý ürün fiyatý, toplam tahsilat, duty tabaný.
- [ ] Quick mode view modelinde “önerilen liste fiyatý” ile “indirim sonrasý satýþ fiyatý”ný ayrýþtýr.
- [ ] Vitest ile çekirdek matematik beklentilerini güncelle.

### Task 2: Breakdown gruplarýný ve sonuç panelini tutarlý hale getir

**Files:**
- Modify: `C:/Users/berke/Desktop/Projelerim/dropshiping-win/apps/web/src/features/etsyCostCalculator/lib/groupBreakdownRows.ts`
- Modify: `C:/Users/berke/Desktop/Projelerim/dropshiping-win/apps/web/src/features/etsyCostCalculator/components/FeeBreakdownTable.tsx`
- Modify: `C:/Users/berke/Desktop/Projelerim/dropshiping-win/apps/web/src/features/etsyCostCalculator/components/ResultsPanel.tsx`
- Test: `C:/Users/berke/Desktop/Projelerim/dropshiping-win/apps/web/src/features/etsyCostCalculator/lib/groupBreakdownRows.test.ts`
- Test: `C:/Users/berke/Desktop/Projelerim/dropshiping-win/apps/web/src/features/etsyCostCalculator/components/ResultsPanel.test.tsx`
- Test: `C:/Users/berke/Desktop/Projelerim/dropshiping-win/apps/web/src/features/etsyCostCalculator/components/FeeBreakdownTable.test.tsx`

- [ ] Breakdown’ý en azýndan gelir / Etsy ücretleri / operasyonel maliyetler / sonuç özeti olarak ayýr.
- [ ] `us_duty_fee` satýrýný Etsy ücretlerinden çýkarýp ithalat/operasyonel maliyet grubuna taþý.
- [ ] Sonuç panelinde kart baþlýklarýný semantik olarak düzelt: önerilen liste fiyatý, indirim sonrasý satýþ fiyatý, baþa baþ liste fiyatý, tahmini net kâr.
- [ ] Warning alanýný aktif senaryoya baðla.

### Task 3: Sayfa entegrasyonu ve uçtan uca doðrulama

**Files:**
- Modify: `C:/Users/berke/Desktop/Projelerim/dropshiping-win/apps/web/src/features/etsyCostCalculator/routes/EtsyCostCalculatorPage.tsx`
- Test: `C:/Users/berke/Desktop/Projelerim/dropshiping-win/apps/web/src/features/etsyCostCalculator/routes/EtsyCostCalculatorPage.test.tsx`
- Test: `C:/Users/berke/Desktop/Projelerim/dropshiping-win/apps/web/tests/e2e/etsy-cost-calculator.spec.ts`

- [ ] Sonuç paneli ve breakdown’ýn ayný aktif senaryoyu gösterdiðini doðrula.
- [ ] Kullanýcý girdilerinde `%30 indirim + buyer shipping + hedef kâr` akýþýný e2e ile sabitle.
- [ ] `pnpm --filter @trendyol-etsy/web exec vitest run src/features/etsyCostCalculator`
- [ ] `pnpm --filter @trendyol-etsy/web typecheck`
- [ ] `pnpm --filter @trendyol-etsy/web exec playwright test -c ../../playwright.config.ts tests/e2e/etsy-cost-calculator.spec.ts`
