import type { PropsWithChildren } from "react";
import { NavLink } from "react-router-dom";

const navigationItems = [
  { to: "/", label: "Ürünler" },
  { to: "/notifications", label: "Bildirimler" },
  { to: "/connections", label: "AI Bağlantıları" },
  { to: "/settings", label: "Ayarlar" },
];

export function AppShell({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="grid min-h-screen lg:grid-cols-[260px_1fr]">
        <aside className="flex flex-col gap-8 bg-[#051125] px-6 py-8 text-white">
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-slate-400">Trendyol → Etsy</p>
            <h1 className="mt-3 text-2xl font-semibold text-white">Link Tracking Center</h1>
            <p className="mt-2 text-sm text-slate-300">
              Stok, fiyat ve Etsy hazırlık akışını tek panelden yönetin.
            </p>
          </div>

          <nav className="flex flex-col gap-2">
            {navigationItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `rounded-2xl px-4 py-3 text-sm transition ${
                    isActive ? "bg-white/12 text-white" : "text-slate-300 hover:bg-white/8 hover:text-white"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto rounded-3xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-400">MVP</p>
            <p className="mt-2 text-sm text-slate-200">
              50–500 ürün ölçeğine uygun yalın tek kullanıcı paneli.
            </p>
          </div>
        </aside>

        <main className="px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
