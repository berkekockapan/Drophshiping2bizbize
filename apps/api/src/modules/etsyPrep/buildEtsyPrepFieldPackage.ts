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
    outputSchema: Record<string, unknown>;
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

function outputSchemaForField(field: EtsyPrepField) {
  if (field === "title") {
    return {
      type: "object",
      additionalProperties: false,
      required: ["title", "keywords"],
      properties: {
        title: { type: "string", minLength: 1, maxLength: 140 },
        keywords: {
          type: "array",
          minItems: 3,
          maxItems: 8,
          items: { type: "string", minLength: 1 },
        },
        rationale: { type: "string", minLength: 1 },
      },
    };
  }

  if (field === "description") {
    return {
      type: "object",
      additionalProperties: false,
      required: ["shortDescription", "longDescription"],
      properties: {
        shortDescription: { type: "string", minLength: 1, maxLength: 260 },
        longDescription: { type: "string", minLength: 1 },
        keyFeatures: {
          type: "array",
          minItems: 3,
          maxItems: 6,
          items: { type: "string", minLength: 1 },
        },
      },
    };
  }

  return {
    type: "object",
    additionalProperties: false,
    required: ["tags"],
    properties: {
      tags: {
        type: "array",
        minItems: 13,
        maxItems: 13,
        items: { type: "string", minLength: 1, maxLength: 20 },
      },
    },
  };
}

function fieldSpecificRules(field: EtsyPrepField) {
  if (field === "title") {
    return [
      "Title must not mention material, color, or capacity.",
      "Do not use material-led, color-led, or capacity-led title angles even when those facts are present.",
    ];
  }

  if (field === "tags") {
    return [
      "Tags must not mention color or capacity.",
      "Reject color-led or capacity-led tags such as white coffee cup, 200 ml mug, pink bag, black wallet, gold necklace, 12 oz cup, or 1 liter bottle.",
    ];
  }

  return [];
}

export async function buildEtsyPrepFieldPackage(input: EtsyPrepFieldPackageInput): Promise<EtsyPrepFieldPackage> {
  const signals = await fetchEtsyListingSignals(input.fetchImpl, input.field, input.product);
  const outputSchema = outputSchemaForField(input.field);
  const rules = fieldSpecificRules(input.field);

  return {
    field: input.field,
    prompt: [
      "Return ONLY valid JSON.",
      `Field: ${input.field}`,
      `OUTPUT_SCHEMA: ${JSON.stringify(outputSchema)}`,
      ...(rules.length > 0 ? ["Field Rules", ...rules.map((rule) => `- ${rule}`)] : []),
      `Source title: ${input.product.title ?? ""}`,
      `Signals: ${JSON.stringify(signals.keywordAngles)}`,
    ].join("\n"),
    context: {
      productId: input.product.id,
      signals,
      outputSchema,
      constraints: input.constraints,
    },
  };
}

export async function buildEtsyPrepFieldPackageStream(
  field: EtsyPrepField,
  detail: EtsyPrepView,
  options: { fetchImpl: typeof fetch; waitFor?: Promise<void> },
) {
  return streamEvents(async (emit) => {
    const constraints = defaultConstraints(field);

    emit({
      type: "step_started",
      step: "build_prompt_package",
      field,
    });

    if (options.waitFor) {
      await options.waitFor;
    }

    const fieldPackage = await buildEtsyPrepFieldPackage({
      field,
      product: detail.product,
      fetchImpl: options.fetchImpl,
      constraints,
    });

    emit({
      type: "step_completed",
      step: "build_prompt_package",
      field,
      constraints,
    });
    emit({
      type: "prompt_ready",
      field,
      prompt: fieldPackage.prompt,
      context: fieldPackage.context,
    });
  });
}
