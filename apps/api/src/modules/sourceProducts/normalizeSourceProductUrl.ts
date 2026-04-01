export function normalizeSourceProductUrl(value: string) {
  const url = new URL(value.trim());
  url.hash = "";
  url.protocol = url.protocol.toLowerCase();
  url.hostname = url.hostname.toLowerCase();

  if (url.pathname !== "/") {
    url.pathname = url.pathname.replace(/\/+$/, "");
  }

  const params = [...url.searchParams.entries()].sort(([left], [right]) => left.localeCompare(right));
  url.search = "";
  for (const [key, paramValue] of params) {
    url.searchParams.append(key, paramValue);
  }

  return url.toString();
}
