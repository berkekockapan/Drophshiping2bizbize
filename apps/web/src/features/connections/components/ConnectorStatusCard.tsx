import type { ConnectionViewState } from "../hooks/useAIConnections";

interface ConnectorStatusCardProps {
  viewState: ConnectionViewState;
  isStartingConnection: boolean;
  isReconnecting: boolean;
  isDeleting: boolean;
  onStartConnection: () => void;
  onReconnect: (profileId: string) => void;
  onDelete: (profileId: string) => void;
  onRetry: () => void;
}

export function ConnectorStatusCard({
  viewState,
  isStartingConnection,
  isReconnecting,
  isDeleting,
  onStartConnection,
  onReconnect,
  onDelete,
  onRetry,
}: ConnectorStatusCardProps) {
  const title =
    viewState.kind === "ready_connected"
      ? viewState.providerStatus === "needs_reauth"
        ? "Bağlantı yeniden doğrulanmalı"
        : "OpenAI bağlantısı hazır"
      : viewState.kind === "connecting"
        ? "OpenAI bağlantısı kuruluyor"
        : viewState.kind === "error"
          ? viewState.message
          : "OpenAI bağlantısı gerekli";

  const description =
    viewState.kind === "ready_connected"
      ? viewState.emailMasked ?? viewState.label
      : viewState.kind === "error"
        ? viewState.source === "settings_override"
          ? "Gelişmiş ayarlardaki servis adresini kontrol edip tekrar deneyin."
          : "Masaüstü bağlantı servisi açıldığında durum otomatik yenilenir."
        : viewState.message;

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Masaüstü OpenAI</p>
      <h1 className="mt-3 text-2xl font-semibold text-slate-900">AI Bağlantıları</h1>
      <p className="mt-2 text-base font-medium text-slate-900">{title}</p>
      <p className="mt-2 text-sm text-slate-600">{description}</p>

      {viewState.kind === "ready_connected" ? (
        <div className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">{viewState.label}</p>
          {viewState.emailMasked ? <p className="mt-1">{viewState.emailMasked}</p> : null}
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-3">
        {viewState.kind === "ready_disconnected" ? (
          <button
            type="button"
            className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            disabled={isStartingConnection}
            onClick={onStartConnection}
          >
            {isStartingConnection ? "Giriş Sekmesi Açılıyor..." : "OpenAI ile giriş yap"}
          </button>
        ) : null}

        {viewState.kind === "connecting" ? (
          <>
            <button
              type="button"
              className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={isStartingConnection}
              onClick={onStartConnection}
            >
              {isStartingConnection ? "Giriş Sekmesi Açılıyor..." : "Giriş sekmesini yeniden aç"}
            </button>
            <button
              type="button"
              className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700"
              onClick={onRetry}
            >
              Durumu Yenile
            </button>
          </>
        ) : null}

        {viewState.kind === "ready_connected" ? (
          <>
            <button
              type="button"
              className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={isReconnecting}
              onClick={() => onReconnect(viewState.profileId)}
            >
              {isReconnecting ? "Yeniden Bağlanılıyor..." : "Yeniden Bağlan"}
            </button>
            <button
              type="button"
              className="rounded-2xl border border-rose-200 px-4 py-3 text-sm font-semibold text-rose-700 disabled:cursor-not-allowed disabled:border-rose-100 disabled:text-rose-300"
              disabled={isDeleting}
              onClick={() => onDelete(viewState.profileId)}
            >
              {isDeleting ? "Kaldırılıyor..." : "Bağlantıyı Kaldır"}
            </button>
          </>
        ) : null}

        {viewState.kind === "error" ? (
          <button
            type="button"
            className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
            onClick={onRetry}
          >
            Tekrar Dene
          </button>
        ) : null}
      </div>
    </section>
  );
}
