import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import {
  fetchActiveManualRefreshRun,
  fetchManualRefreshRun,
  retryFailedManualRefreshRun,
  startManualRefreshRun,
  type ManualRefreshRunSummary,
} from "../../../app/api";
import type { OwnerKey } from "../../shared/lib/ownerRouteState";

interface BulkRefreshControlProps {
  ownerKey: OwnerKey;
}

function getCompletedCount(run: ManualRefreshRunSummary) {
  return run.successCount + run.failedCount;
}

function getCompletionMessage(run: ManualRefreshRunSummary) {
  if (run.totalCount === 0) {
    return "Yenilenecek kayıt bulunamadı.";
  }

  if (run.failedCount > 0) {
    return `${run.successCount} ürün güncellendi, ${run.failedCount} ürün hata verdi`;
  }

  return `${run.successCount} ürün güncellendi`;
}

export function BulkRefreshControl({ ownerKey }: BulkRefreshControlProps) {
  const queryClient = useQueryClient();
  const [runId, setRunId] = useState<string | null>(null);
  const [resultPopup, setResultPopup] = useState<ManualRefreshRunSummary | null>(null);
  const [isSyncingFreshData, setIsSyncingFreshData] = useState(false);
  const finalizingRunIdRef = useRef<string | null>(null);

  const activeRunQuery = useQuery({
    queryKey: ["tracking-refresh-run", ownerKey, "active"],
    queryFn: () => fetchActiveManualRefreshRun(ownerKey),
  });

  const runStatusQuery = useQuery({
    queryKey: ["tracking-refresh-run", ownerKey, runId],
    enabled: Boolean(runId),
    queryFn: () => fetchManualRefreshRun(ownerKey, runId as string),
    refetchInterval: (query) => {
      const data = query.state.data as { run: ManualRefreshRunSummary } | undefined;
      return data?.run.status === "COMPLETED" ? false : 400;
    },
  });

  function activateRun(run: ManualRefreshRunSummary) {
    queryClient.setQueryData(["tracking-refresh-run", ownerKey, "active"], { run });
    queryClient.setQueryData(["tracking-refresh-run", ownerKey, run.id], { run });
    setResultPopup(null);
    setRunId(run.id);
  }

  const startMutation = useMutation({
    mutationFn: () => startManualRefreshRun(ownerKey),
    onSuccess: ({ run }) => {
      activateRun(run);
    },
  });

  const retryMutation = useMutation({
    mutationFn: (sourceRunId: string) => retryFailedManualRefreshRun(ownerKey, sourceRunId),
    onSuccess: ({ run }) => {
      activateRun(run);
    },
  });

  useEffect(() => {
    const activeRun = activeRunQuery.data?.run;
    if (!activeRun || runId) {
      return;
    }

    queryClient.setQueryData(["tracking-refresh-run", ownerKey, activeRun.id], { run: activeRun });
    setRunId(activeRun.id);
  }, [activeRunQuery.data?.run, ownerKey, queryClient, runId]);

  const run = runId ? (runStatusQuery.data?.run ?? null) : null;

  useEffect(() => {
    if (!runId || !run || run.status !== "COMPLETED" || finalizingRunIdRef.current === runId) {
      return;
    }

    finalizingRunIdRef.current = runId;
    setIsSyncingFreshData(true);

    async function syncFreshData() {
      await Promise.allSettled([
        queryClient.invalidateQueries({
          queryKey: ["tracking-products", ownerKey],
          refetchType: "active",
        }),
        queryClient.invalidateQueries({
          queryKey: ["product-detail", ownerKey],
          refetchType: "active",
        }),
      ]);
      queryClient.setQueryData(["tracking-refresh-run", ownerKey, "active"], { run: null });
      setResultPopup(run);
      setRunId(null);
      finalizingRunIdRef.current = null;
      setIsSyncingFreshData(false);
    }

    void syncFreshData();
  }, [ownerKey, queryClient, run, runId]);

  const completedCount = run ? getCompletedCount(run) : 0;
  const percent = run && run.totalCount > 0 ? Math.round((completedCount / run.totalCount) * 100) : 0;
  const progressMessage =
    run?.status === "COMPLETED" || isSyncingFreshData
      ? "Güncel veriler ekrana alınıyor..."
      : "Ürün verileri yenileniyor...";
  const errorMessage = startMutation.error instanceof Error
    ? startMutation.error.message
    : retryMutation.error instanceof Error
      ? retryMutation.error.message
      : activeRunQuery.error instanceof Error
        ? activeRunQuery.error.message
        : runStatusQuery.error instanceof Error
          ? runStatusQuery.error.message
          : null;

  return (
    <div className="relative flex min-w-[280px] flex-col items-end gap-3">
      {run ? (
        <div className="min-w-[280px] overflow-hidden rounded-[24px] border border-sky-200 bg-white shadow-sm">
          <div className="h-2 bg-sky-100">
            <div className="h-full bg-sky-500 transition-[width] duration-300" style={{ width: `${percent}%` }} />
          </div>
          <div className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
            <div>
              <p className="font-medium text-slate-900">{progressMessage}</p>
              <p className="text-xs text-slate-500">%{percent} tamamlandı</p>
            </div>
            <p className="font-semibold text-sky-700">
              {completedCount} / {run.totalCount}
            </p>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => startMutation.mutate()}
          disabled={startMutation.isPending || retryMutation.isPending}
          className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-medium text-sky-700 transition hover:border-sky-300 hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {startMutation.isPending ? "Yenileme başlatılıyor..." : "Tüm ürünleri yenile"}
        </button>
      )}

      {resultPopup ? (
        <div className="w-full max-w-[320px] rounded-[24px] border border-slate-200 bg-white p-4 shadow-lg">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-900">Yenileme tamamlandı</p>
              <p className="text-sm text-slate-600">{getCompletionMessage(resultPopup)}</p>
            </div>
            <button
              type="button"
              onClick={() => setResultPopup(null)}
              className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              aria-label="Sonuç özetini kapat"
            >
              ×
            </button>
          </div>

          {resultPopup.failedCount > 0 ? (
            <button
              type="button"
              onClick={() => retryMutation.mutate(resultPopup.id)}
              disabled={retryMutation.isPending}
              className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800 transition hover:border-amber-300 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {retryMutation.isPending ? "Hatalılar tekrar deneniyor..." : "Hatalıları tekrar dene"}
            </button>
          ) : null}
        </div>
      ) : null}

      {errorMessage ? <p className="max-w-[320px] text-right text-sm text-rose-600">{errorMessage}</p> : null}
    </div>
  );
}
