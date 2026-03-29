import { GenerationFieldRow } from "./GenerationFieldRow";
import { ImagePromptPackCard } from "./ImagePromptPackCard";
import { InsightBlocks } from "./InsightBlocks";
import { ListingPromptPackCard } from "./ListingPromptPackCard";
import { LiveAnalysisPanel } from "./LiveAnalysisPanel";
import { PrepModeHeader } from "./PrepModeHeader";
import { useEtsyPrepWorkspace } from "../hooks/useEtsyPrepWorkspace";
import type { OwnerKey } from "../../shared/lib/ownerRouteState";

interface EtsyPrepWorkspaceProps {
  ownerKey: OwnerKey;
  productId: string;
  onBack: () => void;
}

function formatPromptPackMeta(
  snapshot:
    | {
        attributeCount: number;
        variantCount: number;
        imageCount: number;
      }
    | null
    | undefined,
) {
  if (!snapshot) {
    return null;
  }

  return `${snapshot.attributeCount} özellik • ${snapshot.variantCount} varyant • ${snapshot.imageCount} referans görsel`;
}

export function EtsyPrepWorkspace({ ownerKey, productId, onBack }: EtsyPrepWorkspaceProps) {
  const workspace = useEtsyPrepWorkspace(ownerKey, productId);
  const promptPackMeta = formatPromptPackMeta(workspace.promptPack?.productSnapshot);

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

          {workspace.isPromptPackLoading ? (
            <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Prompt pack yukleniyor...</p>
            </section>
          ) : null}

          {workspace.promptPackError ? (
            <section className="rounded-[28px] border border-rose-200 bg-rose-50 p-5 shadow-sm">
              <p className="text-sm text-rose-700">{workspace.promptPackError}</p>
            </section>
          ) : null}

          {workspace.promptPack?.systemListingPromptPack &&
          workspace.promptPack?.chatGptResearchPromptPack &&
          workspace.promptPack?.imagePromptPack ? (
            <>
              <ListingPromptPackCard
                researchPrompt={workspace.promptPack.chatGptResearchPromptPack.prompt}
                systemPrompt={workspace.promptPack.systemListingPromptPack.prompt}
                rulebookVersion={workspace.promptPack.rulebookVersion}
                snapshotMeta={promptPackMeta}
                onCopyResearch={workspace.copyResearchPrompt}
                onCopySystem={workspace.copySystemPrompt}
                onGenerate={workspace.generateListingPack}
                copyMessage={workspace.copyMessage}
                error={workspace.listingPackState.error}
                provider={workspace.listingPackState.provider}
                isGenerating={workspace.listingPackState.isGenerating}
                generateDisabled={!workspace.canGenerateListingPack || workspace.isSaving}
              />
              <ImagePromptPackCard
                mainPrompt={workspace.promptPack.imagePromptPack.mainPrompt}
                variations={workspace.promptPack.imagePromptPack.variations}
                guardrailSummary={workspace.promptPack.imagePromptPack.guardrailSummary}
                snapshotMeta={promptPackMeta}
                onCopyMain={workspace.copyImageMainPrompt}
                onCopyVariations={workspace.copyImageVariations}
              />
            </>
          ) : null}

          <section className="space-y-4 rounded-[28px] border border-slate-200 bg-slate-50/70 p-5 shadow-sm">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.28em] text-slate-400">Alan Editoru</p>
              <h3 className="mt-2 text-xl font-semibold text-slate-900">
                Title, description ve tags uzerinde son duzeltmeler
              </h3>
            </div>

            <GenerationFieldRow
              label="Title"
              value={workspace.form.title}
              onChange={workspace.updateTitle}
              disabled={workspace.isSaving}
              placeholder="Etsy icin baslik"
            />

            <GenerationFieldRow
              label="Description"
              value={workspace.form.description}
              onChange={workspace.updateDescription}
              disabled={workspace.isSaving}
              multiline
              placeholder="Detayli Etsy aciklamasi"
            />

            <GenerationFieldRow
              label="Tags"
              value={workspace.form.tags}
              onChange={workspace.updateTags}
              disabled={workspace.isSaving}
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
