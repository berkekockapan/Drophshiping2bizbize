interface LiveSyncStatusProps {
  hasData: boolean;
  isFetching: boolean;
  hasBackgroundError: boolean;
  updatedAt: number;
}

function formatTimestamp(updatedAt: number) {
  return new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(updatedAt));
}

export function LiveSyncStatus({ hasData, isFetching, hasBackgroundError, updatedAt }: LiveSyncStatusProps) {
  if (hasBackgroundError && hasData) {
    return (
      <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Son yenileme basarisiz. Ekranda son basarili veri gosteriliyor.
      </p>
    );
  }

  if (!hasData || updatedAt <= 0) {
    return null;
  }

  return (
    <p className="text-sm text-slate-500">
      {isFetching ? "Merkezi bulut verisi yenileniyor..." : `Merkezi bulut verisi son senkron: ${formatTimestamp(updatedAt)}`}
    </p>
  );
}
