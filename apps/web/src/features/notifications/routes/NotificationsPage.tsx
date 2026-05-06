import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";

import { clearNotifications, fetchNotifications, markNotificationRead, type NotificationItem } from "../../../app/api";
import { LiveSyncStatus } from "../../shared/components/LiveSyncStatus";
import { ownerOptions, type OwnerKey } from "../../shared/lib/ownerRouteState";
import { liveSyncQueryOptions } from "../../shared/lib/liveQuery";
import { NotificationList } from "../components/NotificationList";

function isOwnerKey(value: string | undefined): value is OwnerKey {
  return ownerOptions.some((owner) => owner.key === value);
}

export function NotificationsPage() {
  const { ownerKey: ownerKeyParam } = useParams<{ ownerKey: string }>();
  const ownerKey = isOwnerKey(ownerKeyParam) ? ownerKeyParam : null;
  const queryClient = useQueryClient();
  const queryKey = ["notifications", ownerKey] as const;

  const notificationsQuery = useQuery({
    queryKey,
    enabled: Boolean(ownerKey),
    queryFn: () => fetchNotifications(ownerKey as OwnerKey),
    ...liveSyncQueryOptions,
  });

  const markReadMutation = useMutation({
    mutationFn: (notification: NotificationItem) => markNotificationRead(ownerKey as OwnerKey, notification.id),
    onMutate: async (notification) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<{ items: NotificationItem[] }>(queryKey);
      const readAt = Date.now();
      queryClient.setQueryData<{ items: NotificationItem[] }>(queryKey, (current) => ({
        items: (current?.items ?? []).map((item) => (item.id === notification.id ? { ...item, readAt: item.readAt ?? readAt } : item)),
      }));
      return { previous };
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data);
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey });
    },
  });

  const clearMutation = useMutation({
    mutationFn: () => clearNotifications(ownerKey as OwnerKey),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["notifications", ownerKey] });
      const previous = queryClient.getQueryData<{ items: NotificationItem[] }>(queryKey);
      queryClient.setQueryData<{ items: NotificationItem[] }>(queryKey, { items: [] });
      queryClient.setQueryData<{ items: NotificationItem[] }>(["notifications", ownerKey, "sidebar"], { items: [] });
      return { previous };
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data);
      queryClient.setQueryData(["notifications", ownerKey, "sidebar"], data);
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
        queryClient.setQueryData(["notifications", ownerKey, "sidebar"], context.previous);
      }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notifications", ownerKey] });
    },
  });

  if (!ownerKey) {
    return <p className="text-sm text-rose-600">Geçersiz owner seçimi.</p>;
  }

  const items = notificationsQuery.data?.items ?? [];
  const unreadCount = items.filter((item) => item.readAt === null).length;

  function handleClearNotifications() {
    if (items.length === 0 || clearMutation.isPending) {
      return;
    }

    const confirmed = window.confirm(
      "Tüm bildirimler kalıcı olarak silinecek. Ürün kayıtları etkilenmez; yalnızca bildirim geçmişi sıfırlanır. Devam edilsin mi?",
    );
    if (!confirmed) {
      return;
    }

    clearMutation.mutate();
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-7 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.28em] text-slate-400">Bildirim Merkezi</p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-900">Son değişiklikler</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-500">
              Kaydettiğiniz ürünler yenilendiğinde fiyat hareketleri, stok değişimleri ve parse uyarıları burada anlaşılır bildirimler olarak görünür.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClearNotifications}
            disabled={items.length === 0 || clearMutation.isPending}
            className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
          >
            {clearMutation.isPending ? "Sıfırlanıyor..." : "Bildirimleri sıfırla"}
          </button>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Yeni bildirim</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{unreadCount}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Toplam bildirim</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{items.length}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Uyarı</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{items.filter((item) => item.severity === "warning").length}</p>
        </div>
      </div>

      <LiveSyncStatus
        hasData={Boolean(notificationsQuery.data)}
        isFetching={notificationsQuery.isFetching}
        hasBackgroundError={Boolean(notificationsQuery.data && notificationsQuery.failureCount > 0)}
        updatedAt={notificationsQuery.dataUpdatedAt}
      />

      {notificationsQuery.isLoading ? <p className="text-sm text-slate-500">Bildirimler yükleniyor...</p> : null}
      {notificationsQuery.isError && !notificationsQuery.data ? (
        <p className="text-sm text-rose-600">Bildirimler yüklenemedi.</p>
      ) : null}
      {markReadMutation.error instanceof Error ? <p className="text-sm text-rose-600">{markReadMutation.error.message}</p> : null}
      {clearMutation.error instanceof Error ? <p className="text-sm text-rose-600">{clearMutation.error.message}</p> : null}

      {notificationsQuery.data ? (
        <NotificationList
          ownerKey={ownerKey}
          items={items}
          markingId={markReadMutation.isPending ? markReadMutation.variables?.id ?? null : null}
          onMarkRead={(item) => {
            if (item.readAt === null) {
              markReadMutation.mutate(item);
            }
          }}
        />
      ) : null}
    </div>
  );
}
