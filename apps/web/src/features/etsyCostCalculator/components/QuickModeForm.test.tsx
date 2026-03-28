import "@testing-library/jest-dom/vitest";

import userEvent from "@testing-library/user-event";
import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";

import { createDefaultDraft } from "../lib/defaults";
import { QuickModeForm } from "./QuickModeForm";

it("keeps the quick flow compact and edits optional sale price", async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();

  render(
    <QuickModeForm
      draft={createDefaultDraft()}
      validationErrors={{}}
      salePriceLabel="Opsiyonel satis fiyati (USD)"
      salePriceRequired={false}
      onChange={onChange}
    />,
  );

  await user.type(screen.getByLabelText(/opsiyonel satis fiyati/i), "39");

  expect(onChange).toHaveBeenCalled();
  expect(screen.getByRole("spinbutton", { name: /urun maliyeti/i })).toBeInTheDocument();
  expect(screen.getByRole("spinbutton", { name: /gercek kargo/i })).toBeInTheDocument();
  expect(screen.getByRole("combobox", { name: /hedef kar modu/i })).toBeInTheDocument();
  expect(screen.getByRole("spinbutton", { name: /hedef kar degeri/i })).toBeInTheDocument();
});
