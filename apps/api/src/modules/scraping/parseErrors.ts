export class ParseError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "PRODUCT_UNAVAILABLE"
      | "MISSING_PRODUCT_ROOT"
      | "MISSING_TITLE"
      | "MISSING_PRICE"
  ) {
    super(message);
    this.name = "ParseError";
  }
}
