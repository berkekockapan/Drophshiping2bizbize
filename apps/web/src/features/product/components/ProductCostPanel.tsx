import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";

import { fetchSettings, saveProductVariantCostOverride, type ProductCostContext } from "../../../app/api";
import { FeeBreakdownTable } from "../../etsyCostCalculator/components/FeeBreakdownTable";
import { calculateScenario } from "../../etsyCostCalculator/lib/calculateScenario";
import { groupBreakdownRows } from "../../etsyCostCalculator/lib/groupBreakdownRows";
import { migrateCalculatorStorage } from "../../etsyCostCalculator/lib/migrateCalculatorStorage";
import type { MoneyInput } from "../../etsyCostCalculator/lib/types";
import type { OwnerKey } from "../../shared/lib/ownerRouteState";
import { buildProductCostDraft } from "../lib/buildProductCostDraft";
import { ProductCostMetricCard } from "./ProductCostMetricCard";

interface ProductCostPanelProps {
  ownerKey: OwnerKey;
  productId: string;
  costContext: ProductCostContext;
}

function formatMoney(amount: number, currency: MoneyInput["currency"]) {
  return new Intl.NumberFormat(currency === "USD" ? "en-US" : "tr-TR", {
    style: "currency",
    currency,
  }).format(amount);
}

function toOverrideInputValue(value: { amount: number } | null) {
  return value == null ? "" : String(value.amount);
}

function parseOverrideInput(value: string, currency: MoneyInput["currency"]): MoneyInput | null | undefined {
  const normalized = value.trim().replace(",", ".");

  if (!normalized) {
    return null;
  }

  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0) {
    return undefined;
  }

  return {
    amount,
    currency,
  };
}

function totalScenarioCost(snapshot: ReturnType<typeof calculateScenario>) {
  return snapshot.totalEtsyFeesUsd + snapshot.totalOperationalCostsUsd;
}

