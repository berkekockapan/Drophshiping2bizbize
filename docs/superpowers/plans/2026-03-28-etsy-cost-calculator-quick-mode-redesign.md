# Etsy Cost Calculator Quick Mode Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Etsy maliyet hesaplayiciyi hizli iki sekmeli akis, sticky sonuc paneli, preset popover ve gelismis drawer ile yeniden duzenlemek.

**Architecture:** Mevcut `CalculatorDraft`, `calculateScenario()` ve `solveTargetPrice()` korunacak. Uzerine hizli-mod view-model katmani eklenecek; sayfa `sol hizli form + sag sticky sonuc + altta grouped breakdown + sag drawer` yapisina alinacak.

**Tech Stack:** React 19, TypeScript, React Query, React Testing Library, Vitest, Playwright, Tailwind CSS

---

## File Structure / Responsibility Map

### Create
- `apps/web/src/features/etsyCostCalculator/lib/buildQuickModeViewModel.ts` - onerilen fiyat, girilen fiyat senaryosu, guvenli fiyat ve basa bas fiyat view-model'i.
- `apps/web/src/features/etsyCostCalculator/lib/buildQuickModeViewModel.test.ts` - quick-mode matematik testleri.
- `apps/web/src/features/etsyCostCalculator/lib/groupBreakdownRows.ts` - breakdown'i `etsy_fees`, `user_costs`, `summary` gruplarina ayirir.
- `apps/web/src/features/etsyCostCalculator/lib/groupBreakdownRows.test.ts` - grup ve ozet satiri testleri.
- `apps/web/src/features/etsyCostCalculator/components/QuickModeToolbar.tsx` - iki sekme, preset butonu, gelismis ayarlar butonu.
- `apps/web/src/features/etsyCostCalculator/components/QuickModeToolbar.test.tsx`
- `apps/web/src/features/etsyCostCalculator/components/QuickModeForm.tsx` - sadece 4 gorunen alan.
- `apps/web/src/features/etsyCostCalculator/components/QuickModeForm.test.tsx`
- `apps/web/src/features/etsyCostCalculator/components/AdvancedSettingsDrawer.tsx` - sagdan acilan drawer kabugu.
- `apps/web/src/features/etsyCostCalculator/components/AdvancedSettingsDrawer.test.tsx`

### Modify
- `apps/web/src/features/etsyCostCalculator/lib/types.ts`
- `apps/web/src/features/etsyCostCalculator/hooks/useEtsyCostCalculatorState.ts`
- `apps/web/src/features/etsyCostCalculator/hooks/useEtsyCostCalculatorState.test.tsx`
- `apps/web/src/features/etsyCostCalculator/components/ResultsPanel.tsx`
- `apps/web/src/features/etsyCostCalculator/components/FeeBreakdownTable.tsx`
- `apps/web/src/features/etsyCostCalculator/components/CostInputsCard.tsx`
- `apps/web/src/features/etsyCostCalculator/components/CostInputsCard.test.tsx`
- `apps/web/src/features/etsyCostCalculator/components/ProfitTargetCard.tsx`
- `apps/web/src/features/etsyCostCalculator/components/PresetToolbar.tsx`
- `apps/web/src/features/etsyCostCalculator/components/PresetToolbar.test.tsx`
- `apps/web/src/features/etsyCostCalculator/routes/EtsyCostCalculatorPage.tsx`
- `apps/web/src/features/etsyCostCalculator/routes/EtsyCostCalculatorPage.test.tsx`
- `apps/web/src/app/router.test.tsx`
- `apps/web/tests/e2e/etsy-cost-calculator.spec.ts`

---

### Task 1: Add quick-mode view-model and grouped breakdown data

**Files:**
- Create: `apps/web/src/features/etsyCostCalculator/lib/buildQuickModeViewModel.ts`
- Create: `apps/web/src/features/etsyCostCalculator/lib/buildQuickModeViewModel.test.ts`
- Create: `apps/web/src/features/etsyCostCalculator/lib/groupBreakdownRows.ts`
- Create: `apps/web/src/features/etsyCostCalculator/lib/groupBreakdownRows.test.ts`
- Modify: `apps/web/src/features/etsyCostCalculator/lib/types.ts`
- Modify: `apps/web/src/features/etsyCostCalculator/hooks/useEtsyCostCalculatorState.ts`
- Modify: `apps/web/src/features/etsyCostCalculator/hooks/useEtsyCostCalculatorState.test.tsx`

