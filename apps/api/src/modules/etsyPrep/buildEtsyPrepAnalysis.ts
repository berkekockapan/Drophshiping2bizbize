import type { EtsyPrepView } from "./buildEtsyPrepView";
import { fetchEtsyListingSignals } from "./fetchEtsyListingSignals";

function jsonLine(value: unknown) {
  return `${JSON.stringify(value)}\n`;
}

type StreamEvent = Record<string, unknown>;

export function streamEvents(producer: (emit: (event: StreamEvent) => void) => Promise<void> | void) {
  return new Response(
    new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const emit = (event: StreamEvent) => {
          controller.enqueue(encoder.encode(jsonLine(event)));
        };

        try {
          await producer(emit);
        } catch (error) {
          controller.error(error);
          return;
        }

        controller.close();
      },
    }),
    {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-store",
      },
    },
  );
}

export async function buildEtsyPrepAnalysis(
  detail: EtsyPrepView,
  options: { fetchImpl: typeof fetch; waitFor?: Promise<void> },
) {
  return streamEvents(async (emit) => {
    emit({
      type: "step_started",
      step: "fetch_listing_signals",
      field: "general",
    });

    if (options.waitFor) {
      await options.waitFor;
    }

    const signals = await fetchEtsyListingSignals(options.fetchImpl, "description", detail.product);
    const title = detail.product.title ?? "Untitled product";
    const seoNotes = `Lead with keyword focus from ${signals.keywordAngles[0] ?? "core keyword"} and support it with buyer-intent phrasing.`;

    emit({
      type: "step_completed",
      step: "fetch_listing_signals",
      field: "general",
      signals,
    });
    emit({
      type: "research_summary",
      summary: {
        title,
        keywordAngles: signals.keywordAngles,
        audienceThemes: signals.audienceThemes,
        policyNotes: signals.policyNotes,
      },
    });
    emit({
      type: "result_ready",
      result: {
        productId: detail.product.id,
        insights: {
          seoNotes,
          policyNotes: signals.policyNotes.join(" "),
          merchandisingNotes: signals.merchandisingNotes.join(" "),
        },
      },
    });
  });
}
