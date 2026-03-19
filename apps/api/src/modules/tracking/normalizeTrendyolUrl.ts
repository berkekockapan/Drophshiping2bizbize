export function normalizeTrendyolUrl(rawUrl: string) {
  const url = new URL(rawUrl);
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/+$/, "");
}
