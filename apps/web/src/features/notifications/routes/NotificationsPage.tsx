import { useQuery } from "@tanstack/react-query";

import { fetchNotifications } from "../../../app/api";
import { NotificationList } from "../components/NotificationList";

export function NotificationsPage() {
  const notificationsQuery = useQuery({
    queryKey: ["notifications"],
    queryFn: () => fetchNotifications(),
  });

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-7 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-slate-400">Bildirim Merkezi</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-900">Son değişiklikler</h1>
        <p className="mt-2 text-sm text-slate-500">
          Fiyat hareketleri, stok değişimleri ve parse uyarıları burada görünür.
        </p>
      </section>

      {notificationsQuery.isLoading ? <p className="text-sm text-slate-500">Bildirimler yükleniyor...</p> : null}
      {notificationsQuery.isError ? <p className="text-sm text-rose-600">Bildirimler yüklenemedi.</p> : null}

      {notificationsQuery.data ? <NotificationList items={notificationsQuery.data.items} /> : null}
    </div>
  );
}