- [ ] **Step 1: Write the failing tests**

```ts
// buildQuickModeViewModel.test.ts
const draft = createDefaultDraft();
draft.productCost = { amount: 18, currency: "USD" };
draft.actualShippingCost = { amount: 5, currency: "USD" };
draft.targetProfitMode = "net_profit_usd";
draft.targetProfitValue = 10;
draft.salePriceUsd = 39;
const view = buildQuickModeViewModel(draft);
expect(view.recommendedSalePriceUsd).not.toBeNull();
expect(view.recommendedScenario?.netProfitUsd).toBeGreaterThanOrEqual(10);
expect(view.enteredPriceScenario).not.toBeNull();

// groupBreakdownRows.test.ts
const snapshot = calculateScenario({ ...createDefaultDraft(), salePriceUsd: 52 });
const groups = groupBreakdownRows(snapshot);
expect(groups.map((group) => group.key)).toEqual(["etsy_fees", "user_costs", "summary"]);
expect(groups[2]?.rows.map((row) => row.label)).toContain("Net kar");

// useEtsyCostCalculatorState.test.tsx
expect(result.current.quickMode.recommendedSalePriceUsd).not.toBeNull();
expect(result.current.recommendedBreakdownGroups[0]?.label).toMatch(/etsy fee/i);
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm --filter @trendyol-etsy/web exec vitest run src/features/etsyCostCalculator/lib/buildQuickModeViewModel.test.ts src/features/etsyCostCalculator/lib/groupBreakdownRows.test.ts src/features/etsyCostCalculator/hooks/useEtsyCostCalculatorState.test.tsx
```

Expected: FAIL with missing-module / missing-property errors.

- [ ] **Step 3: Write minimal implementation**

```ts
// types.ts
export type CalculatorQuickTab = "target_price" | "analyze_price";
export interface BreakdownGroup { key: "etsy_fees" | "user_costs" | "summary"; label: string; rows: FormattedBreakdownRow[]; }
export interface QuickModeViewModel {
  recommendedSalePriceUsd: number | null;
  breakEvenPriceUsd: number | null;
  targetSafeListPriceUsd: number | null;
  recommendedScenario: ScenarioSnapshot | null;
  enteredPriceScenario: ScenarioSnapshot | null;
  hasEnteredSalePrice: boolean;
}

// buildQuickModeViewModel.ts
export function buildQuickModeViewModel(draft: CalculatorDraft): QuickModeViewModel {
  const breakEvenPriceUsd = solveTargetPrice({ ...draft, targetProfitMode: "net_profit_usd", targetProfitValue: 0 });
  const targetSafeListPriceUsd = solveTargetPrice(draft);
  const recommendedSalePriceUsd = targetSafeListPriceUsd ?? breakEvenPriceUsd;
  return {
    recommendedSalePriceUsd,
    breakEvenPriceUsd,
    targetSafeListPriceUsd,
    recommendedScenario: recommendedSalePriceUsd == null ? null : calculateScenario({ ...draft, salePriceUsd: recommendedSalePriceUsd }),
    enteredPriceScenario: draft.salePriceUsd > 0 ? calculateScenario(draft) : null,
    hasEnteredSalePrice: draft.salePriceUsd > 0,
  };
}

// groupBreakdownRows.ts
export function groupBreakdownRows(snapshot: ScenarioSnapshot): BreakdownGroup[] {
  const rows = formatBreakdown(snapshot.breakdown);
  return [
    { key: "etsy_fees", label: "Etsy fee'leri", rows: rows.filter((row) => row.key.includes("fee") || row.key.includes("vat")) },
    { key: "user_costs", label: "Kullanici maliyetleri", rows: rows.filter((row) => row.key.includes("cost")) },
    { key: "summary", label: "Sonuc ozeti", rows: [{ key: "summary_net_profit", label: "Net kar", formattedUsd: usdFormatter.format(snapshot.netProfitUsd), formattedTry: tryFormatter.format(snapshot.netProfitTry), badgeLabel: "Ozet" }] },
  ];
}
```
- [ ] **Step 4: Wire the hook to the new utilities**

