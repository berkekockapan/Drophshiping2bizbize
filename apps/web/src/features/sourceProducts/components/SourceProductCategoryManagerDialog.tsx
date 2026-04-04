import { useEffect, useState } from "react";

import type { SourceProductCategory } from "../../../app/api";

interface SourceProductCategoryManagerDialogProps {
  open: boolean;
  categories: SourceProductCategory[];
  errorMessage: string | null;
  onClose: () => void;
  onCreate: (name: string) => void;
  onRename: (categoryId: string, name: string) => void;
  onDelete: (categoryId: string) => void;
}

export function SourceProductCategoryManagerDialog({
  open,
  categories,
  errorMessage,
  onClose,
  onCreate,
  onRename,
  onDelete,
}: SourceProductCategoryManagerDialogProps) {
  const [newName, setNewName] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    setDrafts(Object.fromEntries(categories.map((category) => [category.id, category.name])));
  }, [categories]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" role="presentation">
      <div
        className="w-full max-w-2xl rounded-[28px] bg-white p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="source-product-category-manager-title"
      >
        <div className="flex items-center justify-between gap-4">
          <h3 id="source-product-category-manager-title" className="text-xl font-semibold text-slate-900">
            Kategorileri Yönet
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-600"
          >
            Kapat
          </button>
        </div>

        <div className="mt-6 rounded-3xl bg-slate-50 p-4">
          <label className="block text-sm font-medium text-slate-700" htmlFor="new-source-product-category-name">
            Yeni kategori
          </label>
          <div className="mt-2 flex gap-2">
            <input
              id="new-source-product-category-name"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm"
            />
            <button
              type="button"
              onClick={() => {
                onCreate(newName.trim());
                setNewName("");
              }}
              className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white"
            >
              Kategori oluştur
            </button>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {categories.length === 0 ? <p className="text-sm text-slate-500">Henüz kategori yok.</p> : null}
          {categories.map((category) => (
            <div key={category.id} className="flex items-center gap-2 rounded-2xl border border-slate-200 p-3">
              <label className="sr-only" htmlFor={`source-product-category-name-${category.id}`}>
                {`Kategori adı ${category.id}`}
              </label>
              <input
                id={`source-product-category-name-${category.id}`}
                value={drafts[category.id] ?? category.name}
                onChange={(event) => setDrafts((current) => ({ ...current, [category.id]: event.target.value }))}
                className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm"
              />
              <button
                type="button"
                onClick={() => onRename(category.id, (drafts[category.id] ?? category.name).trim())}
                aria-label={`Kaydet ${category.id}`}
                className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700"
              >
                Kaydet
              </button>
              <button
                type="button"
                onClick={() => onDelete(category.id)}
                aria-label={`Sil ${category.id}`}
                className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700"
              >
                Sil
              </button>
            </div>
          ))}
        </div>

        {errorMessage ? <p className="mt-4 text-sm text-rose-600">{errorMessage}</p> : null}
      </div>
    </div>
  );
}
