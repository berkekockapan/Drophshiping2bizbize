export type ImagePromptVariationFamily = "hero" | "lifestyle" | "editorial";

export interface ImagePromptVariationTemplate {
  id: string;
  family: ImagePromptVariationFamily;
  lead: string;
  composition: string;
  lighting: string;
  environment: string;
  styling: string;
  clickGoal: string;
}

export const imagePromptVariationTemplates: ImagePromptVariationTemplate[] = [
  {
    id: "hero-centered-clean",
    family: "hero",
    lead: "Etsy hero clean product shot.",
    composition: "Centered composition with the product dominant in frame and strong thumbnail readability.",
    lighting: "Neutral softbox lighting with controlled contrast.",
    environment: "Minimal distraction-free backdrop.",
    styling: "Restrained props only if needed for scale clarity.",
    clickGoal: "Feels premium, clean, and trustworthy at first glance.",
  },
  {
    id: "hero-close-three-quarter",
    family: "hero",
    lead: "Etsy hero clean product shot.",
    composition: "Close three-quarter framing that keeps the full silhouette readable.",
    lighting: "Balanced key light with subtle fill for texture fidelity.",
    environment: "Clean studio-like surface with light depth separation.",
    styling: "No prop clutter around defining product details.",
    clickGoal: "Highlights product identity fast in Etsy search tiles.",
  },
  {
    id: "hero-front-tabletop",
    family: "hero",
    lead: "Etsy hero clean product shot.",
    composition: "Front-biased tabletop angle with generous breathing room around the product.",
    lighting: "Even daylight tone with gentle shadow falloff.",
    environment: "Simple commercial tabletop without busy background elements.",
    styling: "Only supportive micro props that do not compete for attention.",
    clickGoal: "Clear visual hierarchy with instant product legibility.",
  },
  {
    id: "hero-tight-complete",
    family: "hero",
    lead: "Etsy hero clean product shot.",
    composition: "Tight but complete framing that highlights the main silhouette and key surface detail.",
    lighting: "Crisp controlled lighting that preserves true material feel.",
    environment: "Uncluttered neutral setting.",
    styling: "No theatrical accessories or exaggerated story props.",
    clickGoal: "Creates an attention-grabbing but honest first thumbnail.",
  },
  {
    id: "lifestyle-natural-context",
    family: "lifestyle",
    lead: "Lifestyle scene.",
    composition: "Natural in-context framing with the product still dominant in frame.",
    lighting: "Soft natural light with believable contrast.",
    environment: "Everyday setting aligned to likely product use.",
    styling: "Keep supporting props sparse and context-led.",
    clickGoal: "Shows relatable usage without reducing product readability.",
  },
  {
    id: "lifestyle-shelf-surface",
    family: "lifestyle",
    lead: "Lifestyle scene.",
    composition: "Shelf or surface setup with balanced negative space and a readable silhouette.",
    lighting: "Window-inspired side light with clean highlight control.",
    environment: "Tidy lifestyle vignette with low visual noise.",
    styling: "Use restrained decor cues that reinforce category fit.",
    clickGoal: "Signals taste and trust while preserving product clarity.",
  },
  {
    id: "lifestyle-medium-framing",
    family: "lifestyle",
    lead: "Lifestyle scene.",
    composition: "Medium framing that shows the product clearly before any surrounding context.",
    lighting: "Natural-feel key light with soft fill.",
    environment: "Calm home or studio corner with simple textures.",
    styling: "No bold props that compete with the product.",
    clickGoal: "Feels realistic and shop-ready for Etsy gallery browsing.",
  },
  {
    id: "lifestyle-readable-contextual",
    family: "lifestyle",
    lead: "Lifestyle scene.",
    composition: "Readable contextual composition with the product still owning the center of attention.",
    lighting: "Warm-neutral light balance with controlled shadows.",
    environment: "Believable setting that supports the product story.",
    styling: "Use only minimal supportive context elements.",
    clickGoal: "Improves click appeal while keeping listing trust high.",
  },
  {
    id: "editorial-refined-hierarchy",
    family: "editorial",
    lead: "Editorial attention-grabber.",
    composition: "Refined product-first composition with stronger visual hierarchy.",
    lighting: "Directional light with premium contrast control.",
    environment: "Minimal editorial backdrop without dramatic clutter.",
    styling: "Polished but restrained styling cues only.",
    clickGoal: "Looks elevated and scroll-stopping without being misleading.",
  },
  {
    id: "editorial-close-sophisticated",
    family: "editorial",
    lead: "Editorial attention-grabber.",
    composition: "Sophisticated close framing that keeps defining details obvious.",
    lighting: "Soft cinematic edge light while preserving accurate texture.",
    environment: "Modern clean setting with controlled depth.",
    styling: "No embellishments that imply a different variant or bundle.",
    clickGoal: "Delivers premium Etsy thumbnail energy with truthful fidelity.",
  },
];
