import "@testing-library/jest-dom/vitest";

import userEvent from "@testing-library/user-event";
import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";

import { AdvancedSettingsDrawer } from "./AdvancedSettingsDrawer";

it("shows a dialog shell with a close button when open", async () => {
  const user = userEvent.setup();
  const onClose = vi.fn();

  render(
    <AdvancedSettingsDrawer open onClose={onClose}>
      <p>İçerik</p>
    </AdvancedSettingsDrawer>,
  );

  await user.click(screen.getByRole("button", { name: /gelismis ayarlari kapat/i }));

  expect(screen.getByRole("dialog", { name: /gelismis ayarlar/i })).toBeInTheDocument();
  expect(onClose).toHaveBeenCalled();
  expect(screen.getByText("İçerik")).toBeInTheDocument();
});
