import { describe, expect, it } from "vitest";

import { mergeGeneratedDraft } from "../../src/modules/ai/mergeGeneratedDraft";

describe("mergeGeneratedDraft", () => {
  it("does not overwrite manually edited fields unless overwrite is explicit", () => {
    const existingDraftWithEdits = {
      id: "draft_1",
      productId: "prod_1",
      englishTitle: "Custom title",
      shortDescription: "Custom short description",
      longDescription: "Custom long description",
      tags: ["custom", "hoodie"],
      materials: ["cotton"],
      attributes: [{ key: "Fit", value: "Oversize" }],
      seoNotes: "custom seo",
      policyNotes: null,
      generatedVersion: 1,
      editedVersion: 2,
      lastGeneratedAt: 0,
      manualEditsPresent: true,
    };

    const generatedPayload = {
      englishTitle: "Generated title",
      shortDescription: "Generated short description",
      longDescription: "Generated long description",
      tags: ["etsy", "gift"],
      materials: ["cotton", "polyester"],
      attributes: [{ key: "Audience", value: "Unisex" }],
      seoNotes: "generated seo",
      policyNotes: "generated policy",
    };

    const merged = mergeGeneratedDraft(existingDraftWithEdits, generatedPayload, { overwrite: false });
    expect(merged.englishTitle).toBe(existingDraftWithEdits.englishTitle);
    expect(merged.shortDescription).toBe(existingDraftWithEdits.shortDescription);
  });

  it("overwrites editable fields when overwrite is true", () => {
    const merged = mergeGeneratedDraft(
      {
        id: "draft_1",
        productId: "prod_1",
        englishTitle: "Custom title",
        shortDescription: "Custom short description",
        longDescription: "Custom long description",
        tags: ["custom", "hoodie"],
        materials: ["cotton"],
        attributes: [{ key: "Fit", value: "Oversize" }],
        seoNotes: "custom seo",
        policyNotes: null,
        generatedVersion: 2,
        editedVersion: 3,
        lastGeneratedAt: 0,
        manualEditsPresent: true,
      },
      {
        englishTitle: "Generated title",
        shortDescription: "Generated short description",
        longDescription: "Generated long description",
        tags: ["etsy", "gift"],
        materials: ["cotton", "polyester"],
        attributes: [{ key: "Audience", value: "Unisex" }],
        seoNotes: "generated seo",
        policyNotes: "generated policy",
      },
      { overwrite: true },
    );

    expect(merged.englishTitle).toBe("Generated title");
    expect(merged.tags).toEqual(["etsy", "gift"]);
  });
});