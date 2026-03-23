import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  connectorGenerateField,
  fetchConnectorHealth,
  fetchEtsyPrepWorkspace,
  saveEtsyPrepWorkspace,
  streamEtsyPrepAnalysis,
  streamEtsyPrepFieldPackage,
  type EtsyPrepBootstrapResponse,
  type EtsyPrepField,
  type EtsyPrepStreamEvent,
} from "../../../app/api";
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
  const connectorHealthQuery = useQuery({
    queryKey: ["connector-health"],
    enabled: Boolean(bootstrapQuery.data?.connectorProfileSnapshot),
    queryFn: fetchConnectorHealth,
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
                helper: "Connector çağrısı hazırlanıyor...",
              },
            }));
          }

          if (event.type === "prompt_ready" && event.field === field) {
            setFieldStates((current) => ({
              ...current,
              [field]: {
                ...current[field],
                helper: "Connector üzerinden üretiliyor...",
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

      const generated = await connectorGenerateField({
        field,
        prompt: promptPackage.prompt,
        context: promptPackage.context,
      });

      handleGeneratedFieldWrite(field, generated.value);
      setFieldStates((current) => ({
        ...current,
        [field]: {
          isGenerating: false,
          error: null,
          helper: `${generated.provider} ile üretildi`,
          provider: generated.provider,
        },
      }));
    } catch (error) {
      setFieldStates((current) => ({
        ...current,
        [field]: {
          ...current[field],
          isGenerating: false,
          error: getErrorMessage(error),
          helper: null,
        },
      }));
    }
  }

  async function saveWorkspace() {
    if (!productId) {
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
        product: bootstrapQuery.data?.product ?? null,
        draft: savedDraft,
        connectorProfileSnapshot: bootstrapQuery.data?.connectorProfileSnapshot ?? null,
      } as EtsyPrepBootstrapResponse);

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

  const connectorProfileSnapshot = bootstrapQuery.data?.connectorProfileSnapshot ?? null;
  const connectorHealth = connectorHealthQuery.data ?? null;
  const canGenerate = Boolean(connectorProfileSnapshot) && Boolean(connectorHealth?.activeProfile);

  const generationBlockedReason = !connectorProfileSnapshot
    ? "Alan üretimi için aktif bir connector profili gerekli."
    : connectorHealthQuery.isError
      ? "Local connector ulaşılamıyor. AI Bağlantıları sayfasından bağlantıyı kontrol edin."
      : connectorHealthQuery.isPending
        ? "Connector durumu kontrol ediliyor..."
        : !connectorHealth?.activeProfile
          ? "Aktif connector profili bulunamadı. AI Bağlantıları sayfasından bir profil seçin."
          : null;

  return {
    product: bootstrapQuery.data?.product ?? null,
    connectorProfileSnapshot,
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
