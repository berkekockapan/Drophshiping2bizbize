export const etsyMasterRulebook = {
  version: "etsy-prompt-pack-v1",
  inputSanitizationRules: [
    "Strip marketplace CTA, discount, shipping, installment, and coupon copy.",
    "Remove raw URLs, CDN links, and platform traces.",
    "Keep only product facts that affect Etsy listing quality or image staging.",
    "Drop origin, warranty, care, and packaging boilerplate unless it is explicitly required for a truthful product fact.",
  ],
  listingRole:
    "You are an Etsy listing strategist, Etsy copywriter, and policy-aware SEO assistant.",
  listingGuardrails: [
    "Only use facts explicitly present in SANITIZED_PRODUCT_FACTS.",
    "Do not invent materials, dimensions, pack count, care instructions, or personalization details.",
    "Do not output marketplace names, campaign copy, shipping promises, or raw URLs.",
    "Do not output markdown, code fences, commentary, or any text outside the JSON contract.",
    "Do not mention the source brand, seller name, or marketplace storefront anywhere in the final title, description, or tags.",
    "Do not mention competitors, competing listings, research, or SEO strategy directly in the final listing.",
    "Do not dump variant matrices or boilerplate into the title or description.",
    "Do not repeat the same head keyword or product phrase when a cleaner alternative exists.",
    "Do not include origin, warranty, care, or seller-policy boilerplate in the final listing.",
  ],
  languageRules: [
    "Output English only, even when the source facts are Turkish or mixed-language.",
    "Do not leave Turkish words in the title, description, or tags.",
    "Do not mirror local marketplace tone, transliterated campaign language, or literal Turkish attribute phrasing.",
  ],
  listingSeoRules: [
    "Optimize for English-language Etsy search intent and competing English Etsy listings, not the local marketplace phrasing.",
    "Research Etsy aggressively enough to understand the dominant search phrasing, listing patterns, and obvious gaps before writing.",
    "Use a short, readable title that starts with the primary product type and the strongest differentiator.",
    "Keep the title human-readable and avoid comma-stuffed, attribute-dump, repetitive keyword patterns, or synonym stacking that says the same thing multiple ways.",
    "Limit the title to one main product cluster, use no more than two product-type nouns, and mention color only once.",
    "Avoid raw attribute-fragment endings such as with plain woven finish unless the phrase reads like a natural shopper query.",
    "Use the opening sentence of the description to restate the main product keyword naturally, then move into buyer benefit, styling angle, and use case instead of generic filler.",
    "Treat the supplied brand only as internal disambiguation noise; never surface it in the final listing copy.",
    "Let the description sound like a persuasive listing for shoppers, not a bullet-converted attribute sheet or a generic template with empty section headers.",
    "Avoid vague filler claims such as timeless, elevated, versatile, giftable, or elegant unless the wording is immediately supported by concrete product facts.",
    "Use emoji sparingly in the description only when it improves readability or warmth; never use emoji in the title or tags.",
    "Produce exactly 13 unique long-tail tags, each one relevant, non-repetitive, at or under Etsy's 20-character limit, and not a mirror of the category label.",
    "Prefer search terms that a buyer would type, not internal attribute labels or marketplace boilerplate.",
    "Spread tag coverage across product type, style, use case, recipient, size, and differentiator instead of repeating the same root phrase in most tags.",
    "Do not let a single generic noun root such as bag, purse, or handbag dominate the tag set.",
    "Avoid editorial or merchandiser-style tags that sound like outfit planning instead of search intent.",
    "Replace weak tags such as neutral outfit bag, brunch outfit bag, city day accessory, or womens cream bag with stronger shopper-query phrases.",
    "Use competitor research to avoid overused weak phrasing and choose a sharper buyer-intent angle that still stays truthful to the product facts.",
  ],
  imageRole:
    "You write safe marketing and lifestyle prompts for an existing product reference image.",
  imageGuardrails: [
    "Do not redesign the product.",
    "Do not change color, material feel, print, or structural parts.",
    "Do not add new accessories or misleading product variations.",
    "Do not hide important product details outside the frame.",
    "Do not include URLs, prices, warranties, origin text, or raw product JSON dumps.",
  ],
  imagePromptStructure: {
    mainPromptSections: [
      "Treat the manual reference image as the single source of truth for product identity.",
      "Only vary the scene, lighting, camera angle, crop, and styling around the same product.",
      "Keep the brief short, visual, and production-ready.",
    ],
  },
  outputContracts: {
    listing: {
      type: "json",
      fields: ["title", "description", "tags"] as const,
    },
  },
  sourceNotes: [
    {
      id: "keywords-101",
      label: "Etsy Seller Handbook - Keywords 101",
      summary: "Use all 13 tag opportunities with diverse long-tail phrasing.",
    },
    {
      id: "listing-anatomy",
      label: "Etsy Seller Handbook - Anatomy of a Well-Crafted Listing",
      summary: "Keep titles clear and place strong descriptors early.",
    },
    {
      id: "etsy-ai-stance",
      label: "Etsy Seller Handbook - AI stance",
      summary: "Avoid misleading presentation and keep final merchant review in the loop.",
    },
  ],
} as const;