```ts
const snapshot = useMemo(() => calculateScenario(storage.draft), [storage.draft]);
const quickMode = useMemo(() => buildQuickModeViewModel(storage.draft), [storage.draft]);
const recommendedBreakdownGroups = useMemo(() => groupBreakdownRows(quickMode.recommendedScenario ?? snapshot), [quickMode.recommendedScenario, snapshot]);
const analysisBreakdownGroups = useMemo(() => groupBreakdownRows(quickMode.enteredPriceScenario ?? snapshot), [quickMode.enteredPriceScenario, snapshot]);
return { draft: storage.draft, presets: storage.presets, presetName, activePresetId, saveState, saveErrorMessage, validationErrors, result, quickMode, recommendedBreakdownGroups, analysisBreakdownGroups, updateDraft, resetFeeProfileOverrides, setPresetName, savePreset, loadPreset, updateActivePreset, deletePreset };
```

- [ ] **Step 5: Run test to verify it passes**

Run:

```bash
pnpm --filter @trendyol-etsy/web exec vitest run src/features/etsyCostCalculator/lib/buildQuickModeViewModel.test.ts src/features/etsyCostCalculator/lib/groupBreakdownRows.test.ts src/features/etsyCostCalculator/hooks/useEtsyCostCalculatorState.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/etsyCostCalculator/lib/types.ts apps/web/src/features/etsyCostCalculator/lib/buildQuickModeViewModel.ts apps/web/src/features/etsyCostCalculator/lib/buildQuickModeViewModel.test.ts apps/web/src/features/etsyCostCalculator/lib/groupBreakdownRows.ts apps/web/src/features/etsyCostCalculator/lib/groupBreakdownRows.test.ts apps/web/src/features/etsyCostCalculator/hooks/useEtsyCostCalculatorState.ts apps/web/src/features/etsyCostCalculator/hooks/useEtsyCostCalculatorState.test.tsx
git commit -m "refactor: add etsy calculator quick mode view model"
```

### Task 2: Build quick-mode components and adapt existing cards

**Files:**
- Create: `apps/web/src/features/etsyCostCalculator/components/QuickModeToolbar.tsx`
- Create: `apps/web/src/features/etsyCostCalculator/components/QuickModeToolbar.test.tsx`
- Create: `apps/web/src/features/etsyCostCalculator/components/QuickModeForm.tsx`
- Create: `apps/web/src/features/etsyCostCalculator/components/QuickModeForm.test.tsx`
- Create: `apps/web/src/features/etsyCostCalculator/components/AdvancedSettingsDrawer.tsx`
- Create: `apps/web/src/features/etsyCostCalculator/components/AdvancedSettingsDrawer.test.tsx`
- Modify: `apps/web/src/features/etsyCostCalculator/components/ResultsPanel.tsx`
- Modify: `apps/web/src/features/etsyCostCalculator/components/ResultsPanel.test.tsx`
- Modify: `apps/web/src/features/etsyCostCalculator/components/FeeBreakdownTable.tsx`
- Modify: `apps/web/src/features/etsyCostCalculator/components/FeeBreakdownTable.test.tsx`
- Modify: `apps/web/src/features/etsyCostCalculator/components/CostInputsCard.tsx`
- Modify: `apps/web/src/features/etsyCostCalculator/components/CostInputsCard.test.tsx`
- Modify: `apps/web/src/features/etsyCostCalculator/components/ProfitTargetCard.tsx`

- [ ] **Step 1: Write the failing component tests**

```tsx
await user.click(screen.getByRole("tab", { name: /mevcut fiyati analiz et/i }));
expect(onTabChange).toHaveBeenCalledWith("analyze_price");
await user.type(screen.getByLabelText(/opsiyonel satis fiyati/i), "39");
expect(onChange).toHaveBeenCalled();
expect(screen.getByText(/onerilen satis fiyati/i)).toBeInTheDocument();
expect(screen.getByText(/basa bas fiyat/i)).toBeInTheDocument();
expect(screen.getByText(/girilen fiyat kiyasi/i)).toBeInTheDocument();
expect(screen.getByText(/etsy fee'leri/i)).toBeInTheDocument();
render(<CostInputsCard draft={draft} variant="advanced-only" onChange={() => undefined} />);
expect(screen.queryByLabelText(/^Urun maliyeti$/i)).not.toBeInTheDocument();
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm --filter @trendyol-etsy/web exec vitest run src/features/etsyCostCalculator/components/QuickModeToolbar.test.tsx src/features/etsyCostCalculator/components/QuickModeForm.test.tsx src/features/etsyCostCalculator/components/ResultsPanel.test.tsx src/features/etsyCostCalculator/components/FeeBreakdownTable.test.tsx src/features/etsyCostCalculator/components/CostInputsCard.test.tsx
```

