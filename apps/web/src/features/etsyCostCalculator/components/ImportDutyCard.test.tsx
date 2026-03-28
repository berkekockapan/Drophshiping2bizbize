import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "../../../test/test-utils";
import { ImportDutyCard } from "./ImportDutyCard";

describe("ImportDutyCard", () => {
  it("shows selected tariff details and toggle", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();

    renderWithProviders(
      <ImportDutyCard
        code="711790"
        summary="%11.0 temel vergi + %0.0 ek tarife = toplam %11.0"
        enabled={false}
        onToggle={onToggle}
        helperHref="/owners/berke/products/prod_1"
      />,
    );

    expect(screen.getByRole("heading", { name: /abd ithalat vergisi/i })).toBeInTheDocument();
    expect(screen.getByText(/gtip 711790/i)).toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: /abd ithalat vergisini dahil et/i }));
    expect(onToggle).toHaveBeenCalledWith(true);
  });
});
