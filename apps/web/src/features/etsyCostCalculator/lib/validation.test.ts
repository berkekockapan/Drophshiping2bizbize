import { describe, expect, it } from "vitest";

import { createDefaultDraft } from "./defaults";
import { validateDraft } from "./validation";

describe("validateDraft", () => {
  it("blocks invalid numeric inputs and preset edge cases", () => {
    const draft = {
      ...createDefaultDraft(),
      usdTryRate: 0,
      salePriceUsd: 30,
      saleDiscountPercent: 100,
      coupon: { type: "fixed_usd" as const, value: 40 },
      overheadMode: "allocated_total" as const,
      overheadExpectedOrderCount: 0,
    };

    expect(validateDraft(draft)).toMatchObject({
      usdTryRate: expect.stringMatching(/USD\/TRY/),
      saleDiscountPercent: expect.stringMatching(/indirim/i),
      coupon: expect.stringMatching(/kupon/i),
      overheadExpectedOrderCount: expect.stringMatching(/siparis/i),
    });
  });

  it("describes manual duty as a gumruk vergisi rate", () => {
    expect(
      validateDraft({
        ...createDefaultDraft(),
        destinationProfile: "US",
        manualDutyPercent: 101,
      }),
    ).toMatchObject({
      manualDutyPercent: expect.stringMatching(/gumruk vergisi/i),
    });
  });
});