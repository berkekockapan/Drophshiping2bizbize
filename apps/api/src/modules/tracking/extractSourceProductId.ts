const SOURCE_PRODUCT_ID_PATTERN = /-p-(\d+)/i;

export function extractSourceProductId(url: string) {
  const match = new URL(url).pathname.match(SOURCE_PRODUCT_ID_PATTERN);
  return match?.[1] ?? null;
}
