import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import {
  activateConnectorProfile,
  fetchConnectorHealth,
  fetchConnectorProfiles,
  syncAiProfiles,
} from "../../../app/api";
import { ConnectorStatusCard } from "../components/ConnectorStatusCard";

export function AIConnectionsPage() {
  const queryClient = useQueryClient();
  const [activatingProfileId, setActivatingProfileId] = useState<string | null>(null);

  const healthQuery = useQuery({
    queryKey: ["connector-health"],
    queryFn: fetchConnectorHealth,
  });

  const profilesQuery = useQuery({
    queryKey: ["connector-profiles"],
    queryFn: fetchConnectorProfiles,
  });

  const normalizedHealth = useMemo(() => {
    if (!healthQuery.data) {
      return null;
    }

    return {
      ...healthQuery.data,
      provider: healthQuery.data.provider ?? healthQuery.data.activeProfile?.provider ?? "chatgpt-web",
    };
  }, [healthQuery.data]);

  const syncPayload = useMemo(() => {
    if (!normalizedHealth || !profilesQuery.data) {
      return null;
    }

    const activeProfileId = normalizedHealth.activeProfile?.id ?? null;
    return {
      connectorStatus: {
        status: normalizedHealth.status,
        provider: normalizedHealth.provider,
      },
      profiles: profilesQuery.data.items.map((profile) => ({
        id: profile.id,
        label: profile.label,
        emailMasked: profile.emailMasked,
        provider: profile.provider,
        isActive: profile.id === activeProfileId,
      })),
    };
  }, [normalizedHealth, profilesQuery.data]);

  useEffect(() => {
    if (!syncPayload) {
      return;
    }

    void syncAiProfiles(syncPayload);
  }, [syncPayload]);

  const activateMutation = useMutation({
    mutationFn: async (profileId: string) => {
      setActivatingProfileId(profileId);
      await activateConnectorProfile(profileId);
    },
    onSettled: async () => {
      setActivatingProfileId(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["connector-health"] }),
        queryClient.invalidateQueries({ queryKey: ["connector-profiles"] }),
      ]);
    },
  });

  const isLoading = healthQuery.isLoading || profilesQuery.isLoading;
  const isError = healthQuery.isError || profilesQuery.isError;

  return (
    <div className="space-y-6">
      {isLoading ? <p className="text-sm text-slate-500">Connector durumu yükleniyor...</p> : null}
      {isError ? <p className="text-sm text-rose-600">Connector bilgileri alınamadı.</p> : null}

      {!isLoading && !isError ? (
        <ConnectorStatusCard
          health={normalizedHealth}
          profiles={profilesQuery.data?.items ?? []}
          activatingProfileId={activatingProfileId}
          onActivate={(profileId) => activateMutation.mutate(profileId)}
        />
      ) : null}
    </div>
  );
}
