import { AiTargetConfigPanel } from "../components/AiTargetConfigPanel";
import { ConnectorStatusCard } from "../components/ConnectorStatusCard";
import { useAIConnections } from "../hooks/useAIConnections";

export function AIConnectionsPage() {
  const connections = useAIConnections();

  return (
    <div className="space-y-6">
      {connections.isLoading ? <p className="text-sm text-slate-500">Bağlantı durumu yükleniyor...</p> : null}
      {connections.isError ? <p className="text-sm text-rose-600">{connections.errorMessage}</p> : null}

      <AiTargetConfigPanel
        initialValue={connections.configInitialValue}
        pending={connections.isSavingTarget}
        onSubmit={connections.saveTarget}
      />

      {!connections.isLoading ? (
        <ConnectorStatusCard
          targetLabel={connections.target?.label ?? "Windows"}
          targetBaseUrl={connections.target?.baseUrl ?? null}
          authFiles={connections.authFiles}
          activeFileName={connections.activeFileName}
          attemptMessage={connections.attemptMessage}
          isStartingConnection={connections.isStartingConnection}
          activatingFileName={connections.activatingFileName}
          deletingFileName={connections.deletingFileName}
          startDisabled={!connections.canStartConnection}
          onStartConnection={connections.startConnection}
          onActivate={connections.activateAuthFile}
          onDelete={connections.deleteAuthFile}
        />
      ) : null}
    </div>
  );
}
