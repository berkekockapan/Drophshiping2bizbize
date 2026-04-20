# AI Connections CLIProxyAPI Codex OAuth Direct Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `AI Bağlantıları` ve `Etsy'e Yükle` alan üretimlerini `apps/web -> Windows CLIProxyAPI` hattına taşıyıp `apps/api` tarafını yalnızca hedef ayarlarının kalıcı kaynağı olarak bırakmak.

**Architecture:** `apps/api`, `app_settings` içine tek hedef AI bağlantı bilgisini saklar ve `PATCH /settings` isteklerini alan bazlı merge ederek farklı ekranların birbirinin ayarlarını ezmesini önler. `apps/web` tarafında yeni bir CLIProxy istemci katmanı kurulur; `AI Bağlantıları` sayfası management endpoint'lerine, Etsy prep üretimi ise inference endpoint'lerine doğrudan gider. Mevcut `apps/api` OpenAI OAuth zinciri dosyada kalır ama aktif ürün akışından çıkar; böylece geçiş tek hedef etrafında sadeleşir.

**Tech Stack:** TypeScript, Hono, D1/SQLite, React, TanStack Query, Vitest, Tailwind CSS

---

## Implementation Notes

- Source spec: `docs/superpowers/specs/2026-03-25-ai-connections-cliproxyapi-codex-oauth-direct-design.md`
- Bu spec tek bir hedef pipeline'ı anlattığı için ayrı planlara bölünmemeli; `settings`, `AI Bağlantıları` ve `Etsy prep` davranışları aynı deployable değişikliğin parçaları.
- Uygulama sırasında tercih edilen yürütme becerisi `@superpowers:subagent-driven-development`, inline tercih edilirse `@superpowers:executing-plans` olmalı.
- Yeni migration numarası `0006_ai_target_settings.sql` olmalı; repo zaten `0000`-`0005` aralığını kullanıyor.
- `PATCH /settings` artık tam replace değil merge semantics ile çalışmalı. Aksi halde `/settings` ekranı yalnızca refresh alanlarını, `/connections` ekranı yalnızca AI hedef alanlarını kaydederken birbirinin verisini sıfırlar.
- `localStorage` yalnızca hızlı ilk render için `aiTarget.baseUrl`, `aiTarget.label`, `aiTarget.updatedAt` saklamalı. Secret alanlar (`management key`, inference için kullanılan app key) `localStorage`'a yazılmamalı.
- Spec bölüm 7.3 doğrudan browser-side inference için `api-keys` kullanımını söylüyor ama bölüm 6.1 bu credential'ın nerede tutulacağını tanımlamıyor. Bu plan, üretim akışını gerçekten ship edebilmek için `app_settings` sözleşmesine `aiTargetApiKey` alanını ekler. Ürün tarafı bu genişlemeyi kabul etmiyorsa Task 4'e geçmeden önce spec revize edilmelidir.
- `PATCH /v0/management/auth-files/status` request body şekli spec'te verilmediği için bunu yalnızca `apps/web/src/features/connections/lib/cliProxyApi.ts` içinde kapsülle. Bu endpoint'in gerçek payload'ı değişirse yalnızca tek dosya güncellensin.
- `apps/api/src/routes/aiProfiles.ts` ve `apps/api/src/modules/ai/*` legacy olarak kalmalı; bu iterasyonda silme değil, aktif web akışının onlara bağımlılığını kaldırma hedefleniyor.
- Kullanıcı açıkça subagent delegasyonu istemediği için skill içindeki reviewer-subagent döngüsü yerine yerel plan review uygulanmalı.

## File Structure

