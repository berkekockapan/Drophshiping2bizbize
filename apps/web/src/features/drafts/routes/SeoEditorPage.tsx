import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useParams } from "react-router-dom";

import {
  connectorGenerate,
  fetchDraft,
  fetchProductDetail,
  patchDraft,
  saveGeneratedDraft,
} from "../../../app/api";
import { ownerOptions, type OwnerKey } from "../../shared/lib/ownerRouteState";
import { DraftEditor } from "../components/DraftEditor";
import { SourceProductPanel } from "../components/SourceProductPanel";

function isOwnerKey(value: string | undefined): value is OwnerKey {
  return ownerOptions.some((owner) => owner.key === value);
}

export function SeoEditorPage() {
  const queryClient = useQueryClient();
  const params = useParams<{ ownerKey: string; productId: string }>();
  const ownerKey = isOwnerKey(params.ownerKey) ? params.ownerKey : null;
  const productId = params.productId ?? "prod_1";

  const detailQuery = useQuery({
    queryKey: ["product-detail", ownerKey, productId],
    queryFn: () => fetchProductDetail(ownerKey as OwnerKey, productId),
    enabled: Boolean(ownerKey && productId),
  });

  const draftQuery = useQuery({
    queryKey: ["draft", ownerKey, productId],
    queryFn: () => fetchDraft(ownerKey as OwnerKey, productId),
    enabled: Boolean(ownerKey && productId),
  });

  const [draftMeta, setDraftMeta] = useState({
    manualEditsPresent: false,
    allowOverwrite: true,
  });

  const generateTitleMutation = useMutation({
    mutationFn: async () => {
      if (!detailQuery.data || !ownerKey) {
        throw new Error("Product detail is not ready");
      }

      const generated = await connectorGenerate({
        productId,
        language: "en",
        sourceTitle: detailQuery.data.product.title ?? "Untitled product",
        sourceDescription: detailQuery.data.product.descriptionRaw,
        sourceAttributes: detailQuery.data.product.attributes ?? [],
      });

      const savedDraft = await saveGeneratedDraft(ownerKey, productId, {
        overwrite: !draftMeta.manualEditsPresent || draftMeta.allowOverwrite,
        generated: {
          englishTitle: generated.englishTitle,
          shortDescription: generated.shortDescription,
          longDescription: generated.longDescription,
          tags: generated.tags,
          materials: generated.materials,
          attributes: generated.attributes,
          seoNotes: generated.seoNotes,
          policyNotes: generated.policyNotes,
        },
      });

      return savedDraft;
    },
    onSuccess: (savedDraft) => {
      queryClient.setQueryData<{ draft: typeof savedDraft; prompt: unknown } | undefined>(["draft", ownerKey, productId], (previous) => ({
        draft: savedDraft,
        prompt: previous?.prompt ?? null,
      }));
    },
  });

  const saveDraftMutation = useMutation({
    mutationFn: (draft: { englishTitle: string; shortDescription: string; longDescription: string }) =>
      patchDraft(ownerKey as OwnerKey, productId, {
        englishTitle: draft.englishTitle,
        shortDescription: draft.shortDescription,
        longDescription: draft.longDescription,
      }),
    onSuccess: (savedDraft) => {
      queryClient.setQueryData<{ draft: typeof savedDraft; prompt: unknown } | undefined>(["draft", ownerKey, productId], (previous) => ({
        draft: savedDraft,
        prompt: previous?.prompt ?? null,
      }));
    },
  });

  if (!ownerKey) {
    return <p className="text-sm text-rose-600">Owner bulunamadı.</p>;
  }

  const sourceDetail = detailQuery.data;
  const draft = draftQuery.data?.draft;

  return (
    <div className="space-y-6">
      {detailQuery.isLoading || draftQuery.isLoading ? (
        <p className="text-sm text-slate-500">SEO editör verileri yükleniyor...</p>
      ) : null}
      {detailQuery.isError || draftQuery.isError ? (
        <p className="text-sm text-rose-600">SEO editör verileri alınamadı.</p>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <SourceProductPanel
          title={sourceDetail?.product.title ?? undefined}
          brand={sourceDetail?.product.brand ?? undefined}
          category={sourceDetail?.product.category ?? undefined}
          variantSummary={sourceDetail ? `${sourceDetail.variants.length} varyasyon` : undefined}
        />

        <DraftEditor
          key={`${ownerKey}-${productId}-${draft?.generatedVersion ?? 0}-${draft?.editedVersion ?? 0}`}
          initialValue={{
            englishTitle: draft?.englishTitle ?? "",
            shortDescription: draft?.shortDescription ?? "",
            longDescription: draft?.longDescription ?? "",
          }}
          generatedTitle={draft?.englishTitle ?? null}
          isGeneratingTitle={generateTitleMutation.isPending}
          isSaving={saveDraftMutation.isPending}
          connectorOnline
          onGenerateTitle={() => generateTitleMutation.mutate()}
          onSave={(nextState) => saveDraftMutation.mutate(nextState)}
          onMetaChange={setDraftMeta}
        />
      </div>
    </div>
  );
}
