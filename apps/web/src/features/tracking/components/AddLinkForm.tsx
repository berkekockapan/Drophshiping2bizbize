import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { createTrackedProduct } from "../../../app/api";

export function AddLinkForm() {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: createTrackedProduct,
    onSuccess: async () => {
      setValue("");
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ["tracking-products"] });
    },
    onError: (mutationError) => {
      setError(mutationError instanceof Error ? mutationError.message : "Ürün eklenemedi");
    },
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!value.trim()) {
      setError("Trendyol linki gerekli");
      return;
    }

    setError(null);
    mutation.mutate(value.trim());
  }

  return (
    <form className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-3 lg:flex-row">
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="https://www.trendyol.com/..."
          className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#F1641E]"
        />
        <button
          type="submit"
          className="rounded-2xl bg-[#F1641E] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#d95518]"
        >
          {mutation.isPending ? "Ekleniyor..." : "Ekle"}
        </button>
      </div>
      {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
    </form>
  );
}
