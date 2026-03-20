export interface FetchTrendyolHtmlOptions {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

export async function fetchTrendyolHtml(url: string, options: FetchTrendyolHtmlOptions = {}) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 20_000;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(`Trendyol request timed out after ${timeoutMs}ms`), timeoutMs);

  let response: Response;
  try {
    response = await fetchImpl(url, {
      signal: controller.signal,
      headers: {
        accept: "text/html,application/xhtml+xml",
        "user-agent": "Mozilla/5.0 (compatible; TrendyolEtsyBot/1.0)",
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Trendyol isteği zaman aşımına uğradı");
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch Trendyol product: ${response.status}`);
  }

  return response.text();
}
