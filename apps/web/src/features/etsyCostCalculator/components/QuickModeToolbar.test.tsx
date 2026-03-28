import "@testing-library/jest-dom/vitest";

import userEvent from "@testing-library/user-event";
import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";

import { QuickModeToolbar } from "./QuickModeToolbar";

it("switches tabs and exposes preset and advanced actions", async () => {
  const user = userEvent.setup();
  const onTabChange = vi.fn();
  const onOpenPresets = vi.fn();
  const onOpenAdvanced = vi.fn();

  render(
    <QuickModeToolbar
      activeTab="target_price"
      badges={["Hazir"]}
      onTabChange={onTabChange}
      onOpenPresets={onOpenPresets}
      onOpenAdvanced={onOpenAdvanced}
    />,
  );

  await user.click(screen.getByRole("tab", { name: /mevcut fiyati analiz et/i }));
  await user.click(screen.getByRole("button", { name: /hazir ayarlar/i }));
  await user.click(screen.getByRole("button", { name: /gelismis ayarlar/i }));

  expect(onTabChange).toHaveBeenCalledWith("analyze_price");
  expect(onOpenPresets).toHaveBeenCalled();
  expect(onOpenAdvanced).toHaveBeenCalled();
  expect(screen.getByRole("tablist")).toBeInTheDocument();
  expect(screen.getByText(/^hazir$/i)).toBeInTheDocument();
});
