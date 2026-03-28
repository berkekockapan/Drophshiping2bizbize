import "@testing-library/jest-dom/vitest";

import userEvent from "@testing-library/user-event";
import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";

import { PresetToolbar } from "./PresetToolbar";

it("routes save, load, update and delete actions through explicit controls", async () => {
  const user = userEvent.setup();
  const onSavePreset = vi.fn();
  const onLoadPreset = vi.fn();
  const onUpdatePreset = vi.fn();
  const onDeletePreset = vi.fn();
  const onPresetNameChange = vi.fn();

  render(
    <PresetToolbar
      presetName="ABD basic"
      activePresetId="preset_1"
      presets={[{ id: "preset_1", name: "ABD basic", input: {} as never, createdAt: 1, updatedAt: 1 }]}
      onPresetNameChange={onPresetNameChange}
      onSavePreset={onSavePreset}
      onLoadPreset={onLoadPreset}
      onUpdatePreset={onUpdatePreset}
      onDeletePreset={onDeletePreset}
    />,
  );

  await user.click(screen.getByRole("button", { name: /preset kaydet/i }));
  await user.selectOptions(screen.getByRole("combobox"), "preset_1");
  await user.click(screen.getByRole("button", { name: /guncelle/i }));
  await user.click(screen.getByRole("button", { name: /sil/i }));

  expect(onSavePreset).toHaveBeenCalledWith("ABD basic");
  expect(onLoadPreset).toHaveBeenCalledWith("preset_1");
  expect(onUpdatePreset).toHaveBeenCalled();
  expect(onDeletePreset).toHaveBeenCalledWith("preset_1");
});
