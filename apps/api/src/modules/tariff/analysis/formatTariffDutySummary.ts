export function formatTariffDutySummary(generalDutyRate: number, additionalDutyRate: number) {
  const total = generalDutyRate + additionalDutyRate;

  return `%${(generalDutyRate * 100).toFixed(1)} temel vergi + %${(additionalDutyRate * 100).toFixed(1)} ek tarife = toplam %${(total * 100).toFixed(1)}`;
}
