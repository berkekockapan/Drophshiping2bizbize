export async function fetchTrendyolHtml(url: string, fetchImpl: typeof fetch = fetch) {
  const response = await fetchImpl(url, {
    headers: {
      accept: "text/html,application/xhtml+xml",
      "user-agent": "Mozilla/5.0 (compatible; TrendyolEtsyBot/1.0)",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Trendyol product: ${response.status}`);
  }

  return response.text();
}