export function ProductCostPanel({ ownerKey, productId, costContext }: ProductCostPanelProps) {
  const queryClient = useQueryClient();
  const settingsQuery = useQuery({
    queryKey: ["settings", "product-cost-panel"],
    retry: false,
    queryFn: async () => {
      try {
        return await fetchSettings();
      } catch {
        return null;
      }
    },
  });

  const baseDraft = useMemo(
    () => migrateCalculatorStorage(settingsQuery.data?.etsyCostCalculator).draft,
    [settingsQuery.data?.etsyCostCalculator],
  );
  const [selectedVariantId, setSelectedVariantId] = useState(costContext.selectedVariantId ?? costContext.variants[0]?.variantId ?? "");
  const selectedVariant =
    costContext.variants.find((variant) => variant.variantId === selectedVariantId) ?? costContext.variants[0] ?? null;
  const productCurrency = selectedVariant?.manualProductCost?.currency ?? selectedVariant?.autoProductCost.currency ?? "TRY";
  const shippingCurrency =
    selectedVariant?.manualShippingCost?.currency ?? selectedVariant?.autoShippingEstimate.currency ?? "USD";
  const [manualProductCostInput, setManualProductCostInput] = useState(toOverrideInputValue(selectedVariant?.manualProductCost ?? null));
  const [manualShippingCostInput, setManualShippingCostInput] = useState(
    toOverrideInputValue(selectedVariant?.manualShippingCost ?? null),
  );
  const hasInteractedRef = useRef(false);
  const lastSubmittedRef = useRef("");

  useEffect(() => {
    const nextVariantId = costContext.selectedVariantId ?? costContext.variants[0]?.variantId ?? "";
    const variantStillExists = costContext.variants.some((variant) => variant.variantId === selectedVariantId);

    if (!variantStillExists) {
      setSelectedVariantId(nextVariantId);
    }
  }, [costContext.selectedVariantId, costContext.variants, selectedVariantId]);

  useEffect(() => {
    if (!selectedVariant) {
      setManualProductCostInput("");
      setManualShippingCostInput("");
      hasInteractedRef.current = false;
      lastSubmittedRef.current = "";
      return;
    }

    const nextProductInput = toOverrideInputValue(selectedVariant.manualProductCost);
    const nextShippingInput = toOverrideInputValue(selectedVariant.manualShippingCost);
    setManualProductCostInput(nextProductInput);
    setManualShippingCostInput(nextShippingInput);
    hasInteractedRef.current = false;
    lastSubmittedRef.current = JSON.stringify({
      variantId: selectedVariant.variantId,
      manualProductCost: parseOverrideInput(nextProductInput, productCurrency) ?? null,
      manualShippingCost: parseOverrideInput(nextShippingInput, shippingCurrency) ?? null,
    });
  }, [
    selectedVariant?.variantId,
    selectedVariant?.manualProductCost?.amount,
    selectedVariant?.manualProductCost?.currency,
    selectedVariant?.manualShippingCost?.amount,
    selectedVariant?.manualShippingCost?.currency,
    productCurrency,
    shippingCurrency,
  ]);

  const saveOverrideMutation = useMutation({
    mutationFn: (payload: {
      variantId: string;
      manualProductCost: MoneyInput | null;
      manualShippingCost: MoneyInput | null;
    }) =>
      saveProductVariantCostOverride(ownerKey, productId, payload.variantId, {
        manualProductCost: payload.manualProductCost,
        manualShippingCost: payload.manualShippingCost,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["product-detail", ownerKey, productId] });
    },
  });

  const parsedManualProductCost = parseOverrideInput(manualProductCostInput, productCurrency);
  const parsedManualShippingCost = parseOverrideInput(manualShippingCostInput, shippingCurrency);

  useEffect(() => {
    if (!selectedVariant || !hasInteractedRef.current) {
      return;
    }

    if (parsedManualProductCost === undefined || parsedManualShippingCost === undefined) {
      return;
    }

    const payload = {
      variantId: selectedVariant.variantId,
      manualProductCost: parsedManualProductCost ?? null,
      manualShippingCost: parsedManualShippingCost ?? null,
    };
    const serializedPayload = JSON.stringify(payload);

    if (lastSubmittedRef.current === serializedPayload) {
      return;
    }

    const timeout = globalThis.setTimeout(() => {
      lastSubmittedRef.current = serializedPayload;
      saveOverrideMutation.mutate(payload);
    }, 250);

    return () => globalThis.clearTimeout(timeout);
  }, [
    parsedManualProductCost,
    parsedManualShippingCost,
    saveOverrideMutation,
    selectedVariant,
  ]);

  const effectiveVariant = useMemo(() => {
    if (!selectedVariant) {
      return null;
    }

    return {
      ...selectedVariant,
      manualProductCost:
        parsedManualProductCost === undefined ? selectedVariant.manualProductCost : parsedManualProductCost,
      manualShippingCost:
        parsedManualShippingCost === undefined ? selectedVariant.manualShippingCost : parsedManualShippingCost,
    };
  }, [parsedManualProductCost, parsedManualShippingCost, selectedVariant]);

  const otherScenario = useMemo(() => {
    if (!effectiveVariant) {
      return null;
    }

    return calculateScenario(
      buildProductCostDraft({
        baseDraft,
        variant: effectiveVariant,
        destinationProfile: "OTHER",
        usState: costContext.usState,
      }),
    );
  }, [baseDraft, costContext.usState, effectiveVariant]);

  const usScenario = useMemo(() => {
    if (!effectiveVariant || costContext.usState.status !== "automatic_confirmed") {
      return null;
    }

    return calculateScenario(
      buildProductCostDraft({
        baseDraft,
        variant: effectiveVariant,
        destinationProfile: "US",
        usState: costContext.usState,
      }),
    );
  }, [baseDraft, costContext.usState, effectiveVariant]);

  if (!selectedVariant || !effectiveVariant || !otherScenario) {
    return (
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Urun maliyet gorunumu</h2>
        <p className="mt-3 text-sm text-slate-500">Hesaplanacak varyant maliyeti bulunamadi.</p>
      </section>
    );
  }

  const shippingValue = effectiveVariant.manualShippingCost ?? effectiveVariant.autoShippingEstimate;

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Urun maliyet gorunumu</h2>
          <p className="mt-2 text-sm text-slate-500">
            Secili varyant icin otomatik maliyet, ShipEntegra tahmini ve manuel override ayni hesap motorunda
            birlestirilir.
          </p>
        </div>
        {saveOverrideMutation.isPending ? (
          <p className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">Override kaydediliyor...</p>
        ) : null}
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          Secili varyant
          <select
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 focus:border-[#F1641E] focus:outline-none"
            value={selectedVariant.variantId}
            onChange={(event) => setSelectedVariantId(event.target.value)}
          >
            {costContext.variants.map((variant) => (
              <option key={variant.variantId} value={variant.variantId}>
                {variant.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          Urun maliyeti override
          <input
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 focus:border-[#F1641E] focus:outline-none"
            placeholder={`Otomatik: ${formatMoney(selectedVariant.autoProductCost.amount, selectedVariant.autoProductCost.currency)}`}
            value={manualProductCostInput}
            onChange={(event) => {
              hasInteractedRef.current = true;
              setManualProductCostInput(event.target.value);
            }}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          Kargo override
          <input
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 focus:border-[#F1641E] focus:outline-none"
            placeholder={`Tahmin: ${formatMoney(selectedVariant.autoShippingEstimate.amount, selectedVariant.autoShippingEstimate.currency)}`}
            value={manualShippingCostInput}
            onChange={(event) => {
              hasInteractedRef.current = true;
              setManualShippingCostInput(event.target.value);
            }}
          />
        </label>
      </div>

      <div className="mt-3 grid gap-2 text-xs text-slate-500 md:grid-cols-2">
        <p>
          Otomatik urun maliyeti: {formatMoney(selectedVariant.autoProductCost.amount, selectedVariant.autoProductCost.currency)}
        </p>
        <p>
          ShipEntegra tahmini: {formatMoney(selectedVariant.autoShippingEstimate.amount, selectedVariant.autoShippingEstimate.currency)}
        </p>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-4">
        <ProductCostMetricCard
          title="Diger toplam maliyet"
          value={formatMoney(totalScenarioCost(otherScenario), "USD")}
          note={`Net kar ${formatMoney(otherScenario.netProfitUsd, "USD")}`}
        />
        <ProductCostMetricCard
          title="ABD toplam maliyet"
          value={usScenario ? formatMoney(totalScenarioCost(usScenario), "USD") : costContext.usState.label}
          note={usScenario ? costContext.usState.profile?.dutySummary ?? null : costContext.usState.lockedReason}
        />
        <ProductCostMetricCard
          title="Guncel urun maliyeti"
          value={formatMoney((effectiveVariant.manualProductCost ?? effectiveVariant.autoProductCost).amount, productCurrency)}
          note={effectiveVariant.manualProductCost ? "Manuel override kullaniliyor." : "Otomatik varyant maliyeti kullaniliyor."}
        />
        <ProductCostMetricCard
          title="Kargo tahmini"
          value={formatMoney(shippingValue.amount, shippingValue.currency)}
          note={
            effectiveVariant.manualShippingCost
              ? "Manuel kargo override kullaniliyor."
              : effectiveVariant.autoShippingEstimate.sourceType === "profile_default"
                ? "Profil bazli ShipEntegra tahmini."
                : "Sistem varsayilan kargo tahmini."
          }
        />
      </div>

      {settingsQuery.isError ? (
        <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Varsayilan ayarlar yuklenemedi; hesap son kaydedilen degere gore yapiliyor.
        </p>
      ) : null}

      {saveOverrideMutation.isError ? (
        <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
          Override kaydedilemedi. Degeri tekrar deneyin.
        </p>
      ) : null}

      <div className="mt-6">
        <FeeBreakdownTable groups={groupBreakdownRows(usScenario ?? otherScenario)} />
      </div>
    </section>
  );
}
