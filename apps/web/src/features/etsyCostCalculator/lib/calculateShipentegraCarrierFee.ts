const FIXED_SHIPENTEGRA_CARRIER_FEE_USD = 1;

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateShipentegraCarrierFee(shipentegraImportBasisUsd: number) {
  return shipentegraImportBasisUsd > 0 ? round2(FIXED_SHIPENTEGRA_CARRIER_FEE_USD) : 0;
}
