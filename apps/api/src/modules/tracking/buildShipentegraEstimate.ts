export interface ShipentegraEstimate {
  amount: number;
  currency: "USD";
  sourceType: "profile_default" | "system_default";
}

function normalize(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "");
}

export function buildShipentegraEstimate(input: {
  title: string | null;
  category: string | null;
  attributes: Array<{ key: string; value: string }>;
  defaultShipentegraUsd?: number | null;
}): ShipentegraEstimate {
  if (typeof input.defaultShipentegraUsd === "number") {
    return {
      amount: Math.round((input.defaultShipentegraUsd + Number.EPSILON) * 100) / 100,
      currency: "USD",
      sourceType: "profile_default",
    };
  }

  const normalized = normalize(
    `${input.title ?? ""} ${input.category ?? ""} ${input.attributes.map((item) => item.value).join(" ")}`,
  );

  if (/kolye|kupe|bileklik|aksesuar/.test(normalized)) {
    return { amount: 4.9, currency: "USD", sourceType: "system_default" };
  }

  if (/hoodie|sweat|sweatshirt|tisort|tekstil/.test(normalized)) {
    return { amount: 7.5, currency: "USD", sourceType: "system_default" };
  }

  if (/seramik|kupa|bardak/.test(normalized)) {
    return { amount: 9.8, currency: "USD", sourceType: "system_default" };
  }

  return { amount: 6.25, currency: "USD", sourceType: "system_default" };
}
