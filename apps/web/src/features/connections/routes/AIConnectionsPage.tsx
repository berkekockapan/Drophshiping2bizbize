import { ConnectorStatusCard } from "../components/ConnectorStatusCard";
import { useAIConnections } from "../hooks/useAIConnections";

export function AIConnectionsPage() {
  const connections = useAIConnections();

  return (
    <div className="space-y-6">
      {connections.isLoading ? <p className="text-sm text-slate-500">Connector durumu yükleniyor...</p> : null}
      {connections.isError ? <p className="text-sm text-rose-600">{connections.errorMessage}</p> : null}

      {!connections.isLoading ? (
        <ConnectorStatusCard
          health={connections.health}
          profiles={connections.profiles}
          attempt={connections.connectionAttempt}
          isStartingConnection={connections.isStartingConnection}
          activatingProfileId={connections.activatingProfileId}
          reconnectingProfileId={connections.reconnectingProfileId}
          deletingProfileId={connections.deletingProfileId}
          onStartConnection={connections.startConnection}
          onActivate={connections.activateProfile}
          onReconnect={connections.reconnectProfile}
          onDelete={connections.deleteProfile}
        />
      ) : null}
    </div>
  );
}
