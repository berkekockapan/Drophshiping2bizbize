# Trendyol PDP Price Parser Design

**Problem:** Some Trendyol product pages no longer expose the old fixture-style DOM root that our scraper expects. When that happens, the parser falls back to JSON-LD and incorrectly treats `ProductGroup.offers.price` as the product's live sale price.

**Goal:** Read the current PDP price from Trendyol's live page state so tracked products store the real visible price and selected variant information.

## Approach

Add a new parser stage that reads `window["__envoy__PROPS"].product` from the HTML and maps it into the existing `ParsedProduct` shape. This source becomes the primary source for current price and selected variant data because it reflects the rendered PDP state.

Keep the existing fallback chain, but reorder it:

1. `__envoy__PROPS.product`
2. Existing fixture-style DOM parser
3. JSON-LD fallback

## Mapping Rules

- Product price comes from the selected PDP variant price first, then `merchantListing.winnerVariant`.
- Variant rows come from PDP variant arrays, not JSON-LD `hasVariant`.
- Variant key uses `itemNumber` when available, with value labels as options when present.
- Brand, category, images, and attributes are read from the same PDP payload when available.
- JSON-LD remains only as a last-resort metadata fallback.

## Validation

- Add a unit test that reproduces the live regression: envoy props show one selected variant at `89 TL` while JSON-LD advertises `34.99`.
- Keep existing fixture DOM coverage.
- Add an integration test that confirms tracked products persist the PDP price rather than the JSON-LD price.
