import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { fetchSettings, patchSettings } from "../../../app/api";
import { clearAiTargetCache, readAiTargetCache, writeAiTargetCache } from "../lib/aiTargetStorage";
import type { CliProxyAuthFile, CliProxyAuthFilesResponse } from "../lib/cliProxyApi";
import { createCliProxyApiClient } from "../lib/cliProxyApi";

async function invalidateConnectionQueries(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["settings"] }),
    queryClient.invalidateQueries({ queryKey: ["cli-proxy-auth-files"] }),
  ]);
}

function normalizeSettingsString(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function buildAiTarget(
  settings:
    | {
        aiTargetBaseUrl: string | null;
        aiTargetManagementKey: string | null;
        aiTargetLabel: string | null;
        aiTargetApiKey: string | null;
      }
    | undefined,
  cached: ReturnType<typeof readAiTargetCache>,
) {
  const baseUrl = settings?.aiTargetBaseUrl ?? cached?.baseUrl ?? null;

  if (!baseUrl) {
    return null;
  }

  return {
    baseUrl,
    label: settings?.aiTargetLabel ?? cached?.label ?? "Windows",
    managementKey: settings?.aiTargetManagementKey ?? null,
    apiKey: settings?.aiTargetApiKey ?? null,
  };
}

function getAttemptMessage(status: { status: "wait" | "ok" | "error"; error?: string } | null) {
  if (!status) {
    return null;
  }

  if (status.status === "wait") {
    return "Tarayıcıda giriş bekleniyor.";
  }

  if (status.status === "error") {
    return status.error ?? "Bağlantı denemesi başarısız oldu.";
  }

  return null;
}

export function useAIConnections() {
  const queryClient = useQueryClient();
  const [activeState, setActiveState] = useState<string | null>(null);
  const [latestAuthStatus, setLatestAuthStatus] = useState<{ status: "wait" | "ok" | "error"; error?: string } | null>(null);
  const [activatingFileName, setActivatingFileName] = useState<string | null>(null);
  const [deletingFileName, setDeletingFileName] = useState<string | null>(null);

  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: fetchSettings,
  });

  const cachedTarget = readAiTargetCache();
  const target = useMemo(() => buildAiTarget(settingsQuery.data, cachedTarget), [cachedTarget, settingsQuery.data]);
  const client = useMemo(() => (target ? createCliProxyApiClient(target) : null), [target]);
  const authFilesQueryKey = useMemo(() => ["cli-proxy-auth-files", target?.baseUrl] as const, [target?.baseUrl]);

  const authFilesQuery = useQuery({
    queryKey: authFilesQueryKey,
    enabled: Boolean(client && target?.managementKey),
    queryFn: () => client!.listAuthFiles(),
  });

  const pollingQuery = useQuery({
    queryKey: ["cli-proxy-auth-status", activeState],
    enabled: Boolean(client && activeState),
    queryFn: () => client!.getAuthStatus(activeState as string),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "wait" ? 1_000 : false;
    },
  });

  useEffect(() => {
    if (pollingQuery.data?.status !== "ok") {
      return;
    }

    void queryClient.invalidateQueries({ queryKey: authFilesQueryKey });
  }, [authFilesQueryKey, pollingQuery.data?.status, queryClient]);

  useEffect(() => {
    if (!pollingQuery.data) {
      return;
    }

    setLatestAuthStatus(pollingQuery.data);
  }, [pollingQuery.data]);

  const authFiles = authFilesQuery.data?.items ?? [];
  const activeFileName = authFiles.find((item) => !item.disabled)?.name ?? null;

  function setAuthFilesQueryData(updater: (current: CliProxyAuthFile[]) => CliProxyAuthFile[]) {
    queryClient.setQueryData<CliProxyAuthFilesResponse>(authFilesQueryKey, (current) => ({
      items: updater(current?.items ?? []),
    }));
  }

  const saveTargetMutation = useMutation({
    mutationFn: async (payload: {
      baseUrl: string;
      label: string;
      managementKey: string;
      apiKey: string;
    }) =>
      patchSettings({
        aiTargetBaseUrl: normalizeSettingsString(payload.baseUrl),
        aiTargetLabel: normalizeSettingsString(payload.label),
        aiTargetManagementKey: normalizeSettingsString(payload.managementKey),
        aiTargetApiKey: normalizeSettingsString(payload.apiKey),
      }),
    onSuccess: async (updatedSettings) => {
      if (updatedSettings.aiTargetBaseUrl && updatedSettings.aiTargetLabel) {
        writeAiTargetCache({
          baseUrl: updatedSettings.aiTargetBaseUrl,
          label: updatedSettings.aiTargetLabel,
        });
      } else {
        clearAiTargetCache();
      }

      await invalidateConnectionQueries(queryClient);
    },
  });

  const startMutation = useMutation({
    mutationFn: async () => client!.getCodexAuthUrl(),
    onSuccess: async ({ authorizationUrl, state }) => {
      if (authorizationUrl) {
        window.open(authorizationUrl, "_blank", "noopener,noreferrer");
      }

      queryClient.setQueryData<CliProxyAuthFilesResponse>(authFilesQueryKey, {
        items: [],
      });
      setLatestAuthStatus({ status: "wait" });
      setActiveState(state);
      await queryClient.invalidateQueries({ queryKey: ["cli-proxy-auth-status", state] });
    },
  });

  const activateMutation = useMutation({
    mutationFn: async (name: string) => {
      const currentItems = queryClient.getQueryData<CliProxyAuthFilesResponse>(authFilesQueryKey)?.items ?? [];

      for (const item of currentItems) {
        await client!.setAuthFileDisabled(item.name, item.name !== name);
      }
    },
    onMutate: async (name: string) => {
      setActivatingFileName(name);
      await queryClient.cancelQueries({ queryKey: authFilesQueryKey });
      const previous = queryClient.getQueryData<CliProxyAuthFilesResponse>(authFilesQueryKey);

      setAuthFilesQueryData((current) =>
        current.map((item) => ({
          ...item,
          disabled: item.name !== name,
        })),
      );

      return { previous };
    },
    onError: (_error, _name, context) => {
      if (context?.previous) {
        queryClient.setQueryData(authFilesQueryKey, context.previous);
      }
    },
    onSettled: async () => {
      setActivatingFileName(null);
      await authFilesQuery.refetch();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (name: string) => {
      await client!.deleteAuthFile(name);
    },
    onMutate: async (name: string) => {
      setDeletingFileName(name);
      await queryClient.cancelQueries({ queryKey: authFilesQueryKey });
      const previous = queryClient.getQueryData<CliProxyAuthFilesResponse>(authFilesQueryKey);

      setAuthFilesQueryData((current) => current.filter((item) => item.name !== name));

      return { previous };
    },
    onError: (_error, _name, context) => {
      if (context?.previous) {
        queryClient.setQueryData(authFilesQueryKey, context.previous);
      }
    },
    onSettled: async () => {
      setDeletingFileName(null);
      await authFilesQuery.refetch();
    },
  });

  const error =
    settingsQuery.error ??
    authFilesQuery.error ??
    saveTargetMutation.error ??
    startMutation.error ??
    activateMutation.error ??
    deleteMutation.error ??
    pollingQuery.error;

  return {
    target,
    authFiles,
    activeFileName,
    configInitialValue: {
      baseUrl: settingsQuery.data?.aiTargetBaseUrl ?? cachedTarget?.baseUrl ?? "",
      label: settingsQuery.data?.aiTargetLabel ?? cachedTarget?.label ?? "Windows",
      managementKey: settingsQuery.data?.aiTargetManagementKey ?? "",
      apiKey: settingsQuery.data?.aiTargetApiKey ?? "",
    },
    attemptMessage: getAttemptMessage(latestAuthStatus),
    isLoading: settingsQuery.isLoading,
    isError:
      settingsQuery.isError ||
      authFilesQuery.isError ||
      saveTargetMutation.isError ||
      startMutation.isError ||
      activateMutation.isError ||
      deleteMutation.isError ||
      pollingQuery.isError,
    errorMessage: error instanceof Error ? error.message : "Bağlantı bilgileri alınamadı.",
    isSavingTarget: saveTargetMutation.isPending,
    isStartingConnection: startMutation.isPending,
    activatingFileName,
    deletingFileName,
    canStartConnection: Boolean(target?.baseUrl && target?.managementKey),
    saveTarget: (payload: { baseUrl: string; label: string; managementKey: string; apiKey: string }) =>
      saveTargetMutation.mutate(payload),
    startConnection: () => startMutation.mutate(),
    activateAuthFile: (fileName: string) => activateMutation.mutate(fileName),
    deleteAuthFile: (fileName: string) => deleteMutation.mutate(fileName),
  };
}
