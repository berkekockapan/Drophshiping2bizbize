import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act } from "react";

import { renderWithProviders } from "../../../test/test-utils";
import { NotificationsPage } from "./NotificationsPage";
import type { NotificationItem } from "../../../app/api";

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

  it("lists notifications as rows and marks a notification read when clicked", async () => {
    const user = userEvent.setup();
    let notifications: NotificationItem[] = [
      {
        id: "notif_1",
        productId: "prod_1",
        productTitle: "Seramik Kolye",
        type: "PRICE_DECREASED",
        severity: "info",
        title: "Fiyat düştü",
        body: "Ürün fiyatı ₺500,00 → ₺450,00 olarak değişti.",
        readAt: null,
        createdAt: 1710000000000,
      },
    ];
    const patchSpy = vi.fn();

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      const method = (init?.method ?? "GET").toUpperCase();

      if (url.includes("/owners/berke/notifications/notif_1/read") && method === "PATCH") {
        patchSpy();
        notifications = notifications.map((item) => ({ ...item, readAt: 1710000005000 }));
        return new Response(JSON.stringify({ items: notifications }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ items: notifications }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    renderWithProviders(<NotificationsPage />, {
      route: "/owners/berke/notifications",
      path: "/owners/:ownerKey/notifications",
    });

    expect(await screen.findByRole("button", { name: /bildirimini okundu yap/i })).toBeInTheDocument();
    expect(screen.getByText("Yeni")).toBeInTheDocument();
    expect(screen.getByText(/1 yeni \/ 1 toplam/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /bildirimini okundu yap/i }));

    await waitFor(() => expect(patchSpy).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/0 yeni \/ 1 toplam/i)).toBeInTheDocument();
    expect(screen.queryByText("Yeni")).not.toBeInTheDocument();
  });

  it("clears all notifications after explicit browser confirmation", async () => {
    const user = userEvent.setup();
    let notifications: NotificationItem[] = [
      {
        id: "notif_1",
        productId: "prod_1",
        productTitle: "Seramik Kolye",
        type: "OUT_OF_STOCK",
        severity: "warning",
        title: "Stok bitti",
        body: "Mavi varyantı stokta yok.",
        readAt: null,
        createdAt: 1710000000000,
      },
    ];
    const deleteSpy = vi.fn();
    vi.spyOn(window, "confirm").mockReturnValue(true);

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      const method = (init?.method ?? "GET").toUpperCase();

      if (url.includes("/owners/berke/notifications") && method === "DELETE") {
        deleteSpy();
        notifications = [];
        return new Response(JSON.stringify({ items: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ items: notifications }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    renderWithProviders(<NotificationsPage />, {
      route: "/owners/berke/notifications",
      path: "/owners/:ownerKey/notifications",
    });

    expect(await screen.findByRole("button", { name: /stok bitti bildirimini okundu yap/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /bildirimleri sıfırla/i }));

    await waitFor(() => expect(deleteSpy).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/henüz bildirim yok/i)).toBeInTheDocument();
  });

});
