import { describe, expect, it } from "vitest";

import { calculateShipentegraCarrierFee } from "./calculateShipentegraCarrierFee";

describe("calculateShipentegraCarrierFee", () => {
  it("returns zero for non-positive basis and a fixed 1 USD fee for positive basis", () => {
    expect(calculateShipentegraCarrierFee(0)).toBe(0);
    expect(calculateShipentegraCarrierFee(-8)).toBe(0);
    expect(calculateShipentegraCarrierFee(12)).toBe(1);
  });
});
