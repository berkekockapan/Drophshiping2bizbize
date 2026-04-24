import "@testing-library/jest-dom/vitest";

import userEvent from "@testing-library/user-event";
import { render, screen } from "@testing-library/react";
import { useState } from "react";
import { expect, it, vi } from "vitest";

import { calculateScenario } from "../lib/calculateScenario";
import { createDefaultDraft } from "../lib/defaults";
import type { CalculatorDraft } from "../lib/types";
import { QuickModeForm } from "./QuickModeForm";

it("switches between OTHER and US profiles and shows the import-duty preview for US", async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  const shipentegraPreview = calculateScenario({
    ...createDefaultDraft(),
    destinationProfile: "US",
    manualDutyPercent: 10,
    salePriceUsd: 50,
    saleDiscountPercent: 20,
    coupon: { type: "fixed_usd", value: 4 },
  });

  function Harness() {
    const [draft, setDraft] = useState<CalculatorDraft>(() => ({
      ...createDefaultDraft(),
      manualDutyPercent: 10,
    }));

    return (
      <QuickModeForm
        draft={draft}
        shipentegraPreview={shipentegraPreview}
        validationErrors={{}}
        salePriceLabel="Opsiyonel satis fiyati (USD)"
        salePriceRequired={false}
        onChange={(patch) => {
          onChange(patch);
          setDraft((current) => ({ ...current, ...patch }));
        }}
      />
    );
  }

  render(<Harness />);

  expect(screen.getByRole("spinbutton", { name: /usd\/try kuru/i })).toBeInTheDocument();
  expect(screen.queryByRole("spinbutton", { name: /manuel ithalat vergisi orani/i })).not.toBeInTheDocument();
  expect(screen.getByLabelText("İndirim %")).toBeInTheDocument();
  expect(screen.getByLabelText("Alıcıdan alınan kargo (USD)")).toBeInTheDocument();
  expect(screen.getByLabelText("Ekstra tahsilat (USD)")).toBeInTheDocument();
  expect(screen.getByLabelText("Hedef kar degeri")).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: /abd hedef profili/i }));
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ destinationProfile: "US" }));
  expect(screen.getByRole("spinbutton", { name: /manuel ithalat vergisi orani \(%\)/i })).toBeInTheDocument();
  expect(screen.getByText(/abd ithalat vergisi onizlemesi/i)).toBeInTheDocument();
  expect(screen.getByText(/manuel duty tutari: \$3\.60/i)).toBeInTheDocument();
  expect(screen.getByText(/tahmini ithalat vergisi: \$3\.60/i)).toBeInTheDocument();
});
