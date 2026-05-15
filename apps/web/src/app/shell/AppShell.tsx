import { useQuery } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import { useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";

import { fetchNotifications } from "../api";

import {
  getDefaultOwnerKey,
  ownerOptions,
  readOwnerKeyFromPath,
  writeLastOwnerKey,
} from "../../features/shared/lib/ownerRouteState";

function linkClassName(isActive: boolean) {
  return `rounded-2xl px-4 py-3 text-sm transition ${
    isActive ? "bg-white/12 text-white" : "text-slate-300 hover:bg-white/8 hover:text-white"
  }`;
}

export function AppShell({ children }: PropsWithChildren) {
  const location = useLocation();
  const ownerFromPath = readOwnerKeyFromPath(location.pathname);
  const activeOwner = ownerFromPath ?? getDefaultOwnerKey();

  useEffect(() => {
    if (ownerFromPath) {
      writeLastOwnerKey(ownerFromPath);
    }
  }, [ownerFromPath]);

  const notificationsQuery = useQuery({
    queryKey: ["notifications", activeOwner, "sidebar"],
    queryFn: () => fetchNotifications(activeOwner),
    refetchInterval: 10_000,
    retry: false,
  });
  const unreadNotificationCount = (notificationsQuery.data?.items ?? []).filter((item) => item.readAt === null).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="grid min-h-screen lg:grid-cols-[260px_1fr]">
        <aside className="flex flex-col gap-8 bg-[#051125] px-6 py-8 text-white">
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-slate-400">Trendyol → Etsy</p>
            <h1 className="mt-3 text-2xl font-semibold text-white">Link Tracking Center</h1>
            <p className="mt-2 text-sm text-slate-300">Stok, fiyat ve Etsy hazırlık akışını tek panelden yönetin.</p>
          </div>

          <nav className="flex flex-col gap-2">
            {ownerOptions.map((owner) => (
              <NavLink key={owner.key} to={`/owners/${owner.key}/products`} className={({ isActive }) => linkClassName(isActive)}>
                Ürünler / {owner.label}
              </NavLink>
            ))}
            <NavLink to={`/owners/${activeOwner}/etsy-shops`} className={({ isActive }) => linkClassName(isActive)}>
              Etsy Mağazaları
            </NavLink>
            <NavLink to={`/owners/${activeOwner}/prompt-library`} className={({ isActive }) => linkClassName(isActive)}>
              Prompt Kütüphanesi
            </NavLink>
            <NavLink to={`/owners/${activeOwner}/notifications`} className={({ isActive }) => linkClassName(isActive)}>
              <span className="flex items-center justify-between gap-3">
                <span>Bildirimler</span>
                {unreadNotificationCount > 0 ? (
                  <span className="rounded-full bg-[#F1641E] px-2 py-0.5 text-xs font-semibold text-white">
                    {unreadNotificationCount}
                  </span>
                ) : null}
              </span>
            </NavLink>
            <NavLink to={`/owners/${activeOwner}/trash`} className={({ isActive }) => linkClassName(isActive)}>
              Çöp Kutusu
            </NavLink>
            <NavLink to={`/owners/${activeOwner}/source-products`} className={({ isActive }) => linkClassName(isActive)}>
              Kaynak Ürünler
            </NavLink>
            <NavLink to={`/owners/${activeOwner}/source-products/trash`} className={({ isActive }) => linkClassName(isActive)}>
              Kaynak Ürün Çöp Kutusu
            </NavLink>
            <NavLink to="/etsy-cost-calculator" className={({ isActive }) => linkClassName(isActive)}>
              Etsy Maliyet Hesaplayici
            </NavLink>
            <NavLink to="/connections" className={({ isActive }) => linkClassName(isActive)}>
              AI Bağlantıları
            </NavLink>
            <NavLink to="/settings" className={({ isActive }) => linkClassName(isActive)}>
              Ayarlar
            </NavLink>
          </nav>

          <div className="mt-auto rounded-3xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-400">MVP</p>
            <p className="mt-2 text-sm text-slate-200">50–500 ürün ölçeğine uygun yalın tek kullanıcı paneli.</p>
          </div>
        </aside>

        <main className="px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
