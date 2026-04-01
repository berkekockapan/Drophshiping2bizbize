import { useState, type FormEvent } from "react";
import type { CreateSourceProductRequest } from "@trendyol-etsy/shared";

interface SourceProductFormProps {
  isSubmitting: boolean;
  error: string | null;
  onSubmit: (payload: CreateSourceProductRequest) => void;
}

export function SourceProductForm({ isSubmitting, error, onSubmit }: SourceProductFormProps) {
  const [sourceTitle, setSourceTitle] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourcePlatform, setSourcePlatform] = useState<CreateSourceProductRequest["sourcePlatform"]>("SHOPIER");
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedTitle = sourceTitle.trim();
    const trimmedUrl = sourceUrl.trim();
    const trimmedNote = note.trim();

    if (!trimmedTitle || !trimmedUrl) {
      setFormError("Kaynak baslik ve kaynak link gerekli");
      return;
    }

    setFormError(null);
    onSubmit({
      sourceTitle: trimmedTitle,
      sourceUrl: trimmedUrl,
      sourcePlatform,
      note: trimmedNote ? trimmedNote : null,
    });

    setSourceTitle("");
    setSourceUrl("");
    setSourcePlatform("SHOPIER");
    setNote("");
  }

  return (
    <form className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-2 text-sm font-medium text-slate-700 md:col-span-2">
          <span>Kaynak baslik</span>
          <input
            value={sourceTitle}
            onChange={(event) => setSourceTitle(event.target.value)}
            placeholder="Ornek ürün adı"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#F1641E]"
          />
        </label>

        <label className="block space-y-2 text-sm font-medium text-slate-700">
          <span>Kaynak link</span>
          <input
            value={sourceUrl}
            onChange={(event) => setSourceUrl(event.target.value)}
            placeholder="https://shopier.com/..."
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#F1641E]"
          />
        </label>

        <label className="block space-y-2 text-sm font-medium text-slate-700">
          <span>Kaynak platformu</span>
          <select
            value={sourcePlatform}
            onChange={(event) => setSourcePlatform(event.target.value as CreateSourceProductRequest["sourcePlatform"])}
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
          rows={5}
          placeholder="Bu ürün için kısa not..."
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#F1641E]"
        />
      </label>

      {formError ? <p className="mt-3 text-sm text-rose-600">{formError}</p> : null}
      {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}

      <button
        type="submit"
        className="mt-4 rounded-2xl bg-[#F1641E] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#d95518]"
      >
        {isSubmitting ? "Kaydediliyor..." : "Kaynak urunu kaydet"}
      </button>
    </form>
  );
}
