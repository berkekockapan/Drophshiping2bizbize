import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "../../../test/test-utils";
import { CategoryManagerDialog } from "./CategoryManagerDialog";

describe("CategoryManagerDialog", () => {
  it("does not render when closed", () => {
    const { container } = renderWithProviders(
      <CategoryManagerDialog
        open={false}
        categories={[]}
        errorMessage={null}
        onClose={vi.fn()}
        onCreate={vi.fn()}
        onRename={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("creates, renames, deletes and shows errors", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onCreate = vi.fn();
    const onRename = vi.fn();
    const onDelete = vi.fn();

    renderWithProviders(
      <CategoryManagerDialog
        open
        categories={[
          { id: "cat_1", name: "Bileklik" },
          { id: "cat_2", name: "Bardak" },
        ]}
        errorMessage="Bir şeyler ters gitti."
        onClose={onClose}
        onCreate={onCreate}
        onRename={onRename}
        onDelete={onDelete}
      />,
    );

    await user.type(screen.getByLabelText(/yeni kategori/i), "  Yeni Kategori  ");
    await user.click(screen.getByRole("button", { name: /kategori oluştur/i }));
    const renameInput = screen.getByDisplayValue("Bileklik");
    await user.clear(renameInput);
    await user.type(renameInput, "Takı");
    await user.click(screen.getByRole("button", { name: /kaydet cat_1/i }));
    await user.click(screen.getByRole("button", { name: /sil cat_2/i }));
    await user.click(screen.getByRole("button", { name: /kapat/i }));

    expect(onCreate).toHaveBeenCalledWith("Yeni Kategori");
    expect(onRename).toHaveBeenCalledWith("cat_1", "Takı");
    expect(onDelete).toHaveBeenCalledWith("cat_2");
    expect(onClose).toHaveBeenCalled();
    expect(screen.getByText("Bir şeyler ters gitti.")).toBeInTheDocument();
  });
});
