# Trendyol PDP Price Parser Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Trendyol tracking persist the visible PDP price by preferring `__envoy__PROPS.product` over JSON-LD fallback data.

**Architecture:** Extend the scraper with a dedicated envoy-props parser that maps PDP state into `ParsedProduct`. Keep the old fixture DOM parser for tests and synthetic fixtures, and demote JSON-LD to the final fallback. Cover the regression with focused parser and integration tests.

**Tech Stack:** TypeScript, Cheerio, Vitest, SQLite-backed D1 test doubles

---

### Task 1: Add envoy-props parser support

**Files:**
- Modify: `apps/api/src/modules/scraping/parseTrendyolProduct.ts`

- [ ] **Step 1: Write the failing parser test**

Add a parser test that includes both envoy props and misleading JSON-LD, and expect the envoy price.

- [ ] **Step 2: Run parser test to verify it fails**

Run: `pnpm --filter @trendyol-etsy/api test -- --run apps/api/tests/unit/parseTrendyolProduct.test.ts`
Expected: FAIL on price/value assertions.

- [ ] **Step 3: Implement envoy-props parsing**

Read `window["__envoy__PROPS"]`, map price, variants, images, attributes, brand, and category into `ParsedProduct`, and make it the primary parser stage.

- [ ] **Step 4: Run parser tests to verify they pass**

Run: `pnpm --filter @trendyol-etsy/api test -- --run apps/api/tests/unit/parseTrendyolProduct.test.ts`
Expected: PASS.

### Task 2: Cover persisted tracking behavior

**Files:**
- Modify: `apps/api/tests/integration/addTrackedProduct.test.ts`

- [ ] **Step 1: Add a regression integration case**

Seed a tracked product from envoy-props HTML that also contains misleading JSON-LD and assert that `product_current_state.current_price` matches the PDP state.

- [ ] **Step 2: Run the integration test to verify it fails first**

Run: `pnpm --filter @trendyol-etsy/api test -- --run apps/api/tests/integration/addTrackedProduct.test.ts`
Expected: FAIL before the parser change, PASS after.

- [ ] **Step 3: Re-run focused API tests**

Run: `pnpm --filter @trendyol-etsy/api test -- --run apps/api/tests/unit/parseTrendyolProduct.test.ts apps/api/tests/integration/addTrackedProduct.test.ts apps/api/tests/integration/processRefreshJob.test.ts`
Expected: PASS.
