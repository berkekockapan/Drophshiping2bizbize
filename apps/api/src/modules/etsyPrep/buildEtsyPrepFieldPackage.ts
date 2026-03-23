import type { EtsyPrepView } from "./buildEtsyPrepView";
import { streamEvents } from "./buildEtsyPrepAnalysis";
import { fetchEtsyListingSignals, type EtsyListingSignals, type EtsyPrepField } from "./fetchEtsyListingSignals";

export interface EtsyPrepFieldPackageInput {
  fetchImpl: typeof fetch;
  field: EtsyPrepField;
  product: EtsyPrepView["product"];
  constraints?: Record<string, unknown>;
}

export interface EtsyPrepFieldPackage {
  field: EtsyPrepField;
  prompt: string;
  context: {
    productId: string;
    signals: EtsyListingSignals;
    constraints?: Record<string, unknown>;
  };
}

function defaultConstraints(field: EtsyPrepField) {
  if (field === "title") {
    return { locale: "en", maxLength: 140 };
  }

  if (field === "tags") {
    return { locale: "en", requiredCount: 13 };
  }

  return { locale: "en" };
}

export async function buildEtsyPrepFieldPackage(input: EtsyPrepFieldPackageInput): Promise<EtsyPrepFieldPackage> {
  const signals = await fetchEtsyListingSignals(input.fetchImpl, input.field, input.product);

  return {
    field: input.field,
    prompt: [
      "Return ONLY valid JSON.",
      `Field: ${input.field}`,
      `Source title: ${input.product.title ?? ""}`,
      `Signals: ${JSON.stringify(signals.keywordAngles)}`,
    ].join("\n"),
    context: {
      productId: input.product.id,
      signals,
      constraints: input.constraints,
    },
  };
}

export async function buildEtsyPrepFieldPackageStream(
  field: EtsyPrepField,
  detail: EtsyPrepView,
  options: { fetchImpl: typeof fetch },
) {
  const constraints = defaultConstraints(field);
  const fieldPackage = await buildEtsyPrepFieldPackage({
    field,
    product: detail.product,
    fetchImpl: options.fetchImpl,
    constraints,
  });

  return streamEvents([
    {
      type: "step_started",
      step: "build_prompt_package",
      field,
    },
    {
      type: "step_completed",
      step: "build_prompt_package",
      field,
      constraints,
    },
    {
      type: "prompt_ready",
      field,
      prompt: fieldPackage.prompt,
      context: fieldPackage.context,
    },
  ]);
}
