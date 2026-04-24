import { describe, expect, it } from "vitest";

import { ETSY_TR_PROFILE_VERSION, createDefaultCalculatorStorage } from "./defaults";

describe("etsy cost calculator defaults", () => {
  it("builds the approved Etsy TR storage seed", () => {
    const storage = createDefaultCalculatorStorage();

    expect(storage.version).toBe(1);
    expect(storage.profileVersion).toBe(ETSY_TR_PROFILE_VERSION);
    expect(storage.draft.vatMode).toBe("no_vat_id");
    expect(storage.draft.targetProfitMode).toBe("net_profit_usd");
    expect(storage.draft.currencyConversionEnabled).toBe(true);
    expect(storage.draft.offsiteAdsMode).toBe("off");
    expect(storage.presets).toEqual([]);
  });
});
