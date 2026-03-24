import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  fetchSettings,
  fetchEtsyPrepWorkspace,
  saveEtsyPrepWorkspace,
  streamEtsyPrepAnalysis,
  streamEtsyPrepFieldPackage,
  type EtsyPrepBootstrapResponse,
  type EtsyPrepField,
  type EtsyPrepStreamEvent,
} from "../../../app/api";
import { readAiTargetCache } from "../../connections/lib/aiTargetStorage";
import { CliProxyRequestError, createCliProxyApiClient } from "../../connections/lib/cliProxyApi";
import { readNdjsonStream } from "../lib/readNdjsonStream";

interface WorkspaceFormState {
  title: string;
  description: string;
  tags: string;
  seoNotes: string;
  policyNotes: string;
}

interface PersistedInsightState {
  policyNotes: string;
  riskNotes: string;
}

export interface LiveAnalysisStep {
  id: string;
  label: string;
  status: "running" | "completed" | "error";
  detail?: string;
}

interface ResearchSummaryState {
  title?: string;
  keywordAngles?: string[];
  audienceThemes?: string[];
  policyNotes?: string[];
}

interface FieldGenerationState {
  isGenerating: boolean;
  error: string | null;
  helper: string | null;
  provider: string | null;
}

const emptyFormState: WorkspaceFormState = {
  title: "",
  description: "",
  tags: "",
  seoNotes: "",
  policyNotes: "",
};

const initialFieldGenerationState: Record<EtsyPrepField, FieldGenerationState> = {
  title: { isGenerating: false, error: null, helper: null, provider: null },
  description: { isGenerating: false, error: null, helper: null, provider: null },
  tags: { isGenerating: false, error: null, helper: null, provider: null },
};

function createInitialFieldGenerationState(): Record<EtsyPrepField, FieldGenerationState> {
  return {
    title: { ...initialFieldGenerationState.title },
    description: { ...initialFieldGenerationState.description },
    tags: { ...initialFieldGenerationState.tags },
  };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "İşlem tamamlanamadı.";
}

