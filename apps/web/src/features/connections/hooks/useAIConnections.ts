import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import type { ConnectionAttemptResponse, ConnectorProfile } from "../../../app/api";
import {
  ConnectorRequestError,
  deleteConnectorProfile,
  fetchConnectionAttempt,
  fetchConnectorHealth,
  fetchSettings,
  patchSettings,
  reconnectConnectorProfile,
  startOpenAiConnection,
} from "../../../app/api";
import { clearAiTargetCache, readAiTargetCache, writeAiTargetCache } from "../lib/aiTargetStorage";
import { resolveConnectorTarget } from "../lib/resolveConnectorTarget";

const IN_PROGRESS_ATTEMPT_STATUSES = new Set<ConnectionAttemptResponse["status"]>([
  "pending_browser_launch",
  "waiting_for_login",
  "verifying_session",
]);

export type ConnectionViewState =
  | {
      kind: "ready_connected";
      profileId: string;
      label: string;
      emailMasked: string | null;
      providerStatus: "connected" | "needs_reauth";
    }
  | {
      kind: "ready_disconnected";
      message: string;
    }
  | {
      kind: "connecting";
      attemptId: string;
      message: string;
    }
  | {
      kind: "error";
      message: string;
      source: "desktop_default" | "settings_override";
    };

