import "@testing-library/jest-dom/vitest";
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithProviders } from "../../../test/test-utils";
import { ChangeTimeline } from "./ChangeTimeline";

describe("ChangeTimeline", () => {
  it("renders no-change, content, and variant events in one list", () => {
    renderWithProviders(
      <ChangeTimeline
        items={[
          {
            id: "audit_1",
            type: "REFRESH_NO_CHANGE",
            changedAt: Date.parse("2026-03-20T12:00:00.000Z"),
            summary: "Yenileme yapildi, degisiklik bulunamadi",
            details: null,
            before: null,
            after: null,
            variantKey: null,
            refreshSource: "MANUAL",
          },
          {
            id: "content_1",
            type: "TITLE_CHANGED",
            changedAt: Date.parse("2026-03-20T11:00:00.000Z"),
            summary: "Baslik degisti",
            details: null,
            before: "Oversize Hoodie",
            after: "Oversize Hoodie Renewed",
            variantKey: null,
            refreshSource: "MANUAL",
          },
          {
            id: "stock_1",
            type: "VARIANT_STOCK_CHANGED",
            changedAt: Date.parse("2026-03-20T10:00:00.000Z"),
            summary: "L / Siyah varyanti yeniden stokta",
            details: null,
            before: "Stokta degil",
            after: "Stokta",
            variantKey: "L / Siyah",
            refreshSource: "SCHEDULED",
          },
        ]}
      />,
    );

    expect(screen.getByText(/degisiklik gecmisi/i)).toBeInTheDocument();
    expect(screen.getByText(/yenileme yapildi, degisiklik bulunamadi/i)).toBeInTheDocument();
    expect(screen.getByText(/oversize hoodie renewed/i)).toBeInTheDocument();
    expect(screen.getByText(/l \/ siyah varyanti yeniden stokta/i)).toBeInTheDocument();
  });
});