function mapDirectGenerationError(error: unknown) {
  if (error instanceof CliProxyRequestError && error.code === "TARGET_INFERENCE_UNAUTHORIZED") {
    return "Inference API key geçersiz. AI Bağlantıları sayfasından hedef ayarlarını güncelleyin.";
  }

  if (error instanceof CliProxyRequestError && error.code === "TARGET_REQUEST_TIMEOUT") {
    return "Hedef sunucu zamanında yanıt vermedi.";
  }

  return getErrorMessage(error);
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

function parseGeneratedFieldValue(field: EtsyPrepField, rawContent: string) {
  const content = rawContent.trim();

  if (!content) {
    throw new Error("AI yanıtı boş geldi.");
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(content) as Record<string, unknown>;
  } catch {
    throw new Error("AI yanıtı geçerli JSON formatında değil.");
  }

  if (typeof parsed.value === "string" && parsed.value.trim()) {
    return parsed.value.trim();
  }

  if (field === "title" && typeof parsed.title === "string" && parsed.title.trim()) {
    return parsed.title.trim();
  }

  if (field === "description") {
    if (typeof parsed.longDescription === "string" && parsed.longDescription.trim()) {
      return parsed.longDescription.trim();
    }

    if (typeof parsed.shortDescription === "string" && parsed.shortDescription.trim()) {
      return parsed.shortDescription.trim();
    }
  }

  if (field === "tags" && Array.isArray(parsed.tags)) {
    const tags = parsed.tags.map((item) => String(item).trim()).filter(Boolean);
    if (tags.length > 0) {
      return tags.join(", ");
    }
  }

  throw new Error("AI yanıtı beklenen alan formatında değil.");
}

function tagsToText(tags: string[]) {
  return tags.join(", ");
}

function parseTagsText(value: string) {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function toNullableString(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function parsePersistedInsights(policyNotes: string | null): PersistedInsightState {
  const value = policyNotes?.trim() ?? "";
  if (!value) {
    return { policyNotes: "", riskNotes: "" };
  }

  const policyAndRiskMatch = value.match(
    /^Etsy Uyum Kontrolleri:\n([\s\S]*?)(?:\n\nEksik Veri \/ Riskler:\n([\s\S]*))?$/,
  );
  if (policyAndRiskMatch) {
    return {
      policyNotes: policyAndRiskMatch[1]?.trim() ?? "",
      riskNotes: policyAndRiskMatch[2]?.trim() ?? "",
    };
  }

  const riskOnlyMatch = value.match(/^Eksik Veri \/ Riskler:\n([\s\S]*)$/);
  if (riskOnlyMatch) {
    return {
      policyNotes: "",
      riskNotes: riskOnlyMatch[1]?.trim() ?? "",
    };
  }

  return {
    policyNotes: value,
    riskNotes: "",
  };
}

function serializePersistedInsights(policyNotes: string, riskNotes: string) {
  const normalizedPolicyNotes = policyNotes.trim();
  const normalizedRiskNotes = riskNotes.trim();

  if (normalizedPolicyNotes && normalizedRiskNotes) {
    return `Etsy Uyum Kontrolleri:\n${normalizedPolicyNotes}\n\nEksik Veri / Riskler:\n${normalizedRiskNotes}`;
  }

  if (normalizedPolicyNotes) {
    return normalizedPolicyNotes;
  }

  if (normalizedRiskNotes) {
    return `Eksik Veri / Riskler:\n${normalizedRiskNotes}`;
  }

  return null;
}

function mapBootstrapToWorkspaceState(data: EtsyPrepBootstrapResponse): {
  form: WorkspaceFormState;
  riskNotes: string;
} {
  const persistedInsights = parsePersistedInsights(data.draft.policyNotes);
  return {
    form: {
      title: data.draft.englishTitle ?? "",
      description: data.draft.longDescription ?? "",
      tags: tagsToText(data.draft.tags),
      seoNotes: data.draft.seoNotes ?? "",
      policyNotes: persistedInsights.policyNotes,
    },
    riskNotes: persistedInsights.riskNotes,
  };
}

function createSnapshotSignature(
  form: WorkspaceFormState,
  riskNotes: string,
  generatedFields: EtsyPrepField[],
  editedFields: EtsyPrepField[],
) {
  return JSON.stringify({
    form,
    riskNotes,
    generatedFields: [...generatedFields].sort(),
    editedFields: [...editedFields].sort(),
  });
}

function formatStepLabel(step: string) {
  if (step === "fetch_listing_signals") {
    return "Signals";
  }

  if (step === "build_prompt_package") {
    return "Prompt Paketi";
  }

  return step.replace(/_/g, " ");
}

function summarizeCompletedEvent(event: Extract<EtsyPrepStreamEvent, { type: "step_completed" }>) {
  const keywordAngles = Array.isArray(event.signals?.keywordAngles) ? event.signals.keywordAngles.length : null;

  if (keywordAngles != null) {
    return `${keywordAngles} sinyal toplandı`;
  }

  const locale = typeof event.constraints?.locale === "string" ? event.constraints.locale : null;
  return locale ? `Prompt hazırlandı (${locale})` : "Adım tamamlandı";
}

export function useEtsyPrepWorkspace(productId: string) {
  const bootstrapQuery = useQuery({
    queryKey: ["etsy-prep-workspace", productId],
    enabled: Boolean(productId),
    queryFn: () => fetchEtsyPrepWorkspace(productId),
  });

  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: fetchSettings,
  });

  const cachedTarget = readAiTargetCache();
  const target = useMemo(() => buildAiTarget(settingsQuery.data, cachedTarget), [cachedTarget, settingsQuery.data]);
  const client = useMemo(() => (target ? createCliProxyApiClient(target) : null), [target]);

  const authFilesQuery = useQuery({
    queryKey: ["cli-proxy-auth-files", target?.baseUrl],
    enabled: Boolean(client && target?.managementKey),
    queryFn: () => client!.listAuthFiles(),
    retry: false,
  });

  const [form, setForm] = useState<WorkspaceFormState>(emptyFormState);
  const [generatedFields, setGeneratedFields] = useState<EtsyPrepField[]>([]);
  const [editedFields, setEditedFields] = useState<EtsyPrepField[]>([]);
  const [fieldStates, setFieldStates] = useState(createInitialFieldGenerationState);
  const [liveSteps, setLiveSteps] = useState<LiveAnalysisStep[]>([]);
  const [analysisStatus, setAnalysisStatus] = useState<"idle" | "running" | "completed" | "error">("idle");
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [researchSummary, setResearchSummary] = useState<ResearchSummaryState | null>(null);
  const [riskNotes, setRiskNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState(() => createSnapshotSignature(emptyFormState, "", [], []));
  const initializedProductRef = useRef<string | null>(null);
  const analysisStartedRef = useRef<string | null>(null);

  const currentSnapshot = useMemo(
    () => createSnapshotSignature(form, riskNotes, generatedFields, editedFields),
    [editedFields, form, generatedFields, riskNotes],
  );
  const isDirty = currentSnapshot !== savedSnapshot;

  function resetFieldStates() {
    setFieldStates(createInitialFieldGenerationState());
  }

  function updateLiveStep(id: string, nextStep: Omit<LiveAnalysisStep, "id">) {
    setLiveSteps((current) => {
      const index = current.findIndex((step) => step.id === id);
      const withId = { id, ...nextStep };

      if (index === -1) {
        return [...current, withId];
      }

      return current.map((step, stepIndex) => (stepIndex === index ? withId : step));
    });
  }

  function handleTextFieldChange(field: keyof WorkspaceFormState, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
    setSaveMessage(null);
    setSaveError(null);
  }

  function handleGeneratedFieldWrite(field: EtsyPrepField, value: string) {
    setForm((current) => ({
      ...current,
      [field === "title" ? "title" : field === "description" ? "description" : "tags"]: value,
    }));
    setGeneratedFields((current) => (current.includes(field) ? current : [...current, field]));
    setSaveMessage(null);
    setSaveError(null);
  }

  function handleEditablePrepFieldChange(field: EtsyPrepField, value: string) {
    handleTextFieldChange(field === "title" ? "title" : field === "description" ? "description" : "tags", value);
    setEditedFields((current) => (current.includes(field) ? current : [...current, field]));
  }

  useEffect(() => {
    if (!bootstrapQuery.data || initializedProductRef.current === productId) {
      return;
    }

    initializedProductRef.current = productId;
    analysisStartedRef.current = null;

    const nextWorkspaceState = mapBootstrapToWorkspaceState(bootstrapQuery.data);
    setForm(nextWorkspaceState.form);
    setGeneratedFields([]);
    setEditedFields([]);
    setLiveSteps([]);
    setResearchSummary(null);
    setRiskNotes(nextWorkspaceState.riskNotes);
    setAnalysisStatus("idle");
    setAnalysisError(null);
    resetFieldStates();
    setSaveError(null);
    setSaveMessage(null);
    setSavedSnapshot(createSnapshotSignature(nextWorkspaceState.form, nextWorkspaceState.riskNotes, [], []));
  }, [bootstrapQuery.data, productId]);

  useEffect(() => {
    if (!isDirty) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  async function runAnalysis() {
    if (!productId) {
      return;
    }

    setAnalysisStatus("running");
    setAnalysisError(null);
    setLiveSteps([]);
    setResearchSummary(null);

    try {
      const response = await streamEtsyPrepAnalysis(productId);
      await readNdjsonStream<EtsyPrepStreamEvent>(response, {
        onEvent: (event) => {
          if (event.type === "step_started") {
            updateLiveStep(`general:${event.step}`, {
              label: formatStepLabel(event.step),
              status: "running",
            });
          }

          if (event.type === "step_completed") {
            updateLiveStep(`general:${event.step}`, {
              label: formatStepLabel(event.step),
              status: "completed",
              detail: summarizeCompletedEvent(event),
            });
          }

          if (event.type === "research_summary") {
            setResearchSummary(event.summary);
          }

          if (event.type === "result_ready") {
            const nextRiskNotes = event.result.insights.riskNotes ?? event.result.insights.merchandisingNotes ?? "";
            setRiskNotes(nextRiskNotes);
            setForm((current) => ({
              ...current,
              seoNotes: current.seoNotes.trim() ? current.seoNotes : event.result.insights.seoNotes ?? "",
              policyNotes: current.policyNotes.trim() ? current.policyNotes : event.result.insights.policyNotes ?? "",
            }));
          }
        },
      });

      setAnalysisStatus("completed");
    } catch (error) {
      setAnalysisStatus("error");
      setAnalysisError(getErrorMessage(error));
      setLiveSteps((current) =>
        current.length > 0
          ? current.map((step, index) => (index === current.length - 1 ? { ...step, status: "error" } : step))
          : [{ id: "general:error", label: "Analiz", status: "error", detail: getErrorMessage(error) }],
      );
    }
  }

  useEffect(() => {
    if (!bootstrapQuery.data || analysisStartedRef.current === productId) {
      return;
    }

    analysisStartedRef.current = productId;
    void runAnalysis();
  }, [bootstrapQuery.data, productId]);

  async function generateField(field: EtsyPrepField) {
    if (!productId) {
      return;
    }

    setFieldStates((current) => ({
      ...current,
      [field]: {
        isGenerating: true,
        error: null,
        helper: "Prompt hazırlanıyor...",
        provider: current[field].provider,
      },
    }));
    setSaveMessage(null);
    setSaveError(null);

    try {
      const streamResponse = await streamEtsyPrepFieldPackage(productId, field);

      const events = await readNdjsonStream<EtsyPrepStreamEvent>(streamResponse, {
        onEvent: (event) => {
          if (event.type === "step_started" && event.field === field) {
            setFieldStates((current) => ({
              ...current,
              [field]: {
                ...current[field],
                helper: "Prompt paketi hazırlanıyor...",
              },
            }));
          }

          if (event.type === "step_completed" && event.field === field) {
            setFieldStates((current) => ({
              ...current,
              [field]: {
                ...current[field],
                helper: "Direct inference çağrısı hazırlanıyor...",
              },
            }));
          }

          if (event.type === "prompt_ready" && event.field === field) {
            setFieldStates((current) => ({
              ...current,
              [field]: {
                ...current[field],
                helper: "Hedef AI üzerinden üretiliyor...",
              },
            }));
          }
        },
      });

      const promptPackage = events.find(
        (event): event is Extract<EtsyPrepStreamEvent, { type: "prompt_ready" }> =>
          event.type === "prompt_ready" && event.field === field,
      );

      if (!promptPackage) {
        throw new Error("Prompt paketi alınamadı.");
      }

      if (!client) {
        throw new Error("AI hedefi hazır değil.");
      }

      const completion = await client.createChatCompletion({
        messages: [
          {
            role: "system",
            content: "You generate Etsy listing fields. Return valid JSON only.",
          },
          {
            role: "user",
            content: `${promptPackage.prompt}\n\nCONTEXT: ${JSON.stringify(promptPackage.context)}`,
          },
        ],
        response_format: {
          type: "json_object",
        },
        temperature: 0.2,
      });
      const generatedValue = parseGeneratedFieldValue(field, completion.choices[0]?.message?.content ?? "");

      handleGeneratedFieldWrite(field, generatedValue);
      setFieldStates((current) => ({
        ...current,
        [field]: {
          isGenerating: false,
          error: null,
          helper: target?.label ? `${target.label} hedefi ile üretildi` : "AI hedefi ile üretildi",
          provider: target?.label ?? "cli-proxy",
        },
      }));
    } catch (error) {
      setFieldStates((current) => ({
        ...current,
        [field]: {
          ...current[field],
          isGenerating: false,
          error: mapDirectGenerationError(error),
          helper: null,
        },
      }));
    }
  }

  async function saveWorkspace() {
    if (!productId || !bootstrapQuery.data) {
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveMessage(null);

    try {
      const savedDraft = await saveEtsyPrepWorkspace(productId, {
        englishTitle: toNullableString(form.title),
        longDescription: toNullableString(form.description),
        tags: parseTagsText(form.tags),
        seoNotes: toNullableString(form.seoNotes),
        policyNotes: serializePersistedInsights(form.policyNotes, riskNotes),
        generatedFields,
        editedFields,
      });

      const nextWorkspaceState = mapBootstrapToWorkspaceState({
        product: bootstrapQuery.data.product,
        draft: savedDraft,
      });

      setForm(nextWorkspaceState.form);
      setRiskNotes(nextWorkspaceState.riskNotes);
      setGeneratedFields([]);
      setEditedFields([]);
      setSavedSnapshot(createSnapshotSignature(nextWorkspaceState.form, nextWorkspaceState.riskNotes, [], []));
      setSaveMessage("Kaydedildi");
    } catch (error) {
      setSaveError(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  const activeAuthFile = authFilesQuery.data?.items.find((item) => !item.disabled) ?? null;
  const hasTargetConfiguration = Boolean(target?.baseUrl && target?.managementKey && target?.apiKey);
  const canGenerate = Boolean(hasTargetConfiguration && activeAuthFile);

  const generationBlockedReason = settingsQuery.isPending
    ? "AI hedef ayarları yükleniyor..."
    : settingsQuery.isError
      ? "AI hedef ayarları alınamadı. AI Bağlantıları sayfasından bağlantıyı kontrol edin."
      : !hasTargetConfiguration
        ? "AI hedef ayarları eksik. AI Bağlantıları sayfasından Windows hedefini kaydedin."
        : authFilesQuery.isError
          ? "AI bağlantı servisine ulaşılamıyor. AI Bağlantıları sayfasından bağlantıyı kontrol edin."
          : authFilesQuery.isPending
            ? "Bağlı Codex hesabı kontrol ediliyor..."
            : !activeAuthFile
              ? "Üretim için en az bir etkin Codex hesabı gerekli."
              : null;

  return {
    product: bootstrapQuery.data?.product ?? null,
    connectorBadgeLabel: target?.label
      ? activeAuthFile
        ? `${target.label} • ${activeAuthFile.label}`
        : `${target.label} • hesap yok`
      : null,
    form,
    liveSteps,
    researchSummary,
    riskNotes,
    analysisStatus,
    analysisError,
    fieldStates,
    isLoading: bootstrapQuery.isLoading,
    isError: bootstrapQuery.isError,
    errorMessage: bootstrapQuery.error instanceof Error ? bootstrapQuery.error.message : "Hazırlık alanı yüklenemedi.",
    isDirty,
    isSaving,
    saveError,
    saveMessage,
    canGenerate,
    generationBlockedReason,
    updateTitle: (value: string) => handleEditablePrepFieldChange("title", value),
    updateDescription: (value: string) => handleEditablePrepFieldChange("description", value),
    updateTags: (value: string) => handleEditablePrepFieldChange("tags", value),
    generateTitle: () => generateField("title"),
    generateDescription: () => generateField("description"),
    generateTags: () => generateField("tags"),
    retryAnalysis: runAnalysis,
    saveWorkspace,
  };
}
