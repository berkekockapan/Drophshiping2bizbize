const ETSY_LISTING_ID_PATTERN = /\/listing\/(\d+)/i;

export function normalizeEtsyUrl(value: string) {
  const url = new URL(value.trim());
  url.hash = "";

  const listingId = url.pathname.match(ETSY_LISTING_ID_PATTERN)?.[1] ?? null;
  if (listingId) {
    return {
      normalizedUrl: `https://www.etsy.com/listing/${listingId}`,
      listingId,
    };
  }

  url.protocol = "https:";
  url.hostname = "www.etsy.com";
  url.search = "";
  if (url.pathname !== "/") {
    url.pathname = url.pathname.replace(/\/+$/, "");
  }

  return {
    normalizedUrl: url.toString(),
    listingId: null,
  };
}