### API settings persistence and validation
- Create: `apps/api/drizzle/0006_ai_target_settings.sql` - `app_settings` tablosuna AI hedef kolonlarını ekle.
- Modify: `apps/api/src/db/schema.ts` - yeni `appSettings` kolonlarını Drizzle schema'ya yansıt.
- Modify: `apps/api/src/db/repositories/settingsRepo.ts` - settings okuma/yazma ve merge patch davranışını genişlet.
- Modify: `apps/api/src/routes/settings.ts` - partial payload validation ve normalize etme kurallarını uygula.
- Modify: `packages/shared/src/schemas/settings.ts` - paylaşılan schema'yı yeni alanlarla eşitle.
- Create: `apps/api/tests/integration/settings.test.ts` - merge patch, validation ve clear davranışını test et.
- Modify: `apps/api/tests/integration/schema.test.ts` - migration ile gelen yeni kolonları doğrula.
- Modify: `apps/api/tests/integration/listViews.test.ts` - varsayılan settings payload'ının yeni alanları döndürdüğünü doğrula.

### Web AI target cache and direct CLIProxy client
- Modify: `apps/web/src/app/api.ts` - genişleyen settings response/payload tiplerini ekle.
- Create: `apps/web/src/features/connections/lib/aiTargetStorage.ts` - localStorage cache okuma/yazma ve clear yardımcıları.
- Create: `apps/web/src/features/connections/lib/cliProxyApi.ts` - management ve inference çağrıları için typed istemci ve hata sınıfları.
- Create: `apps/web/src/features/connections/lib/aiTargetStorage.test.ts` - cache davranışını doğrula.
- Create: `apps/web/src/features/connections/lib/cliProxyApi.test.ts` - header kurma, timeout ve error mapping davranışını doğrula.

### AI Connections UI and direct account management
- Create: `apps/web/src/features/connections/components/AiTargetConfigPanel.tsx` - hedef formu, save CTA'sı ve cache/backend senkron durumu.
- Modify: `apps/web/src/features/connections/hooks/useAIConnections.ts` - settings yükleme, auth status polling, auth-files listeleme ve activate/delete mutation'ları.
- Modify: `apps/web/src/features/connections/components/ConnectorStatusCard.tsx` - auth-file tabanlı hesap listesi ve Windows login bilgilendirmesi.
- Modify: `apps/web/src/features/connections/routes/AIConnectionsPage.tsx` - config panel + hesap yönetimi kompozisyonu.
- Modify: `apps/web/src/features/connections/routes/AIConnectionsPage.test.tsx` - settings cache, connect, polling, activate ve delete senaryoları.

### Etsy prep direct inference and bootstrap cleanup
- Modify: `apps/api/src/modules/etsyPrep/buildEtsyPrepView.ts` - bootstrap response'tan stale connector snapshot alanını çıkar.
- Modify: `apps/api/tests/integration/etsyPrep.test.ts` - bootstrap ve save akışını yeni response şekline göre doğrula.
- Modify: `apps/web/src/app/api.ts` - `EtsyPrepBootstrapResponse` tipini sadeleştir.
- Modify: `apps/web/src/features/etsyPrep/hooks/useEtsyPrepWorkspace.ts` - target config/auth-files gating ve doğrudan `/v1/chat/completions` çağrısı.
- Modify: `apps/web/src/features/etsyPrep/components/PrepModeHeader.tsx` - yeni hedef/hesap durumu metnini göster.
- Modify: `apps/web/src/features/etsyPrep/components/EtsyPrepWorkspace.test.tsx` - target config eksik, disabled hesap ve başarılı direct inference senaryoları.
- Modify: `apps/web/src/features/product/routes/ProductDetailPage.test.tsx` - sadeleşen bootstrap payload'ına uyum.
- Modify: `docs/runbooks/local-connector.md` - Windows CLIProxy hedef kurulumunu, internet erişimini ve RDP login notunu belgeleyin.

## Task 1: API ayar kalıcılığını AI hedef bilgisi ile genişlet

**Files:**
- Create: `apps/api/drizzle/0006_ai_target_settings.sql`
- Modify: `apps/api/src/db/schema.ts`
- Modify: `apps/api/src/db/repositories/settingsRepo.ts`
- Modify: `apps/api/src/routes/settings.ts`
- Modify: `packages/shared/src/schemas/settings.ts`
- Create: `apps/api/tests/integration/settings.test.ts`
- Modify: `apps/api/tests/integration/schema.test.ts`
- Modify: `apps/api/tests/integration/listViews.test.ts`

