export interface ShipentegraEstimateInput {
  title: string | null;
  category: string | null;
  attributes: Array<{ key: string; value: string }>;
  defaultShipentegraUsd?: number | null;
}

export interface ShipentegraEstimate {
  amount: number;
  currency: "USD";
  sourceType: "profile_default" | "system_default";
}

export function buildShipentegraEstimate(input: ShipentegraEstimateInput): ShipentegraEstimate {
  if (typeof input.defaultShipentegraUsd === "number") {
    return { amount: input.defaultShipentegraUsd, currency: "USD", sourceType: "profile_default" };
  }

  const normalized = `${input.title ?? ""} ${input.category ?? ""} ${input.attributes.map((item) => item.value).join(" ")}`
    .toLocaleLowerCase("tr-TR")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");

  if (/kolye|kupe|bileklik|aksesuar/.test(normalized)) {
    return { amount: 4.9, currency: "USD", sourceType: "system_default" };
  }

  if (/hoodie|sweat|tisort|tekstil/.test(normalized)) {
    return { amount: 7.5, currency: "USD", sourceType: "system_default" };
  }

  if (/seramik|kupa|bardak/.test(normalized)) {
    return { amount: 9.8, currency: "USD", sourceType: "system_default" };
  }

  return { amount: 6.25, currency: "USD", sourceType: "system_default" };
}
