import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";

import { fetchNotifications } from "../../../app/api";
import { ownerOptions, type OwnerKey } from "../../shared/lib/ownerRouteState";
import { NotificationList } from "../components/NotificationList";

function isOwnerKey(value: string | undefined): value is OwnerKey {
  return ownerOptions.some((owner) => owner.key === value);
}

export function NotificationsPage() {
  const { ownerKey: ownerKeyParam } = useParams<{ ownerKey: string }>();
  const ownerKey = isOwnerKey(ownerKeyParam) ? ownerKeyParam : null;

  const notificationsQuery = useQuery({
    queryKey: ["notifications", ownerKey],
    enabled: Boolean(ownerKey),
    queryFn: () => fetchNotifications(ownerKey as OwnerKey),
  });

  if (!ownerKey) {
    return <p className="text-sm text-rose-600">Geçersiz owner seçimi.</p>;
  }

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