Expected: FAIL because the new components do not exist and the old props no longer match.

- [ ] **Step 3: Write minimal implementation**

```tsx
// QuickModeToolbar.tsx
export function QuickModeToolbar({ activeTab, badges, onTabChange, onOpenPresets, onOpenAdvanced }: { activeTab: CalculatorQuickTab; badges: string[]; onTabChange: (tab: CalculatorQuickTab) => void; onOpenPresets: () => void; onOpenAdvanced: () => void; }) {
  return <section><div role="tablist"><button type="button" role="tab" aria-selected={activeTab === "target_price"} onClick={() => onTabChange("target_price")}>Hedef kar icin satis fiyati bul</button><button type="button" role="tab" aria-selected={activeTab === "analyze_price"} onClick={() => onTabChange("analyze_price")}>Mevcut fiyati analiz et</button></div><button type="button" onClick={onOpenPresets}>Preset</button><button type="button" onClick={onOpenAdvanced}>Gelismis ayarlar</button>{badges.map((badge) => <span key={badge}>{badge}</span>)}</section>;
}

// QuickModeForm.tsx
export function QuickModeForm({ draft, validationErrors, salePriceLabel, salePriceRequired, onChange }: { draft: CalculatorDraft; validationErrors: Record<string, string>; salePriceLabel: string; salePriceRequired: boolean; onChange: (patch: Partial<CalculatorDraft>) => void; }) {
  return <section><MoneyInputField label="Urun maliyeti" value={draft.productCost} onChange={(value) => onChange({ productCost: value })} /><MoneyInputField label="Gercek kargo" value={draft.actualShippingCost} onChange={(value) => onChange({ actualShippingCost: value })} /><select aria-label="Hedef kar modu" value={draft.targetProfitMode} onChange={(event) => onChange({ targetProfitMode: event.target.value as CalculatorDraft["targetProfitMode"] })}><option value="margin_percent">% net kar</option><option value="net_profit_usd">USD net kar</option><option value="net_profit_try">TRY net kar</option></select><input aria-label="Hedef kar degeri" aria-invalid={Boolean(validationErrors.targetProfitValue)} type="number" value={draft.targetProfitValue} onChange={(event) => onChange({ targetProfitValue: Number(event.target.value) })} /><input aria-label={salePriceLabel} aria-invalid={salePriceRequired && draft.salePriceUsd <= 0} type="number" value={draft.salePriceUsd || ""} onChange={(event) => onChange({ salePriceUsd: Number(event.target.value || 0) })} /></section>;
}

// AdvancedSettingsDrawer.tsx
export function AdvancedSettingsDrawer({ open, onClose, children }: PropsWithChildren<{ open: boolean; onClose: () => void }>) { if (!open) return null; return <div className="fixed inset-0"><div role="dialog" aria-label="Gelismis ayarlar"><button onClick={onClose}>Gelismis ayarlari kapat</button>{children}</div></div>; }

// ResultsPanel.tsx
export function ResultsPanel({ activeTab, recommendedSalePriceUsd, breakEvenPriceUsd, targetSafeListPriceUsd, recommendedScenario, enteredSalePriceUsd, enteredPriceScenario }: { activeTab: CalculatorQuickTab; recommendedSalePriceUsd: number | null; breakEvenPriceUsd: number | null; targetSafeListPriceUsd: number | null; recommendedScenario: ScenarioSnapshot | null; enteredSalePriceUsd: number; enteredPriceScenario: ScenarioSnapshot | null; }) { const scenario = activeTab === "analyze_price" ? enteredPriceScenario : recommendedScenario; return <section><p>Onerilen satis fiyati</p><p>{formatUsd(recommendedSalePriceUsd)}</p><p>Basa bas fiyat</p><p>{formatUsd(breakEvenPriceUsd)}</p>{enteredPriceScenario ? <div><p>Girilen fiyat kiyasi</p><p>{formatUsd(enteredSalePriceUsd)}</p></div> : null}{activeTab === "analyze_price" ? <p>Onerilen guvenli fiyat</p> : null}{scenario ? <p>%{scenario.netMarginPercent.toFixed(2)}</p> : null}</section>; }

// FeeBreakdownTable.tsx
export function FeeBreakdownTable({ groups }: { groups: BreakdownGroup[] }) { return <section>{groups.map((group) => <div key={group.key}><h3>{group.label}</h3>{group.rows.map((row) => <div key={row.key}>{row.label}</div>)}</div>)}</section>; }

// CostInputsCard.tsx
export function CostInputsCard({ draft, variant = "all", onChange }: { draft: CalculatorDraft; variant?: "all" | "advanced-only"; onChange: (patch: Partial<CalculatorDraft>) => void; }) { return <section>{variant === "all" ? <MoneyInputField label="Urun maliyeti" value={draft.productCost} onChange={(value) => onChange({ productCost: value })} /> : null}<MoneyInputField label="Paketleme maliyeti" value={draft.packagingCost} onChange={(value) => onChange({ packagingCost: value })} /></section>; }

// ProfitTargetCard.tsx
export function ProfitTargetCard({ draft, validationErrors, onChange, showTargetFields = true }: { draft: CalculatorDraft; validationErrors: Record<string, string>; onChange: (patch: Partial<CalculatorDraft>) => void; showTargetFields?: boolean; }) { return <section>{showTargetFields ? <><select aria-label="Hedef kar modu" value={draft.targetProfitMode} onChange={(event) => onChange({ targetProfitMode: event.target.value as CalculatorDraft["targetProfitMode"] })}><option value="margin_percent">% net kar</option><option value="net_profit_usd">USD net kar</option><option value="net_profit_try">TRY net kar</option></select><input aria-label="Hedef kar degeri" aria-invalid={Boolean(validationErrors.targetProfitValue)} type="number" value={draft.targetProfitValue} onChange={(event) => onChange({ targetProfitValue: Number(event.target.value) })} /></> : null}<select aria-label="Genel gider modu" value={draft.overheadMode} onChange={(event) => onChange({ overheadMode: event.target.value as CalculatorDraft["overheadMode"] })}><option value="off">Kapali</option><option value="per_order">Siparis basi sabit gider</option><option value="allocated_total">Toplam gider / siparis adedi</option></select></section>; }
```
- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pnpm --filter @trendyol-etsy/web exec vitest run src/features/etsyCostCalculator/components/QuickModeToolbar.test.tsx src/features/etsyCostCalculator/components/QuickModeForm.test.tsx src/features/etsyCostCalculator/components/ResultsPanel.test.tsx src/features/etsyCostCalculator/components/FeeBreakdownTable.test.tsx src/features/etsyCostCalculator/components/CostInputsCard.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/etsyCostCalculator/components/QuickModeToolbar.tsx apps/web/src/features/etsyCostCalculator/components/QuickModeToolbar.test.tsx apps/web/src/features/etsyCostCalculator/components/QuickModeForm.tsx apps/web/src/features/etsyCostCalculator/components/QuickModeForm.test.tsx apps/web/src/features/etsyCostCalculator/components/AdvancedSettingsDrawer.tsx apps/web/src/features/etsyCostCalculator/components/AdvancedSettingsDrawer.test.tsx apps/web/src/features/etsyCostCalculator/components/ResultsPanel.tsx apps/web/src/features/etsyCostCalculator/components/ResultsPanel.test.tsx apps/web/src/features/etsyCostCalculator/components/FeeBreakdownTable.tsx apps/web/src/features/etsyCostCalculator/components/FeeBreakdownTable.test.tsx apps/web/src/features/etsyCostCalculator/components/CostInputsCard.tsx apps/web/src/features/etsyCostCalculator/components/CostInputsCard.test.tsx apps/web/src/features/etsyCostCalculator/components/ProfitTargetCard.tsx
git commit -m "feat: add etsy calculator quick mode components"
```

### Task 3: Recompose the page around the quick-mode shell, preset popover, and advanced drawer

**Files:**
- Modify: `apps/web/src/features/etsyCostCalculator/routes/EtsyCostCalculatorPage.tsx`
- Modify: `apps/web/src/features/etsyCostCalculator/routes/EtsyCostCalculatorPage.test.tsx`
- Modify: `apps/web/src/features/etsyCostCalculator/components/PresetToolbar.tsx`
- Modify: `apps/web/src/features/etsyCostCalculator/components/PresetToolbar.test.tsx`
- Modify: `apps/web/src/app/router.test.tsx`

- [ ] **Step 1: Write the failing page tests**

```tsx
expect(await screen.findByRole("tab", { name: /hedef kar icin satis fiyati bul/i })).toHaveAttribute("aria-selected", "true");
await user.click(screen.getByRole("button", { name: /preset/i }));
expect(screen.getByText(/preset araci/i)).toBeInTheDocument();
await user.click(screen.getByRole("button", { name: /gelismis ayarlar/i }));
expect(screen.getByRole("dialog", { name: /gelismis ayarlar/i })).toBeInTheDocument();
expect(await screen.findByRole("tab", { name: /hedef kar icin satis fiyati bul/i })).toBeInTheDocument();
await user.click(screen.getByRole("button", { name: /preset kaydet/i }));
expect(onSavePreset).toHaveBeenCalledWith("ABD basic");
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm --filter @trendyol-etsy/web exec vitest run src/features/etsyCostCalculator/routes/EtsyCostCalculatorPage.test.tsx src/features/etsyCostCalculator/components/PresetToolbar.test.tsx src/app/router.test.tsx
```

Expected: FAIL because the page still renders the old card stack.

- [ ] **Step 3: Write minimal implementation**

```tsx
const [activeTab, setActiveTab] = useState<"target_price" | "analyze_price">("target_price");
const [presetOpen, setPresetOpen] = useState(false);
const [advancedOpen, setAdvancedOpen] = useState(false);
const groups = activeTab === "analyze_price" ? calculator.analysisBreakdownGroups : calculator.recommendedBreakdownGroups;
const salePriceLabel = activeTab === "analyze_price" ? "Mevcut satis fiyati (USD)" : "Opsiyonel satis fiyati (USD)";

