import { AiTargetConfigPanel } from "../components/AiTargetConfigPanel";
import { ConnectorStatusCard } from "../components/ConnectorStatusCard";
import { useAIConnections } from "../hooks/useAIConnections";

export function AIConnectionsPage() {
  const connections = useAIConnections();

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950 shadow-sm">
        <p className="font-semibold">Cloudflare deploy notu</p>
        <p className="mt-2">
          Bu ekran masaüstü connector akışı içindir. Cloudflare deploy kapsamında şimdilik aktif kullanılmaz; ürün takibi,
          ayarlar, bildirimler ve refresh akışları bundan etkilenmez.
        </p>
      </section>

      {connections.isLoading ? <p className="text-sm text-slate-500">Bağlantı durumu yükleniyor...</p> : null}

      {!connections.isLoading ? (
        <ConnectorStatusCard
          viewState={connections.viewState}
          isStartingConnection={connections.isStartingConnection}
          isReconnecting={connections.isReconnecting}
          isDeleting={connections.isDeleting}
          onStartConnection={connections.startConnection}
          onReconnect={connections.reconnectProfile}
          onDelete={connections.deleteProfile}
          onRetry={() => {
            void connections.retry();
          }}
        />
      ) : null}

      <AiTargetConfigPanel
        initialValue={connections.configInitialValue}
        pending={connections.isSavingTarget}
        onSubmit={connections.saveTarget}
      />
    </div>
  );
}
