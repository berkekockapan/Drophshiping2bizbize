import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type ChangeEvent, type FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  createPromptLibraryCard,
  createPromptLibraryPage,
  deletePromptLibraryCard,
  deletePromptLibraryPage,
  fetchPromptLibrary,
  type PromptLibraryCard,
  type PromptLibraryPage,
  updatePromptLibraryCard,
  updatePromptLibraryPage,
  uploadPromptLibraryImage,
} from "../../../app/api";
import { getDefaultOwnerKey, type OwnerKey } from "../../shared/lib/ownerRouteState";

interface CardFormState {
  title: string;
  promptMarkdown: string;
  imageR2Key: string | null;
  imageContentType: string | null;
}

const emptyCardForm: CardFormState = {
  title: "",
  promptMarkdown: "",
  imageR2Key: null,
  imageContentType: null,
};

function createCardFormFromCard(card: PromptLibraryCard): CardFormState {
  return {
    title: card.title,
    promptMarkdown: card.promptMarkdown,
    imageR2Key: card.imageR2Key,
    imageContentType: card.imageContentType,
  };
}

function MarkdownPreview({ value }: { value: string }) {
  const blocks = value.trim() ? value.split(/\n{2,}/) : ["Henüz prompt yazılmadı."];

  return (
    <div className="space-y-3 text-sm leading-6 text-slate-700">
      {blocks.map((block, index) => {
        const trimmed = block.trim();
        if (trimmed.startsWith("### ")) {
          return (
            <h4 key={index} className="text-base font-semibold text-slate-900">
              {trimmed.slice(4)}
            </h4>
          );
        }
        if (trimmed.startsWith("## ")) {
          return (
            <h3 key={index} className="text-lg font-semibold text-slate-900">
              {trimmed.slice(3)}
            </h3>
          );
        }
        if (trimmed.startsWith("# ")) {
          return (
            <h2 key={index} className="text-xl font-semibold text-slate-900">
              {trimmed.slice(2)}
            </h2>
          );
        }
        if (/^[-*] /m.test(trimmed)) {
          return (
            <ul key={index} className="list-disc space-y-1 pl-5">
              {trimmed
                .split("\n")
                .filter(Boolean)
                .map((line, lineIndex) => (
                  <li key={lineIndex}>{line.replace(/^[-*]\s+/, "")}</li>
                ))}
            </ul>
          );
        }
        return (
          <p key={index} className="whitespace-pre-wrap">
            {trimmed}
          </p>
        );
      })}
    </div>
  );
}

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch {
      // Bazı gömülü tarayıcılar clipboard iznini reddedebilir; eski ama güvenli fallback kullanılır.
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

function PromptCard({
  card,
  onCopy,
  onEdit,
  onDelete,
}: {
  card: PromptLibraryCard;
  onCopy: (card: PromptLibraryCard) => void;
  onEdit: (card: PromptLibraryCard) => void;
  onDelete: (card: PromptLibraryCard) => void;
}) {
  const isMaster = card.cardType === "master";

  return (
    <article
      className={`group cursor-pointer overflow-hidden rounded-3xl border bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-[#F1641E]/40 hover:shadow-md ${
        isMaster ? "border-[#F1641E]/35" : "border-slate-200"
      }`}
      onClick={() => onCopy(card)}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onCopy(card);
        }
      }}
      title="Promptu kopyala"
    >
      {card.imageUrl ? (
        <div className="flex aspect-[4/3] items-center justify-center overflow-hidden bg-slate-100">
          <img src={card.imageUrl} alt={card.title} className="max-h-full max-w-full object-contain object-center transition group-hover:scale-[1.02]" />
        </div>
      ) : (
        <div className="flex aspect-[4/3] items-center justify-center bg-slate-100 px-6 text-center text-sm text-slate-500">
          {isMaster ? "Master Prompt kartı" : "Görsel eklenmedi"}
        </div>
      )}

      <div className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{isMaster ? "Master" : "Prompt Kartı"}</p>
            <h3 className="mt-1 text-lg font-semibold text-slate-950">{card.title}</h3>
          </div>
          <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-[#F1641E]">Tıkla kopyala</span>
        </div>

        <div className="max-h-36 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <MarkdownPreview value={card.promptMarkdown} />
        </div>

        <div className="flex flex-wrap gap-2" onClick={(event) => event.stopPropagation()}>
          <button
            type="button"
            className="rounded-2xl bg-[#051125] px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            onClick={() => onCopy(card)}
          >
            Promptu kopyala
          </button>
          <button
            type="button"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-[#F1641E] hover:text-[#F1641E]"
            onClick={() => onEdit(card)}
          >
            Düzenle
          </button>
          {!isMaster ? (
            <button
              type="button"
              className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
              onClick={() => onDelete(card)}
            >
              Sil
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function CardEditor({
  ownerKey,
  selectedPage,
  editingCard,
  onDone,
}: {
  ownerKey: OwnerKey;
  selectedPage: PromptLibraryPage | null;
  editingCard: PromptLibraryCard | null;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CardFormState>(editingCard ? createCardFormFromCard(editingCard) : emptyCardForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(editingCard?.imageUrl ?? null);
  const [saveWarning, setSaveWarning] = useState<string | null>(null);
  const selectedFileName = imageFile?.name ?? (editingCard?.imageR2Key ? "Kayıtlı görsel var" : null);

  useEffect(() => {
    setForm(editingCard ? createCardFormFromCard(editingCard) : emptyCardForm);
    setImageFile(null);
    setPreviewUrl(editingCard?.imageUrl ?? null);
    setSaveWarning(null);
  }, [editingCard]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPage) throw new Error("Önce bir sayfa seçmelisin.");
      setSaveWarning(null);

      const basePayload = {
        title: form.title,
        promptMarkdown: form.promptMarkdown,
      };

      if (editingCard) {
        if (!imageFile) {
          return updatePromptLibraryCard(ownerKey, editingCard.id, {
            ...basePayload,
            imageR2Key: form.imageR2Key,
            imageContentType: form.imageContentType,
          });
        }

        const savedText = await updatePromptLibraryCard(ownerKey, editingCard.id, basePayload);
        try {
          const uploaded = await uploadPromptLibraryImage(ownerKey, imageFile);
          return updatePromptLibraryCard(ownerKey, editingCard.id, {
            ...basePayload,
            imageR2Key: uploaded.imageR2Key,
            imageContentType: uploaded.imageContentType,
          });
        } catch {
          setSaveWarning("Prompt metni kaydedildi; ancak görsel yüklenemedi. Görseli tekrar deneyebilirsin.");
          return savedText;
        }
      }

      const created = await createPromptLibraryCard(ownerKey, selectedPage.id, {
        ...basePayload,
        imageR2Key: null,
        imageContentType: null,
      });

      if (!imageFile) {
        return created;
      }

      try {
        const uploaded = await uploadPromptLibraryImage(ownerKey, imageFile);
        return updatePromptLibraryCard(ownerKey, created.card.id, {
          ...basePayload,
          imageR2Key: uploaded.imageR2Key,
          imageContentType: uploaded.imageContentType,
        });
      } catch {
        setSaveWarning("Prompt metni kaydedildi; ancak görsel yüklenemedi. Görseli kartı düzenleyerek tekrar ekleyebilirsin.");
        return created;
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["prompt-library", ownerKey] });
      onDone();
      setForm(emptyCardForm);
      setImageFile(null);
      setPreviewUrl(null);
    },
  });

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setSaveWarning(null);
    setImageFile(file);
    setPreviewUrl(file ? URL.createObjectURL(file) : editingCard?.imageUrl ?? null);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaveWarning(null);
    saveMutation.mutate();
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-slate-400">{editingCard ? "Kart düzenle" : "Yeni kart"}</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-950">
            {editingCard?.cardType === "master" ? "Master Prompt" : editingCard ? "Prompt kartını güncelle" : "Prompt kartı ekle"}
          </h2>
        </div>
        {editingCard ? (
          <button
            type="button"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-[#F1641E] hover:text-[#F1641E]"
            onClick={onDone}
          >
            İptal
          </button>
        ) : null}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[280px_1fr]">
        <div className="space-y-3">
          <label className="text-sm font-semibold text-slate-700" htmlFor="prompt-card-image">
            Görsel
          </label>
          <div className="overflow-hidden rounded-3xl border border-dashed border-slate-300 bg-slate-50">
            {previewUrl ? (
              <img src={previewUrl} alt="Prompt önizleme" className="aspect-[4/3] w-full object-cover" />
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center px-6 text-center text-sm text-slate-500">
                Görsel seçersen kartın üstünde kalıcı R2 görseli olarak saklanır.
              </div>
            )}
          </div>
          <input
            id="prompt-card-image"
            type="file"
            accept="image/*"
            className={`block w-full rounded-2xl border px-4 py-3 text-sm transition file:mr-4 file:rounded-xl file:border-0 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white focus:outline-none focus:ring-2 ${
              imageFile
                ? "border-emerald-300 bg-emerald-50 text-emerald-800 file:bg-emerald-600 focus:ring-emerald-100"
                : "border-slate-200 bg-white text-slate-700 file:bg-[#051125] focus:border-[#F1641E] focus:ring-orange-100"
            }`}
            onChange={handleFileChange}
          />
          {selectedFileName ? (
            <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
              Görsel seçildi: {selectedFileName}
            </p>
          ) : null}
          {editingCard?.cardType === "master" ? (
            <p className="text-xs text-slate-500">Master Prompt için görsel zorunlu değildir; kart yine tıklanınca kopyalanır.</p>
          ) : null}
        </div>

        <div className="space-y-4">
          <label className="block text-sm font-semibold text-slate-700">
            Başlık
            <input
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#F1641E] focus:ring-2 focus:ring-orange-100"
              placeholder="Örn. Master Prompt veya Etsy lifestyle görsel"
              required
            />
          </label>

          <label className="block text-sm font-semibold text-slate-700">
            Markdown prompt
            <textarea
              value={form.promptMarkdown}
              onChange={(event) => setForm((current) => ({ ...current, promptMarkdown: event.target.value }))}
              className="mt-2 min-h-[260px] w-full rounded-2xl border border-slate-200 px-4 py-3 font-mono text-sm outline-none transition focus:border-[#F1641E] focus:ring-2 focus:ring-orange-100"
              placeholder="# Amaç\nPromptunu markdown formatında yaz..."
            />
          </label>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Markdown önizleme</p>
            <MarkdownPreview value={form.promptMarkdown} />
          </div>

          {saveWarning ? <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">{saveWarning}</p> : null}
          {saveMutation.error ? <p className="text-sm text-rose-700">{(saveMutation.error as Error).message}</p> : null}

          <button
            type="submit"
            className="rounded-2xl bg-[#F1641E] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#d95518] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!selectedPage || saveMutation.isPending}
          >
            {saveMutation.isPending ? "Kaydediliyor..." : editingCard ? "Kartı güncelle" : "Kartı kaydet"}
          </button>
        </div>
      </div>
    </form>
  );
}

export function PromptLibraryPage() {
  const ownerKey = getDefaultOwnerKey();
  const navigate = useNavigate();
  const { promptPageId } = useParams<{ promptPageId?: string }>();
  const queryClient = useQueryClient();
  const [newPageTitle, setNewPageTitle] = useState("");
  const [newPageDescription, setNewPageDescription] = useState("");
  const [editingCard, setEditingCard] = useState<PromptLibraryCard | null>(null);
  const [editingPageTitle, setEditingPageTitle] = useState("");
  const [editingPageDescription, setEditingPageDescription] = useState("");
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  const libraryQuery = useQuery({
    queryKey: ["prompt-library", ownerKey],
    queryFn: () => fetchPromptLibrary(ownerKey),
  });

  const pages = libraryQuery.data?.pages ?? [];
  const selectedPage = useMemo(
    () => (promptPageId ? pages.find((page) => page.id === promptPageId) ?? null : null),
    [pages, promptPageId],
  );
  const isInsidePage = Boolean(promptPageId);

  useEffect(() => {
    setEditingPageTitle(selectedPage?.title ?? "");
    setEditingPageDescription(selectedPage?.description ?? "");
    setEditingCard(null);
  }, [selectedPage?.id]);

  const createPageMutation = useMutation({
    mutationFn: () => createPromptLibraryPage(ownerKey, { title: newPageTitle, description: newPageDescription }),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["prompt-library", ownerKey] });
      setNewPageTitle("");
      setNewPageDescription("");
      if (result.page?.id) {
        navigate(`/owners/${ownerKey}/prompt-library/${result.page.id}`);
      }
    },
  });

  const updatePageMutation = useMutation({
    mutationFn: () => {
      if (!selectedPage) throw new Error("Sayfa seçilmedi.");
      return updatePromptLibraryPage(ownerKey, selectedPage.id, {
        title: editingPageTitle,
        description: editingPageDescription,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["prompt-library", ownerKey] }),
  });

  const deletePageMutation = useMutation({
    mutationFn: (pageId: string) => deletePromptLibraryPage(ownerKey, pageId),
    onSuccess: async () => {
      navigate(`/owners/${ownerKey}/prompt-library`);
      await queryClient.invalidateQueries({ queryKey: ["prompt-library", ownerKey] });
    },
  });

  const deleteCardMutation = useMutation({
    mutationFn: (cardId: string) => deletePromptLibraryCard(ownerKey, cardId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["prompt-library", ownerKey] }),
  });

  async function handleCopy(card: PromptLibraryCard) {
    await copyText(card.promptMarkdown);
    setCopyMessage(`${card.title} kopyalandı.`);
    window.setTimeout(() => setCopyMessage(null), 1800);
  }

  function handleCreatePage(event: FormEvent) {
    event.preventDefault();
    createPageMutation.mutate();
  }

  function handleUpdatePage(event: FormEvent) {
    event.preventDefault();
    updatePageMutation.mutate();
  }

  function handleDeletePage(page: PromptLibraryPage) {
    if (window.confirm(`"${page.title}" ana başlığı ve içindeki kartlar silinsin mi? Bu işlem için onay veriyorsun.`)) {
      deletePageMutation.mutate(page.id);
    }
  }

  function handleDeleteCard(card: PromptLibraryCard) {
    if (window.confirm(`"${card.title}" kartı silinsin mi? Bu işlem için onay veriyorsun.`)) {
      deleteCardMutation.mutate(card.id);
    }
  }

  const masterCards = selectedPage?.cards.filter((card) => card.cardType === "master") ?? [];
  const normalCards = selectedPage?.cards.filter((card) => card.cardType !== "master") ?? [];

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-slate-400">Prompt kasası</p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-950">
              {selectedPage ? selectedPage.title : "Prompt Kütüphanesi"}
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              {selectedPage?.description ||
                "Önce bir ana başlık oluştur; sonra başlığın içine girip promptlarını ve isteğe bağlı görsellerini kaydet."}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {isInsidePage ? (
              <button
                type="button"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-[#F1641E] hover:text-[#F1641E]"
                onClick={() => navigate(`/owners/${ownerKey}/prompt-library`)}
              >
                Ana başlıklara dön
              </button>
            ) : null}
            {copyMessage ? (
              <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{copyMessage}</div>
            ) : null}
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <aside className="space-y-5">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Ana başlıklar</h2>
            <div className="mt-4 space-y-2">
              {pages.map((page) => (
                <button
                  type="button"
                  key={page.id}
                  className={`w-full rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${
                    selectedPage?.id === page.id
                      ? "bg-[#F1641E] text-white"
                      : "border border-slate-200 bg-slate-50 text-slate-700 hover:border-[#F1641E] hover:text-[#F1641E]"
                  }`}
                  onClick={() => navigate(`/owners/${ownerKey}/prompt-library/${page.id}`)}
                >
                  <span className="block">{page.title}</span>
                  <span className={selectedPage?.id === page.id ? "text-white/80" : "text-slate-500"}>{page.cards.length} kart</span>
                </button>
              ))}
              {pages.length === 0 ? <p className="text-sm text-slate-500">Henüz ana başlık yok. İlk başlığını oluştur.</p> : null}
            </div>
          </section>

          <form onSubmit={handleCreatePage} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Yeni ana başlık</h2>
            <label className="mt-4 block text-sm font-semibold text-slate-700">
              Ana başlık adı
              <input
                value={newPageTitle}
                onChange={(event) => setNewPageTitle(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#F1641E] focus:ring-2 focus:ring-orange-100"
                placeholder="Örn. bersevian"
                required
              />
            </label>
            <label className="mt-4 block text-sm font-semibold text-slate-700">
              Mini açıklama
              <textarea
                value={newPageDescription}
                onChange={(event) => setNewPageDescription(event.target.value)}
                className="mt-2 min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#F1641E] focus:ring-2 focus:ring-orange-100"
                placeholder="Bu başlık altında hangi promptları saklayacaksın?"
              />
            </label>
            {createPageMutation.error ? <p className="mt-3 text-sm text-rose-700">{(createPageMutation.error as Error).message}</p> : null}
            <button
              type="submit"
              className="mt-4 w-full rounded-2xl bg-[#F1641E] px-4 py-3 text-sm font-semibold text-white hover:bg-[#d95518] disabled:opacity-60"
              disabled={createPageMutation.isPending}
            >
              {createPageMutation.isPending ? "Oluşturuluyor..." : "Ana başlık oluştur ve içine gir"}
            </button>
          </form>
        </aside>

        <main className="space-y-6">
          {libraryQuery.isLoading ? <p className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">Yükleniyor...</p> : null}
          {libraryQuery.error ? <p className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">Prompt kütüphanesi yüklenemedi.</p> : null}

          {!isInsidePage && !libraryQuery.isLoading ? (
            <section className="space-y-5">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Akış</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">Ana başlık seç veya oluştur</h2>
                <p className="mt-2 text-sm text-slate-600">
                  Örnek: önce <strong>bersevian</strong> adında bir ana başlık oluştur; sonra başlığın içine girerek prompt kartlarını ve varsa görsellerini ekle.
                </p>
              </div>

              <div className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
                {pages.map((page) => (
                  <article key={page.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Ana başlık</p>
                    <h3 className="mt-2 text-xl font-semibold text-slate-950">{page.title}</h3>
                    <p className="mt-2 min-h-10 text-sm text-slate-600">{page.description || "Açıklama eklenmedi."}</p>
                    <div className="mt-5 flex items-center justify-between gap-3">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{page.cards.length} kart</span>
                      <button
                        type="button"
                        className="rounded-2xl bg-[#051125] px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                        onClick={() => navigate(`/owners/${ownerKey}/prompt-library/${page.id}`)}
                      >
                        İçine gir
                      </button>
                    </div>
                  </article>
                ))}
              </div>

              {pages.length === 0 ? (
                <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                  <h2 className="text-xl font-semibold text-slate-950">Başlamak için ana başlık oluştur</h2>
                  <p className="mt-2 text-sm text-slate-600">Ana başlık oluşturunca otomatik olarak içine girersin ve prompt kartlarını ekleyebilirsin.</p>
                </div>
              ) : null}
            </section>
          ) : null}

          {isInsidePage && !selectedPage && !libraryQuery.isLoading ? (
            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8 text-center shadow-sm">
              <h2 className="text-xl font-semibold text-amber-900">Ana başlık bulunamadı</h2>
              <p className="mt-2 text-sm text-amber-700">Bu başlık silinmiş veya mevcut değil.</p>
              <button
                type="button"
                className="mt-5 rounded-2xl bg-[#051125] px-5 py-3 text-sm font-semibold text-white"
                onClick={() => navigate(`/owners/${ownerKey}/prompt-library`)}
              >
                Ana başlıklara dön
              </button>
            </div>
          ) : null}

          {selectedPage ? (
            <>
              <form onSubmit={handleUpdatePage} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
                  <label className="flex-1 text-sm font-semibold text-slate-700">
                    Ana başlık adı
                    <input
                      value={editingPageTitle}
                      onChange={(event) => setEditingPageTitle(event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#F1641E] focus:ring-2 focus:ring-orange-100"
                      required
                    />
                  </label>
                  <label className="flex-[1.4] text-sm font-semibold text-slate-700">
                    Mini açıklama
                    <input
                      value={editingPageDescription}
                      onChange={(event) => setEditingPageDescription(event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#F1641E] focus:ring-2 focus:ring-orange-100"
                    />
                  </label>
                  <button type="submit" className="rounded-2xl bg-[#051125] px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800">
                    Başlığı kaydet
                  </button>
                  <button
                    type="button"
                    className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-700 hover:bg-rose-100"
                    onClick={() => handleDeletePage(selectedPage)}
                  >
                    Başlığı sil
                  </button>
                </div>
              </form>

              <CardEditor ownerKey={ownerKey} selectedPage={selectedPage} editingCard={editingCard} onDone={() => setEditingCard(null)} />

              <section className="space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Bu başlığın içindeki promptlar</p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-950">{selectedPage.title}</h2>
                </div>
                <div className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
                  {[...masterCards, ...normalCards].map((card) => (
                    <PromptCard key={card.id} card={card} onCopy={handleCopy} onEdit={setEditingCard} onDelete={handleDeleteCard} />
                  ))}
                </div>
              </section>
            </>
          ) : null}
        </main>
      </div>
    </div>
  );
}