- [ ] **Step 1: Yeni kolonlar ve merge patch davranışı için failing integration testleri yaz**

```ts
const response = await app.request(
  "http://localhost/settings",
  {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      aiTargetBaseUrl: "https://clip.example.com",
      aiTargetLabel: "Windows",
      aiTargetManagementKey: "mgmt_live_123",
      aiTargetApiKey: "api_live_123",
    }),
  },
  env,
);

expect(response.status).toBe(200);
expect(await response.json()).toMatchObject({
  refreshIntervalHours: 5,
  connectorHealthcheckEnabled: true,
  aiTargetBaseUrl: "https://clip.example.com",
  aiTargetLabel: "Windows",
  aiTargetManagementKey: "mgmt_live_123",
  aiTargetApiKey: "api_live_123",
});
```

```ts
const refreshOnly = await app.request(
  "http://localhost/settings",
  {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshIntervalHours: 12 }),
  },
  env,
);

expect(await refreshOnly.json()).toMatchObject({
  refreshIntervalHours: 12,
  aiTargetBaseUrl: "https://clip.example.com",
  aiTargetManagementKey: "mgmt_live_123",
  aiTargetApiKey: "api_live_123",
});
```

```ts
const settingsColumns = database.prepare("pragma table_info(app_settings)").all() as Array<{ name: string }>;
expect(settingsColumns).toEqual(
  expect.arrayContaining([
    expect.objectContaining({ name: "ai_target_base_url" }),
    expect.objectContaining({ name: "ai_target_management_key" }),
    expect.objectContaining({ name: "ai_target_label" }),
    expect.objectContaining({ name: "ai_target_api_key" }),
  ]),
);
```

- [ ] **Step 2: Focused API testlerini çalıştır ve önce kırıldığını doğrula**

Run: `pnpm --filter @trendyol-etsy/api test -- tests/integration/schema.test.ts tests/integration/listViews.test.ts tests/integration/settings.test.ts`
Expected: FAIL because `app_settings` henüz AI hedef kolonlarını içermiyor ve `PATCH /settings` partial merge davranışını desteklemiyor.

- [ ] **Step 3: Migration ve schema alanlarını ekle**

```sql
ALTER TABLE "app_settings" ADD COLUMN "ai_target_base_url" text;
ALTER TABLE "app_settings" ADD COLUMN "ai_target_management_key" text;
ALTER TABLE "app_settings" ADD COLUMN "ai_target_label" text;
ALTER TABLE "app_settings" ADD COLUMN "ai_target_api_key" text;
```

```ts
export const appSettings = sqliteTable("app_settings", {
  id: text("id").primaryKey(),
  refreshIntervalHours: integer("refresh_interval_hours").notNull().default(5),
  promptPreferencesJson: text("prompt_preferences_json"),
  connectorHealthcheckEnabled: integer("connector_healthcheck_enabled", { mode: "boolean" }).notNull().default(true),
  aiTargetBaseUrl: text("ai_target_base_url"),
  aiTargetManagementKey: text("ai_target_management_key"),
  aiTargetLabel: text("ai_target_label"),
  aiTargetApiKey: text("ai_target_api_key"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});
```

- [ ] **Step 4: Settings repo ve route validation katmanını merge patch mantığıyla uygula**

```ts
export interface SaveSettingsInput {
  refreshIntervalHours?: number;
  promptPreferences?: Record<string, unknown> | null;
  connectorHealthcheckEnabled?: boolean;
  aiTargetBaseUrl?: string | null;
  aiTargetManagementKey?: string | null;
  aiTargetLabel?: string | null;
  aiTargetApiKey?: string | null;
}
```

```ts
function normalizeOptionalString(value: unknown) {
  if (typeof value !== "string") {
    return value === null ? null : undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
```

