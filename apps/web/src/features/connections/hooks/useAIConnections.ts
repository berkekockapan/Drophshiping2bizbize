import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import {
  activateConnectorProfile,
  deleteConnectorProfile,
  fetchConnectionAttempt,
  fetchConnectorHealth,
  fetchConnectorProfiles,
  reconnectConnectorProfile,
  startOpenAiConnection,
  syncAiProfiles,
} from "../../../app/api";

const FINAL_ATTEMPT_STATUSES = new Set(["completed", "failed", "cancelled"]);

async function invalidateConnectionQueries(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["connector-health"] }),
    queryClient.invalidateQueries({ queryKey: ["connector-profiles"] }),
  ]);
}

export function useAIConnections() {
  const queryClient = useQueryClient();
  const [activeAttemptId, setActiveAttemptId] = useState<string | null>(null);
  const [activatingProfileId, setActivatingProfileId] = useState<string | null>(null);
  const [reconnectingProfileId, setReconnectingProfileId] = useState<string | null>(null);
  const [deletingProfileId, setDeletingProfileId] = useState<string | null>(null);

  const healthQuery = useQuery({
    queryKey: ["connector-health"],
    queryFn: fetchConnectorHealth,
  });

  const profilesQuery = useQuery({
    queryKey: ["connector-profiles"],
    queryFn: fetchConnectorProfiles,
  });

  const attemptQuery = useQuery({
    queryKey: ["connector-attempt", activeAttemptId],
    enabled: Boolean(activeAttemptId),
    queryFn: () => fetchConnectionAttempt(activeAttemptId as string),
    refetchInterval: (query) => {
      const status = query.state.data?.attempt.status;
      return status && FINAL_ATTEMPT_STATUSES.has(status) ? false : 1_000;
    },
  });

  useEffect(() => {
    if (activeAttemptId) {
      return;
    }

    const connectionAttempt = healthQuery.data?.connectionAttempt;
    if (connectionAttempt && !FINAL_ATTEMPT_STATUSES.has(connectionAttempt.status)) {
      setActiveAttemptId(connectionAttempt.id);
    }
  }, [activeAttemptId, healthQuery.data?.connectionAttempt]);

  useEffect(() => {
    const attempt = attemptQuery.data?.attempt;
    if (!attempt || !FINAL_ATTEMPT_STATUSES.has(attempt.status)) {
      return;
    }

    void invalidateConnectionQueries(queryClient).finally(() => {
      setActiveAttemptId((current) => (current === attempt.id ? null : current));
    });
  }, [attemptQuery.data?.attempt, queryClient]);

  const connectionAttempt = useMemo(() => {
    if (attemptQuery.data?.attempt) {
      return attemptQuery.data.attempt;
    }

    return healthQuery.data?.connectionAttempt ?? null;
  }, [attemptQuery.data?.attempt, healthQuery.data?.connectionAttempt]);

  const syncPayload = useMemo(() => {
    if (!healthQuery.data || !profilesQuery.data) {
      return null;
    }

    const activeProfileId = healthQuery.data.activeProfile?.id ?? profilesQuery.data.activeProfile?.id ?? null;

    return {
      connectorStatus: {
        status: healthQuery.data.status,
        provider: healthQuery.data.provider ?? healthQuery.data.activeProfile?.provider ?? "mock",
      },
      profiles: profilesQuery.data.items.map((profile) => ({
        id: profile.id,
        label: profile.label,
        emailMasked: profile.emailMasked,
        provider: profile.provider,
        isActive: profile.id === activeProfileId,
        status: profile.status,
        lastValidatedAt: profile.lastValidatedAt,
        lastError: profile.lastError,
      })),
    };
  }, [healthQuery.data, profilesQuery.data]);

  useEffect(() => {
    if (!syncPayload) {
      return;
    }

    void syncAiProfiles(syncPayload).catch(() => undefined);
  }, [syncPayload]);

  const startMutation = useMutation({
    mutationFn: startOpenAiConnection,
    onSuccess: async ({ attempt }) => {
      setActiveAttemptId(attempt.id);
      await queryClient.invalidateQueries({ queryKey: ["connector-health"] });
    },
  });

  const activateMutation = useMutation({
    mutationFn: async (profileId: string) => {
      setActivatingProfileId(profileId);
      return activateConnectorProfile(profileId);
    },
    onSettled: async () => {
      setActivatingProfileId(null);
      await invalidateConnectionQueries(queryClient);
    },
  });

  const reconnectMutation = useMutation({
    mutationFn: async (profileId: string) => {
      setReconnectingProfileId(profileId);
      return reconnectConnectorProfile(profileId);
    },
    onSuccess: async ({ attempt }) => {
      setActiveAttemptId(attempt.id);
      await queryClient.invalidateQueries({ queryKey: ["connector-health"] });
    },
    onSettled: () => {
      setReconnectingProfileId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (profileId: string) => {
      setDeletingProfileId(profileId);
      await deleteConnectorProfile(profileId);
    },
    onSettled: async () => {
      setDeletingProfileId(null);
      await invalidateConnectionQueries(queryClient);
    },
  });

  const error =
    healthQuery.error ??
    profilesQuery.error ??
    startMutation.error ??
    activateMutation.error ??
    reconnectMutation.error ??
    deleteMutation.error ??
    attemptQuery.error;

  return {
    health: healthQuery.data ?? null,
    profiles: profilesQuery.data?.items ?? [],
    connectionAttempt,
    isLoading: healthQuery.isLoading || profilesQuery.isLoading,
    isError:
      healthQuery.isError ||
      profilesQuery.isError ||
      startMutation.isError ||
      activateMutation.isError ||
      reconnectMutation.isError ||
      deleteMutation.isError ||
      attemptQuery.isError,
    errorMessage: error instanceof Error ? error.message : "Connector bilgileri alınamadı.",
    isStartingConnection: startMutation.isPending,
    activatingProfileId,
    reconnectingProfileId,
    deletingProfileId,
    startConnection: () => startMutation.mutate(),
    activateProfile: (profileId: string) => activateMutation.mutate(profileId),
    reconnectProfile: (profileId: string) => reconnectMutation.mutate(profileId),
    deleteProfile: (profileId: string) => deleteMutation.mutate(profileId),
  };
}
