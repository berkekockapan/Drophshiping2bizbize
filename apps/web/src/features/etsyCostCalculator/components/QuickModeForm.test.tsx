import "@testing-library/jest-dom/vitest";

import userEvent from "@testing-library/user-event";
import { render, screen } from "@testing-library/react";
import { useState } from "react";
import { expect, it, vi } from "vitest";

import { createDefaultDraft } from "../lib/defaults";
import type { CalculatorDraft } from "../lib/types";
import { QuickModeForm } from "./QuickModeForm";

it("switches between OTHER and US profiles and only shows manual duty for US", async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();

  function Harness() {
    const [draft, setDraft] = useState<CalculatorDraft>(() => createDefaultDraft());

    return (
      <QuickModeForm
        draft={draft}
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
  expect(screen.queryByRole("spinbutton", { name: /manuel duty %/i })).not.toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: /abd hedef profili/i }));
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ destinationProfile: "US" }));
  expect(screen.getByRole("spinbutton", { name: /manuel duty %/i })).toBeInTheDocument();
});
