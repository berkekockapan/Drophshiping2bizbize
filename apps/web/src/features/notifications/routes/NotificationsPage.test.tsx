import "@testing-library/jest-dom/vitest";
import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act } from "react";

import { renderWithProviders } from "../../../test/test-utils";
import { NotificationsPage } from "./NotificationsPage";

describe("NotificationsPage", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("polls owner-scoped notifications on the live-sync interval", async () => {
    vi.useFakeTimers();
    let calls = 0;

    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      calls += 1;
      return new Response(JSON.stringify({ items: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    renderWithProviders(<NotificationsPage />, {
      route: "/owners/berke/notifications",
      path: "/owners/:ownerKey/notifications",
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(calls).toBe(1);
    expect(screen.getByText(/bildirim merkezi/i)).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(calls).toBeGreaterThanOrEqual(2);
  });
});
