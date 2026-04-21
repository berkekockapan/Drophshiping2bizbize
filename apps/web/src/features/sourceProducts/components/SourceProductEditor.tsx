import { useEffect, useState } from "react";
import type { PatchSourceProductRequest, SourceProductDetail } from "@dropshiping2bizbize/shared";

interface SourceProductEditorProps {
  product: SourceProductDetail;
  isSaving: boolean;
  error: string | null;
  onSave: (payload: PatchSourceProductRequest) => void;
}

export function SourceProductEditor({ product, isSaving, error, onSave }: SourceProductEditorProps) {
  const [sourceTitle, setSourceTitle] = useState(product.sourceTitle);
  const [sourceUrl, setSourceUrl] = useState(product.sourceUrl);
  const [sourcePlatform, setSourcePlatform] = useState<SourceProductDetail["sourcePlatform"]>(product.sourcePlatform);
  const [note, setNote] = useState(product.note ?? "");

  useEffect(() => {
    setSourceTitle(product.sourceTitle);
    setSourceUrl(product.sourceUrl);
    setSourcePlatform(product.sourcePlatform);
    setNote(product.note ?? "");
  }, [product.id, product.sourceTitle, product.sourceUrl, product.sourcePlatform, product.note]);

  return (
    <form
      className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm"
      onSubmit={(event) => {
        event.preventDefault();
        onSave({
          sourceTitle: sourceTitle.trim(),
          sourceUrl: sourceUrl.trim(),
          sourcePlatform,
          note: note.trim() ? note.trim() : null,
        });
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-2 text-sm font-medium text-slate-700 md:col-span-2">
          <span>Kaynak baslik</span>
          <input
            value={sourceTitle}
            onChange={(event) => setSourceTitle(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#F1641E]"
          />
        </label>
        <label className="block space-y-2 text-sm font-medium text-slate-700">
          <span>Kaynak link</span>
          <input
            value={sourceUrl}
            onChange={(event) => setSourceUrl(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#F1641E]"
          />
        </label>
        <label className="block space-y-2 text-sm font-medium text-slate-700">
          <span>Kaynak platformu</span>
          <select
            value={sourcePlatform}
            onChange={(event) => setSourcePlatform(event.target.value as SourceProductDetail["sourcePlatform"])}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#F1641E]"
          >
            <option value="SHOPIER">Shopier</option>
            <option value="CUSTOM_SITE">Kendi sitesi</option>
            <option value="OTHER">Diger</option>
          </select>
        </label>
      </div>

      <label className="mt-4 block space-y-2 text-sm font-medium text-slate-700">
        <span>Kisisel not</span>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={6}
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#F1641E]"
        />
      </label>

      {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}

      <button
        type="submit"
        className="mt-4 rounded-2xl bg-[#F1641E] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#d95518]"
      >
        {isSaving ? "Kaydediliyor..." : "Degisiklikleri kaydet"}
      </button>
    </form>
  );
}