function normalizeSettingsString(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function isAttemptInProgress(attempt: ConnectionAttemptResponse | null | undefined) {
  return Boolean(attempt && IN_PROGRESS_ATTEMPT_STATUSES.has(attempt.status));
}

function mapQueryError(error: unknown) {
  if (
    (error instanceof ConnectorRequestError || error instanceof Error) &&
    "code" in error &&
    error.code === "PROFILE_NEEDS_REAUTH"
  ) {
    return "Bağlantı yeniden doğrulanmalı";
  }

  if (error instanceof Error) {
    if (/ECONNREFUSED|Failed to fetch|fetch failed|NetworkError/i.test(error.message)) {
      return "Yerel bağlantı servisi hazır değil";
    }

    return error.message;
  }

  return "Yerel bağlantı servisi hazır değil";
}

function buildViewState({
  activeProfile,
  attempt,
  source,
  error,
}: {
  activeProfile: ConnectorProfile | null;
  attempt: ConnectionAttemptResponse | null;
  source: "desktop_default" | "settings_override";
  error: unknown;
}): ConnectionViewState {
  if (error) {
    return {
      kind: "error",
      message: mapQueryError(error),
      source,
    };
  }

  if (attempt && isAttemptInProgress(attempt)) {
    return {
      kind: "connecting",
      attemptId: attempt.id,
      message: "Tarayıcıda girişinizi tamamlayın",
    };
  }

  if (activeProfile) {
    return {
      kind: "ready_connected",
      profileId: activeProfile.id,
      label: activeProfile.label,
      emailMasked: activeProfile.emailMasked,
      providerStatus: activeProfile.status === "needs_reauth" ? "needs_reauth" : "connected",
    };
  }

  if (attempt?.status === "failed") {
    return {
      kind: "error",
      message: attempt.error ?? "Bağlantı denemesi başarısız oldu",
      source,
    };
  }

  return {
    kind: "ready_disconnected",
    message: "Henüz bağlı hesap yok",
  };
}

export function useAIConnections() {
  const queryClient = useQueryClient();
  const [activeAttemptId, setActiveAttemptId] = useState<string | null>(null);
  const [launchError, setLaunchError] = useState<Error | null>(null);

  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: fetchSettings,
  });

  const cachedTarget = readAiTargetCache();
  const target = useMemo(() => resolveConnectorTarget(settingsQuery.data, cachedTarget), [cachedTarget, settingsQuery.data]);
  const healthQueryKey = useMemo(() => ["ai-profiles-health"] as const, []);

  const healthQuery = useQuery({
    queryKey: healthQueryKey,
    queryFn: fetchConnectorHealth,
    retry: false,
    enabled: !settingsQuery.isError,
  });

  const effectiveAttemptId =
    activeAttemptId ??
    (isAttemptInProgress(healthQuery.data?.connectionAttempt) ? healthQuery.data?.connectionAttempt?.id ?? null : null);

  const attemptQuery = useQuery({
    queryKey: ["ai-profiles-attempt", effectiveAttemptId],
    enabled: Boolean(effectiveAttemptId),
    queryFn: () => fetchConnectionAttempt(effectiveAttemptId as string),
    retry: false,
    refetchInterval: (query) => {
      const attempt = query.state.data?.attempt;
      return attempt && isAttemptInProgress(attempt) ? 1_000 : false;
    },
  });

  useEffect(() => {
    const polledAttempt = attemptQuery.data?.attempt;
    if (!polledAttempt || isAttemptInProgress(polledAttempt)) {
      return;
    }

    setActiveAttemptId(null);
    void queryClient.invalidateQueries({ queryKey: healthQueryKey });
  }, [attemptQuery.data?.attempt, healthQueryKey, queryClient]);

  const saveTargetMutation = useMutation({
    mutationFn: async (payload: { baseUrl: string }) =>
      patchSettings({
        aiTargetBaseUrl: normalizeSettingsString(payload.baseUrl),
      }),
    onSuccess: async (updatedSettings) => {
      if (updatedSettings.aiTargetBaseUrl) {
        writeAiTargetCache({
          baseUrl: updatedSettings.aiTargetBaseUrl,
        });
      } else {
        clearAiTargetCache();
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["settings"] }),
        queryClient.invalidateQueries({ queryKey: healthQueryKey }),
      ]);
    },
  });

  const startMutation = useMutation({
    mutationFn: async () => startOpenAiConnection(),
    onSuccess: async ({ attempt, authorizationUrl }) => {
      setActiveAttemptId(attempt.id);
      const popup = window.open(authorizationUrl, "_blank", "noopener");

      if (!popup) {
        setLaunchError(new Error("Giriş sekmesi açılamadı. Tarayıcı izinlerini kontrol edip tekrar deneyin."));
      } else {
        setLaunchError(null);
      }

      await queryClient.invalidateQueries({ queryKey: healthQueryKey });
    },
  });

  const reconnectMutation = useMutation({
    mutationFn: async (profileId: string) => reconnectConnectorProfile(profileId),
    onSuccess: async ({ attempt }) => {
      setActiveAttemptId(attempt.id);
      await queryClient.invalidateQueries({ queryKey: healthQueryKey });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (profileId: string) => deleteConnectorProfile(profileId),
    onSuccess: async () => {
      setActiveAttemptId(null);
      await queryClient.invalidateQueries({ queryKey: healthQueryKey });
    },
  });

  const combinedError =
    launchError ??
    settingsQuery.error ??
    healthQuery.error ??
    attemptQuery.error ??
    startMutation.error ??
    reconnectMutation.error ??
    deleteMutation.error;

  const viewState = buildViewState({
    activeProfile: healthQuery.data?.activeProfile ?? null,
    attempt: attemptQuery.data?.attempt ?? healthQuery.data?.connectionAttempt ?? null,
    source: target.source,
    error: combinedError,
  });

  return {
    target,
    viewState,
    configInitialValue: {
      baseUrl: settingsQuery.data?.aiTargetBaseUrl ?? cachedTarget?.baseUrl ?? "",
    },
    isLoading: settingsQuery.isLoading || (healthQuery.isLoading && !healthQuery.data && !healthQuery.error),
    isSavingTarget: saveTargetMutation.isPending,
    isStartingConnection: startMutation.isPending,
    isReconnecting: reconnectMutation.isPending,
    isDeleting: deleteMutation.isPending,
    saveTarget: (payload: { baseUrl: string }) => saveTargetMutation.mutate(payload),
    startConnection: () => {
      setLaunchError(null);
      startMutation.mutate();
    },
    reconnectProfile: (profileId: string) => reconnectMutation.mutate(profileId),
    deleteProfile: (profileId: string) => deleteMutation.mutate(profileId),
    retry: async () => {
      setLaunchError(null);
      await queryClient.invalidateQueries({ queryKey: healthQueryKey });
      if (effectiveAttemptId) {
        await queryClient.invalidateQueries({ queryKey: ["ai-profiles-attempt", effectiveAttemptId] });
      }
    },
  };
}
