import { AiTargetConfigPanel } from "../components/AiTargetConfigPanel";
import { ConnectorStatusCard } from "../components/ConnectorStatusCard";
import { useAIConnections } from "../hooks/useAIConnections";

export function AIConnectionsPage() {
  const connections = useAIConnections();

  return (
    <div className="space-y-6">
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
