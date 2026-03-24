import { GenerationFieldRow } from "./GenerationFieldRow";
import { InsightBlocks } from "./InsightBlocks";
import { LiveAnalysisPanel } from "./LiveAnalysisPanel";
import { PrepModeHeader } from "./PrepModeHeader";
import { useEtsyPrepWorkspace } from "../hooks/useEtsyPrepWorkspace";

interface EtsyPrepWorkspaceProps {
  productId: string;
  onBack: () => void;
}

export function EtsyPrepWorkspace({ productId, onBack }: EtsyPrepWorkspaceProps) {
  const workspace = useEtsyPrepWorkspace(productId);

  if (workspace.isLoading) {
    return <p className="text-sm text-slate-500">Hazırlık alanı yükleniyor...</p>;
  }

  if (workspace.isError) {
    return <p className="text-sm text-rose-600">{workspace.errorMessage}</p>;
  }

  return (
    <div className="space-y-6">
      <PrepModeHeader
        isDirty={workspace.isDirty}
        isSaving={workspace.isSaving}
        saveMessage={workspace.saveMessage}
        saveError={workspace.saveError}
        connectorLabel={workspace.connectorBadgeLabel}
        generationBlockedReason={workspace.generationBlockedReason}
        onBack={onBack}
        onSave={workspace.saveWorkspace}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,0.9fr)]">
        <div className="space-y-6">
          <LiveAnalysisPanel
            status={workspace.analysisStatus}
            steps={workspace.liveSteps}
            error={workspace.analysisError}
            summary={workspace.researchSummary}
            onRetry={workspace.retryAnalysis}
          />

          <section className="space-y-4 rounded-[28px] border border-slate-200 bg-slate-50/70 p-5 shadow-sm">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.28em] text-slate-400">Alan Üretimi</p>
              <h3 className="mt-2 text-xl font-semibold text-slate-900">Title, description ve tags</h3>
            </div>

            <GenerationFieldRow
              label="Title"
              value={workspace.form.title}
              onChange={workspace.updateTitle}
              onGenerate={workspace.generateTitle}
              generateLabel="Title Üret"
              isGenerating={workspace.fieldStates.title.isGenerating}
              disabled={workspace.isSaving || !workspace.canGenerate}
              helperText={workspace.fieldStates.title.helper}
              error={workspace.fieldStates.title.error}
              placeholder="Etsy için başlık üretin"
            />

            <GenerationFieldRow
              label="Description"
              value={workspace.form.description}
              onChange={workspace.updateDescription}
              onGenerate={workspace.generateDescription}
              generateLabel="Description Üret"
              isGenerating={workspace.fieldStates.description.isGenerating}
              disabled={workspace.isSaving || !workspace.canGenerate}
              helperText={workspace.fieldStates.description.helper}
              error={workspace.fieldStates.description.error}
              multiline
              placeholder="Detaylı Etsy açıklaması"
            />

            <GenerationFieldRow
              label="Tags"
              value={workspace.form.tags}
              onChange={workspace.updateTags}
              onGenerate={workspace.generateTags}
              generateLabel="Tags Üret"
              isGenerating={workspace.fieldStates.tags.isGenerating}
              disabled={workspace.isSaving || !workspace.canGenerate}
              helperText={workspace.fieldStates.tags.helper}
              error={workspace.fieldStates.tags.error}
              multiline
              placeholder="comma, separated, tags"
            />
          </section>
        </div>

        <InsightBlocks
          seoNotes={workspace.form.seoNotes}
          policyNotes={workspace.form.policyNotes}
          riskNotes={workspace.riskNotes}
        />
      </div>
    </div>
  );
}
