import "@testing-library/jest-dom/vitest";

import userEvent from "@testing-library/user-event";
import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";

import { createDefaultDraft } from "../lib/defaults";
import { FeeProfileCard } from "./FeeProfileCard";

it("opens advanced fee controls, emits overrides, and exposes reset", async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  const onReset = vi.fn();

  render(
    <FeeProfileCard
      draft={{ ...createDefaultDraft(), feeProfileOverrides: { transactionFeeRate: 0.07 } }}
      validationErrors={{}}
      onChange={onChange}
      onResetFeeProfileOverrides={onReset}
    />,
  );

  expect(screen.queryByLabelText(/kdv modu/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/odeme aktarim ucretini dahil et/i)).not.toBeInTheDocument();
  expect(screen.getByText(/para donusumunu dahil et/i)).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: /gelismis ucret ayarlari/i }));
  await user.clear(screen.getByLabelText(/^islem ucreti$/i));
  await user.type(screen.getByLabelText(/^islem ucreti$/i), "7");
  await user.click(screen.getByRole("button", { name: /varsayilan ayarlara don/i }));

  expect(onChange).toHaveBeenCalled();
  expect(onReset).toHaveBeenCalled();
});