return (
  <div className="space-y-6">
    <CalculatorHeader profileLabel="Etsy Turkiye varsayilani (2026-03-28)" saveState={calculator.saveState} saveErrorMessage={calculator.saveErrorMessage} />
    <div className="relative space-y-4">
      <QuickModeToolbar activeTab={activeTab} badges={badges} onTabChange={setActiveTab} onOpenPresets={() => setPresetOpen((value) => !value)} onOpenAdvanced={() => setAdvancedOpen(true)} />
      {presetOpen ? <div className="absolute right-0 top-full z-20 w-full max-w-xl"><PresetToolbar presetName={calculator.presetName} activePresetId={calculator.activePresetId} presets={calculator.presets} onPresetNameChange={calculator.setPresetName} onSavePreset={calculator.savePreset} onLoadPreset={calculator.loadPreset} onUpdatePreset={calculator.updateActivePreset} onDeletePreset={calculator.deletePreset} /></div> : null}
    </div>
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_360px]">
      <div className="space-y-6"><QuickModeForm draft={calculator.draft} validationErrors={calculator.validationErrors} salePriceLabel={salePriceLabel} salePriceRequired={activeTab === "analyze_price"} onChange={calculator.updateDraft} /><FeeBreakdownTable groups={groups} /></div>
      <ResultsPanel activeTab={activeTab} recommendedSalePriceUsd={calculator.quickMode.recommendedSalePriceUsd} breakEvenPriceUsd={calculator.quickMode.breakEvenPriceUsd} targetSafeListPriceUsd={calculator.quickMode.targetSafeListPriceUsd} recommendedScenario={calculator.quickMode.recommendedScenario} enteredSalePriceUsd={calculator.draft.salePriceUsd} enteredPriceScenario={calculator.quickMode.enteredPriceScenario} />
    </div>
    <AdvancedSettingsDrawer open={advancedOpen} onClose={() => setAdvancedOpen(false)}><SalesCampaignCard draft={calculator.draft} validationErrors={calculator.validationErrors} onChange={calculator.updateDraft} /><CostInputsCard draft={calculator.draft} variant="advanced-only" onChange={calculator.updateDraft} /><ProfitTargetCard draft={calculator.draft} validationErrors={calculator.validationErrors} onChange={calculator.updateDraft} showTargetFields={false} /><FeeProfileCard draft={calculator.draft} validationErrors={calculator.validationErrors} onChange={calculator.updateDraft} onResetFeeProfileOverrides={calculator.resetFeeProfileOverrides} /></AdvancedSettingsDrawer>
  </div>
);
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pnpm --filter @trendyol-etsy/web exec vitest run src/features/etsyCostCalculator/routes/EtsyCostCalculatorPage.test.tsx src/features/etsyCostCalculator/components/PresetToolbar.test.tsx src/app/router.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/etsyCostCalculator/routes/EtsyCostCalculatorPage.tsx apps/web/src/features/etsyCostCalculator/routes/EtsyCostCalculatorPage.test.tsx apps/web/src/features/etsyCostCalculator/components/PresetToolbar.tsx apps/web/src/features/etsyCostCalculator/components/PresetToolbar.test.tsx apps/web/src/app/router.test.tsx
git commit -m "feat: rebuild etsy calculator page around quick mode"
```
### Task 4: Refresh the Playwright flow and run the focused regression sweep

**Files:**
- Modify: `apps/web/tests/e2e/etsy-cost-calculator.spec.ts`
- Test: `apps/web/src/features/etsyCostCalculator/**`
- Test: `apps/web/src/app/router.test.tsx`
- Test: `apps/web/tests/e2e/etsy-cost-calculator.spec.ts`

- [ ] **Step 1: Write the failing E2E flow**

```ts
await page.getByRole("link", { name: /etsy maliyet hesaplayici/i }).click();
await expect(page.getByRole("tab", { name: /hedef kar icin satis fiyati bul/i })).toHaveAttribute("aria-selected", "true");
await page.getByLabel(/^Urun maliyeti$/i).fill("20");
await page.getByLabel(/^Gercek kargo$/i).fill("5");
await page.getByLabel(/hedef kar degeri/i).fill("15");
await expect(page.getByText(/onerilen satis fiyati/i)).toBeVisible();
await expect(page.getByText(/basa bas fiyat/i)).toBeVisible();
await page.getByLabel(/opsiyonel satis fiyati/i).fill("33");
await expect(page.getByText(/girilen fiyat kiyasi/i)).toBeVisible();
await page.getByRole("button", { name: /^Preset$/i }).click();
await page.getByLabel(/preset adi/i).fill("ABD hizli");
await page.getByRole("button", { name: /preset kaydet/i }).click();
await page.getByRole("button", { name: /gelismis ayarlar/i }).click();
await expect(page.getByRole("dialog", { name: /gelismis ayarlar/i })).toBeVisible();
await page.getByRole("tab", { name: /mevcut fiyati analiz et/i }).click();
await expect(page.getByText(/onerilen guvenli fiyat/i)).toBeVisible();
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm --filter @trendyol-etsy/web exec playwright test -c ../../playwright.config.ts tests/e2e/etsy-cost-calculator.spec.ts
```

Expected: FAIL on missing quick-mode labels or overlay behavior.

- [ ] **Step 3: Run the final regression sweep after implementation**

Run:

```bash
pnpm --filter @trendyol-etsy/web typecheck
pnpm --filter @trendyol-etsy/web exec vitest run src/features/etsyCostCalculator src/app/router.test.tsx
pnpm --filter @trendyol-etsy/web exec playwright test -c ../../playwright.config.ts tests/e2e/etsy-cost-calculator.spec.ts
```

Expected:
- `typecheck`: PASS
- `vitest run src/features/etsyCostCalculator src/app/router.test.tsx`: PASS
- `playwright test -c ../../playwright.config.ts tests/e2e/etsy-cost-calculator.spec.ts`: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/web/tests/e2e/etsy-cost-calculator.spec.ts apps/web/src/features/etsyCostCalculator apps/web/src/app/router.test.tsx
git commit -m "test: cover etsy calculator quick mode workflow"
```
