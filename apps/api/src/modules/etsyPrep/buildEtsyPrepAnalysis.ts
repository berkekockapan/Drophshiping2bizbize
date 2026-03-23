import type { EtsyPrepView } from "./buildEtsyPrepView";
import { fetchEtsyListingSignals } from "./fetchEtsyListingSignals";

function jsonLine(value: unknown) {
  return `${JSON.stringify(value)}\n`;
}

export function streamEvents(events: Array<Record<string, unknown>>) {
  return new Response(
    new ReadableStream({
      start(controller) {
        for (const event of events) {
          controller.enqueue(new TextEncoder().encode(jsonLine(event)));
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

export async function buildEtsyPrepAnalysis(detail: EtsyPrepView, options: { fetchImpl: typeof fetch }) {
  const signals = await fetchEtsyListingSignals(options.fetchImpl, "description", detail.product);
  const title = detail.product.title ?? "Untitled product";
  const seoNotes = `Lead with keyword focus from ${signals.keywordAngles[0] ?? "core keyword"} and support it with buyer-intent phrasing.`;

  return streamEvents([
    {
      type: "step_started",
      step: "fetch_listing_signals",
      field: "general",
    },
    {
      type: "step_completed",
      step: "fetch_listing_signals",
      field: "general",
      signals,
    },
    {
      type: "research_summary",
      summary: {
        title,
        keywordAngles: signals.keywordAngles,
        audienceThemes: signals.audienceThemes,
        policyNotes: signals.policyNotes,
      },
    },
    {
      type: "result_ready",
      result: {
        productId: detail.product.id,
        insights: {
          seoNotes,
          policyNotes: signals.policyNotes.join(" "),
          merchandisingNotes: signals.merchandisingNotes.join(" "),
        },
      },
    },
  ]);
}
