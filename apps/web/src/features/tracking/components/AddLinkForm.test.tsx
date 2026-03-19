import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AddLinkForm } from "./AddLinkForm";
import { renderWithProviders } from "../../../test/test-utils";

describe("AddLinkForm", () => {
  it("submits a Trendyol URL and shows validation errors inline", async () => {
    renderWithProviders(<AddLinkForm />);

    await userEvent.click(screen.getByRole("button", { name: /ekle/i }));

    expect(screen.getByText(/trendyol linki gerekli/i)).toBeInTheDocument();
  });
});
