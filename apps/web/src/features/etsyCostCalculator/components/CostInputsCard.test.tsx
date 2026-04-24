import "@testing-library/jest-dom/vitest";

import userEvent from "@testing-library/user-event";
import { render, screen } from "@testing-library/react";
import { useState } from "react";
import { expect, it, vi } from "vitest";

import { createDefaultDraft } from "../lib/defaults";
import { CostInputsCard } from "./CostInputsCard";

it("hides product cost in advanced-only mode", () => {
  const onChange = vi.fn();

  render(<CostInputsCard draft={createDefaultDraft()} variant="advanced-only" onChange={onChange} />);

  expect(screen.queryByLabelText(/^urun maliyeti$/i)).not.toBeInTheDocument();
  expect(screen.getByLabelText(/^shipentegra kargo maliyeti$/i)).toBeInTheDocument();
  expect(screen.queryByLabelText(/shipentegra operasyon maliyeti/i)).not.toBeInTheDocument();
});

it("adds, edits, currency-switches, and removes custom cost rows", async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();

  function Harness() {
    const [draft, setDraft] = useState(createDefaultDraft());

    return (
      <CostInputsCard
        draft={draft}
        onChange={(patch) => {
          onChange(patch);
          setDraft((current) => ({ ...current, ...patch }));
        }}
      />
    );
  }

  render(<Harness />);

  await user.click(screen.getByRole("button", { name: /gider satiri ekle/i }));
  await user.type(screen.getByLabelText(/ozel gider adi/i), "Etiket");
  await user.selectOptions(screen.getByLabelText(/ozel gider para birimi/i), "TRY");
  await user.click(screen.getByRole("button", { name: /gider satiri sil/i }));

  expect(onChange).toHaveBeenCalled();
});