```ts
const merged = {
  ...current,
  ...(typeof input.refreshIntervalHours === "number" ? { refreshIntervalHours: input.refreshIntervalHours } : {}),
  ...(typeof input.connectorHealthcheckEnabled === "boolean"
    ? { connectorHealthcheckEnabled: input.connectorHealthcheckEnabled }
    : {}),
  ...(typeof input.promptPreferences !== "undefined" ? { promptPreferences: input.promptPreferences } : {}),
  ...(typeof input.aiTargetBaseUrl !== "undefined" ? { aiTargetBaseUrl: input.aiTargetBaseUrl } : {}),
  ...(typeof input.aiTargetManagementKey !== "undefined"
    ? { aiTargetManagementKey: input.aiTargetManagementKey }
    : {}),
  ...(typeof input.aiTargetLabel !== "undefined" ? { aiTargetLabel: input.aiTargetLabel ?? "Windows" } : {}),
  ...(typeof input.aiTargetApiKey !== "undefined" ? { aiTargetApiKey: input.aiTargetApiKey } : {}),
};
```

- [ ] **Step 5: Focused API testlerini tekrar çalıştır ve geçtiğini doğrula**

Run: `pnpm --filter @trendyol-etsy/api test -- tests/integration/schema.test.ts tests/integration/listViews.test.ts tests/integration/settings.test.ts`
Expected: PASS with new `app_settings` kolonları, varsayılan null AI hedef alanları ve merge patch semantics.

- [ ] **Step 6: Settings kalıcılığı değişikliğini commit et**

```bash
git add apps/api/drizzle/0006_ai_target_settings.sql apps/api/src/db/schema.ts apps/api/src/db/repositories/settingsRepo.ts apps/api/src/routes/settings.ts packages/shared/src/schemas/settings.ts apps/api/tests/integration/settings.test.ts apps/api/tests/integration/schema.test.ts apps/api/tests/integration/listViews.test.ts
git commit -m "feat: persist ai target settings"
```

## Task 2: Web için target cache ve typed CLIProxy istemcisini kur

**Files:**
- Modify: `apps/web/src/app/api.ts`
- Create: `apps/web/src/features/connections/lib/aiTargetStorage.ts`
- Create: `apps/web/src/features/connections/lib/cliProxyApi.ts`
- Create: `apps/web/src/features/connections/lib/aiTargetStorage.test.ts`
- Create: `apps/web/src/features/connections/lib/cliProxyApi.test.ts`

- [ ] **Step 1: Local cache ve error mapping için failing web unit testleri yaz**

```ts
localStorage.setItem("aiTarget.baseUrl", "https://cached.clip.example.com");
localStorage.setItem("aiTarget.label", "Windows");
localStorage.setItem("aiTarget.updatedAt", "1711274400000");

expect(readAiTargetCache()).toEqual({
  baseUrl: "https://cached.clip.example.com",
  label: "Windows",
  updatedAt: 1711274400000,
});
```

```ts
const fetchImpl = vi.fn().mockResolvedValue(
  new Response(JSON.stringify({ error: "Management key gecersiz" }), {
    status: 403,
    headers: { "Content-Type": "application/json" },
  }),
);

const client = createCliProxyApiClient({
  baseUrl: "https://clip.example.com",
  managementKey: "mgmt_live_123",
  apiKey: "api_live_123",
  fetchImpl,
});

await expect(client.listAuthFiles()).rejects.toMatchObject({
  code: "TARGET_MANAGEMENT_UNAUTHORIZED",
});
```

- [ ] **Step 2: Focused web unit testlerini çalıştır ve önce kırıldığını doğrula**

Run: `pnpm --filter @trendyol-etsy/web test -- src/features/connections/lib/aiTargetStorage.test.ts src/features/connections/lib/cliProxyApi.test.ts`
Expected: FAIL because cache helpers ve yeni direct client henüz mevcut değil.

- [ ] **Step 3: LocalStorage helper'larını ve typed direct client'ı implement et**

```ts
export interface AiTargetCache {
  baseUrl: string;
  label: string;
  updatedAt: number | null;
}

export function writeAiTargetCache(input: { baseUrl: string; label: string }) {
  localStorage.setItem("aiTarget.baseUrl", input.baseUrl);
  localStorage.setItem("aiTarget.label", input.label);
  localStorage.setItem("aiTarget.updatedAt", String(Date.now()));
}
```

```ts
export class CliProxyRequestError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "CliProxyRequestError";
  }
}
```

```ts
async function managementFetch(path: string, init?: RequestInit) {
  return fetchWithTimeout(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${managementKey}`,
      ...(init?.headers ?? {}),
    },
  });
}
```

```ts
async function inferenceFetch(path: string, init?: RequestInit) {
  return fetchWithTimeout(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...(init?.headers ?? {}),
    },
  });
}
```

- [ ] **Step 4: Backend settings tiplerini direct target alanlarıyla genişlet**

```ts
export interface AppSettingsResponse {
  id: string;
  refreshIntervalHours: number;
  promptPreferences: Record<string, unknown> | null;
  connectorHealthcheckEnabled: boolean;
  aiTargetBaseUrl: string | null;
  aiTargetManagementKey: string | null;
  aiTargetLabel: string | null;
  aiTargetApiKey: string | null;
}
```

```ts
export async function patchSettings(payload: {
  refreshIntervalHours?: number;
  promptPreferences?: Record<string, unknown> | null;
  connectorHealthcheckEnabled?: boolean;
  aiTargetBaseUrl?: string | null;
  aiTargetManagementKey?: string | null;
  aiTargetLabel?: string | null;
  aiTargetApiKey?: string | null;
}) {
  const response = await fetchWithTimeout("/settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return parseJson<AppSettingsResponse>(response);
}
```

- [ ] **Step 5: Focused web unit testlerini tekrar çalıştır ve geçtiğini doğrula**

Run: `pnpm --filter @trendyol-etsy/web test -- src/features/connections/lib/aiTargetStorage.test.ts src/features/connections/lib/cliProxyApi.test.ts`
Expected: PASS with local cache helpers, typed CLIProxy errors and distinct management/inference auth headers.

- [ ] **Step 6: Web target client temelini commit et**

```bash
git add apps/web/src/app/api.ts apps/web/src/features/connections/lib/aiTargetStorage.ts apps/web/src/features/connections/lib/cliProxyApi.ts apps/web/src/features/connections/lib/aiTargetStorage.test.ts apps/web/src/features/connections/lib/cliProxyApi.test.ts
git commit -m "feat: add direct cliproxy web client"
```

## Task 3: AI Bağlantıları ekranını direct management akışına taşı

**Files:**
- Create: `apps/web/src/features/connections/components/AiTargetConfigPanel.tsx`
- Modify: `apps/web/src/features/connections/hooks/useAIConnections.ts`
- Modify: `apps/web/src/features/connections/components/ConnectorStatusCard.tsx`
- Modify: `apps/web/src/features/connections/routes/AIConnectionsPage.tsx`
- Modify: `apps/web/src/features/connections/routes/AIConnectionsPage.test.tsx`

- [ ] **Step 1: Target config, connect polling ve auth-file aksiyonları için failing page testleri yaz**

```ts
expect(await screen.findByDisplayValue("https://clip.example.com")).toBeInTheDocument();
expect(await screen.findByDisplayValue("Windows")).toBeInTheDocument();
expect(await screen.findByText(/henüz bağlı codex hesabı yok/i)).toBeInTheDocument();

await user.click(screen.getByRole("button", { name: /openai ile bağlan/i }));

expect(windowOpenSpy).toHaveBeenCalledWith(
  "https://auth.openai.com/oauth/authorize?client_id=test",
  "_blank",
  "noopener,noreferrer",
);
expect(await screen.findByText(/windows oturumunda giriş tamamlayın/i)).toBeInTheDocument();
expect(await screen.findByText(/tarayıcıda giriş bekleniyor/i)).toBeInTheDocument();
expect(await screen.findByText(/primary workspace aktif hesap olarak hazır/i, {}, { timeout: 2500 })).toBeInTheDocument();
```

```ts
await user.click(screen.getByRole("button", { name: /aktif yap/i }));
expect(await screen.findByText(/backup workspace aktif hesap/i)).toBeInTheDocument();

await user.click(screen.getByRole("button", { name: /bağlantıyı kaldır/i }));
expect(screen.queryByText(/backup workspace/i)).not.toBeInTheDocument();
```

- [ ] **Step 2: Focused AI Connections testini çalıştır ve önce kırıldığını doğrula**

Run: `pnpm --filter @trendyol-etsy/web test -- src/features/connections/routes/AIConnectionsPage.test.tsx`
Expected: FAIL because sayfa hâlâ `/ai-profiles/*` endpoint'lerine bağlı ve hedef config paneli henüz yok.

- [ ] **Step 3: Hook içinde settings + auth-files + auth-status orkestrasyonunu kur**

```ts
const settingsQuery = useQuery({
  queryKey: ["settings"],
  queryFn: fetchSettings,
});

const target = useMemo(() => buildAiTarget(settingsQuery.data, readAiTargetCache()), [settingsQuery.data]);
const client = useMemo(() => (target ? createCliProxyApiClient(target) : null), [target]);

const authFilesQuery = useQuery({
  queryKey: ["cli-proxy-auth-files", target?.baseUrl],
  enabled: Boolean(client && target?.managementKey),
  queryFn: () => client!.listAuthFiles(),
});
```

```ts
const pollingQuery = useQuery({
  queryKey: ["cli-proxy-auth-status", activeState],
  enabled: Boolean(client && activeState),
  queryFn: () => client!.getAuthStatus(activeState!),
  refetchInterval: (query) => {
    const status = query.state.data?.status;
    return status === "wait" ? 1000 : false;
  },
});
```

- [ ] **Step 4: Config paneli ve auth-file tabanlı hesap yönetimi UI'ını implement et**

```tsx
<AiTargetConfigPanel
  initialValue={{
    baseUrl: resolvedSettings.aiTargetBaseUrl ?? cached.baseUrl ?? "",
    label: resolvedSettings.aiTargetLabel ?? cached.label ?? "Windows",
    managementKey: resolvedSettings.aiTargetManagementKey ?? "",
    apiKey: resolvedSettings.aiTargetApiKey ?? "",
  }}
  pending={saveTargetMutation.isPending}
  onSubmit={(payload) => saveTargetMutation.mutate(payload)}
/>
```

```ts
async function activateAuthFile(name: string) {
  for (const item of authFilesQuery.data?.items ?? []) {
    await client!.setAuthFileDisabled(item.name, item.name !== name);
  }
  await authFilesQuery.refetch();
}
```

```tsx
{attemptMessage ? (
  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
    {attemptMessage}
    <p className="mt-2">OAuth tamamlamasını Windows oturumunda (ör. RDP) bitirin.</p>
  </div>
) : null}
```

- [ ] **Step 5: Focused AI Connections testini tekrar çalıştır ve geçtiğini doğrula**

Run: `pnpm --filter @trendyol-etsy/web test -- src/features/connections/routes/AIConnectionsPage.test.tsx`
Expected: PASS with settings-backed target form, `codex-auth-url` / `get-auth-status` polling ve `auth-files` tabanlı activate/delete davranışı.

- [ ] **Step 6: Direct AI Connections geçişini commit et**

```bash
git add apps/web/src/features/connections/components/AiTargetConfigPanel.tsx apps/web/src/features/connections/hooks/useAIConnections.ts apps/web/src/features/connections/components/ConnectorStatusCard.tsx apps/web/src/features/connections/routes/AIConnectionsPage.tsx apps/web/src/features/connections/routes/AIConnectionsPage.test.tsx
git commit -m "feat: move ai connections to direct cliproxy management"
```

## Task 4: Etsy prep üretimini direct inference hattına taşı ve bootstrap'ı sadeleştir

**Files:**
- Modify: `apps/api/src/modules/etsyPrep/buildEtsyPrepView.ts`
- Modify: `apps/api/tests/integration/etsyPrep.test.ts`
- Modify: `apps/web/src/app/api.ts`
- Modify: `apps/web/src/features/etsyPrep/hooks/useEtsyPrepWorkspace.ts`
- Modify: `apps/web/src/features/etsyPrep/components/PrepModeHeader.tsx`
- Modify: `apps/web/src/features/etsyPrep/components/EtsyPrepWorkspace.test.tsx`
- Modify: `apps/web/src/features/product/routes/ProductDetailPage.test.tsx`
- Modify: `docs/runbooks/local-connector.md`

- [ ] **Step 1: Bootstrap sadeleşmesi ve direct generation için failing API/web testleri yaz**

```ts
expect(await bootstrap.json()).toEqual(
  expect.objectContaining({
    product: expect.objectContaining({ id: seeded.product.id }),
    draft: expect.objectContaining({ productId: seeded.product.id }),
  }),
);
expect((await bootstrap.json()).connectorProfileSnapshot).toBeUndefined();
```

```ts
if (url === "https://clip.example.com/v0/management/auth-files") {
  return jsonResponse({
    items: [
      { name: "primary.json", label: "OpenAI Workspace", disabled: false },
    ],
  });
}

if (url === "https://clip.example.com/v1/chat/completions" && init?.method === "POST") {
  return jsonResponse({
    choices: [
      {
        message: {
          content: JSON.stringify({ field: "title", value: "Handmade Oversize Hoodie" }),
        },
      },
    ],
    model: "gpt-4.1-mini",
  });
}
```

```ts
expect(await screen.findByText(/aktif bağlantı: windows • openai workspace/i)).toBeInTheDocument();
expect(await screen.findByLabelText(/title/i)).toHaveValue("Handmade Oversize Hoodie");
expect(fetchSpy).toHaveBeenCalledWith(
  "https://clip.example.com/v1/chat/completions",
  expect.objectContaining({ method: "POST" }),
);
```

- [ ] **Step 2: Focused API ve web testlerini çalıştır, kırıldığını doğrula**

Run: `pnpm --filter @trendyol-etsy/api test -- tests/integration/etsyPrep.test.ts && pnpm --filter @trendyol-etsy/web test -- src/features/etsyPrep/components/EtsyPrepWorkspace.test.tsx src/features/product/routes/ProductDetailPage.test.tsx`
Expected: FAIL because bootstrap hâlâ connector snapshot döndürüyor ve web üretimi `/ai-profiles/generate-field` üstünden gidiyor.

- [ ] **Step 3: Etsy prep bootstrap response'unu stale profile snapshot'tan arındır**

```ts
export interface EtsyPrepView {
  product: NonNullable<Awaited<ReturnType<typeof buildProductDetailView>>>["product"];
  draft: EtsyDraftRecord;
}

export async function buildEtsyPrepView(db: D1Database, productId: string): Promise<EtsyPrepView | null> {
  const detail = await buildProductDetailView(db, productId);
  if (!detail) {
    return null;
  }

  const draft = await createDraftsRepo(db).ensureForProduct(productId);
  return { product: detail.product, draft };
}
```

```ts
export interface EtsyPrepBootstrapResponse {
  product: ProductDetailResponse["product"];
  draft: EtsyDraft;
}
```

- [ ] **Step 4: Auth-files gating ve `/v1/chat/completions` üzerinden direct generation implement et**

```ts
const settingsQuery = useQuery({ queryKey: ["settings"], queryFn: fetchSettings });
const target = useMemo(() => buildAiTarget(settingsQuery.data, readAiTargetCache()), [settingsQuery.data]);
const client = useMemo(() => (target ? createCliProxyApiClient(target) : null), [target]);

const authFilesQuery = useQuery({
  queryKey: ["cli-proxy-auth-files", target?.baseUrl],
  enabled: Boolean(client && target?.managementKey),
  queryFn: () => client!.listAuthFiles(),
  retry: false,
});

const activeAuthFile = authFilesQuery.data?.items.find((item) => item.disabled === false) ?? null;
const canGenerate = Boolean(target?.baseUrl && target?.apiKey && activeAuthFile);
```

```ts
const generated = await client!.generateField({
  field,
  prompt: promptPackage.prompt,
  context: promptPackage.context,
});

handleGeneratedFieldWrite(field, generated.value);
setFieldStates((current) => ({
  ...current,
  [field]: {
    isGenerating: false,
    error: null,
    helper: `${generated.model} ile üretildi`,
    provider: generated.provider,
  },
}));
```

```ts
if (!target?.baseUrl || !target?.managementKey || !target?.apiKey) {
  return "AI hedef ayarları eksik. AI Bağlantıları sayfasından Windows hedefini kaydedin.";
}

if (!activeAuthFile) {
  return "Üretim için en az bir etkin Codex hesabı gerekli.";
}
```

- [ ] **Step 5: Runbook'u güncelle ve yeni operatör akışını belgeleyin**

```md
1. `AI Bağlantıları` sayfasında hedef `base URL`, `management key` ve `app API key` alanlarını doldurun.
2. `OpenAI ile Bağlan` aksiyonunu başlatın.
3. Dönen login penceresini Windows oturumunda (RDP/console) tamamlayın; `localhost:1455` callback forwarder bu oturuma bağlıdır.
4. `auth-files` listesinde bir hesabın `disabled=false` olduğundan emin olun.
5. Ürün detayında `Etsy'e Yükle` alan üretimlerini test edin.
```

- [ ] **Step 6: Focused regresyon testlerini ve typecheck'i tekrar çalıştır**

Run: `pnpm --filter @trendyol-etsy/api test -- tests/integration/etsyPrep.test.ts && pnpm --filter @trendyol-etsy/web test -- src/features/etsyPrep/components/EtsyPrepWorkspace.test.tsx src/features/product/routes/ProductDetailPage.test.tsx && pnpm --filter @trendyol-etsy/web typecheck && pnpm --filter @trendyol-etsy/api typecheck`
Expected: PASS with connector snapshot-free bootstrap, auth-file based gating, direct CLIProxy inference ve güncel dokümantasyon.

- [ ] **Step 7: Direct inference geçişini commit et**

```bash
git add apps/api/src/modules/etsyPrep/buildEtsyPrepView.ts apps/api/tests/integration/etsyPrep.test.ts apps/web/src/app/api.ts apps/web/src/features/etsyPrep/hooks/useEtsyPrepWorkspace.ts apps/web/src/features/etsyPrep/components/PrepModeHeader.tsx apps/web/src/features/etsyPrep/components/EtsyPrepWorkspace.test.tsx apps/web/src/features/product/routes/ProductDetailPage.test.tsx docs/runbooks/local-connector.md
git commit -m "feat: send etsy prep generation to direct cliproxy target"
```

## Local Review Checklist

- [ ] `PATCH /settings` iki ekrandan gelen kısmi payload'ları merge ediyor; target alanları refresh ayarları tarafından silinmiyor.
- [ ] Secret alanlar (`management key`, `api key`) yalnızca memory/query state içinde kalıyor; `localStorage` yalnızca `baseUrl`, `label`, `updatedAt` saklıyor.
- [ ] `AI Bağlantıları` artık hiçbir aktif kullanıcı yolunda `/ai-profiles/*` endpoint'ine gitmiyor.
- [ ] Etsy prep üretimi prompt paketini hâlâ `apps/api` üzerinden alıyor ama inference çağrısını doğrudan hedefe yapıyor.
- [ ] Target config eksik, tüm hesaplar disabled veya management/inference yetkisiz olduğunda kullanıcıya ürün copy'siyle net hata veriliyor.
