# AI Connections Provider Default And Mock Visibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connector varsayılanını `chatgpt-web` yapıp `AI Bağlantıları` ekranında `mock` modunu açık uyarı ve provider görünürlüğü ile ayırt edilebilir hale getirmek.

**Architecture:** Connector tarafında provider çözümleme fallback'i ve örnek env değeri `chatgpt-web` olacak şekilde değiştirilir; `mock` yalnızca açık opt-in ile seçilir. Web tarafında mevcut health/profile payload'ı yeniden kullanılarak provider etiketi, mock uyarı kartı ve test/prototip dili eklenir; böylece backend sözleşmesi büyümeden ürün davranışı netleşir.

**Tech Stack:** TypeScript, Fastify, React, TanStack Query, Tailwind CSS, Vitest, Markdown runbooks

---

## Implementation Notes

- Source spec: `docs/superpowers/specs/2026-03-24-ai-connections-provider-default-and-mock-visibility-design.md`
- Bu iş mevcut ChatGPT web bağlantı akışını yeniden tasarlamaz; sadece varsayılan provider yönünü ve UI teşhis katmanını düzeltir.
- `mock` provider silinmemeli; testler ve local demo akışları explicit env ile çalışmaya devam etmelidir.
- `apps/web/src/app/api.ts` içindeki `ConnectorHealthResponse.provider` alanı route davranışına uygun olarak zorunlu yapılabilir; `apps/connector/src/routes/health.ts` zaten bunu döndürüyor.
- Connector varsayılanı değişince mevcut kullanıcı `.env` dosyaları otomatik yazılmayacak; runbook ve UI uyarısı gerekli yönlendirmeyi üstlenmeli.
- Because explicit subagent delegation was not requested, do a local plan review instead of the skill's reviewer subagent loop.

## File Structure

### Connector default-provider configuration
- Modify: `apps/connector/src/config.ts` - provider çözümleme fallback'ini `chatgpt-web` yap.
- Modify: `apps/connector/.env.example` - örnek konfigürasyonda yeni varsayılanı göster.
- Modify: `apps/connector/tests/unit/config.test.ts` - varsayılan ve explicit `mock` senaryolarını doğrula.

### Web AI Connections visibility
- Modify: `apps/web/src/app/api.ts` - connector health tipini gerçek response ile hizala.
- Modify: `apps/web/src/features/connections/routes/AIConnectionsPage.tsx` - provider normalizasyonunu tek yerde yap.
- Modify: `apps/web/src/features/connections/components/ConnectorStatusCard.tsx` - provider etiketi, mock uyarısı ve test/prototip dili ekle.
- Modify: `apps/web/src/features/connections/routes/AIConnectionsPage.test.tsx` - `mock` ve `chatgpt-web` görünürlüğünü kapsa.

### Docs and focused verification
- Modify: `docs/runbooks/local-connector.md` - `chatgpt-web` varsayılanını ve `mock` opt-in davranışını belgeleyin.

## Task 1: Switch the connector default provider to `chatgpt-web`

**Files:**
- Modify: `apps/connector/src/config.ts`
- Modify: `apps/connector/.env.example`
- Modify: `apps/connector/tests/unit/config.test.ts`

- [ ] **Step 1: Add failing config tests for the new default and explicit mock opt-in**

```ts
it("defaults to chatgpt-web when CONNECTOR_PROVIDER is omitted", () => {
  const config = loadConfig({} as NodeJS.ProcessEnv);
  expect(config.provider).toBe("chatgpt-web");
});

it("keeps mock provider available when explicitly configured", () => {
  const config = loadConfig({ CONNECTOR_PROVIDER: "mock" } as NodeJS.ProcessEnv);
  expect(config.provider).toBe("mock");
});
```

- [ ] **Step 2: Run the focused connector config test and verify it fails first**

Run: `pnpm --filter @trendyol-etsy/connector test -- tests/unit/config.test.ts`
Expected: FAIL because provider fallback still resolves to `mock`.

- [ ] **Step 3: Implement the minimal config and example-env change**

```ts
function toProviderId(value: string | undefined): ProviderId {
  if (value === "mock") {
    return "mock";
  }

  return "chatgpt-web";
}
```

```dotenv
CONNECTOR_PROVIDER=chatgpt-web
```

- [ ] **Step 4: Re-run the focused connector config test**

Run: `pnpm --filter @trendyol-etsy/connector test -- tests/unit/config.test.ts`
Expected: PASS with `chatgpt-web` as the fallback and `mock` preserved as an explicit override.

- [ ] **Step 5: Commit the connector default-provider change**

```bash
git add apps/connector/src/config.ts apps/connector/.env.example apps/connector/tests/unit/config.test.ts
git commit -m "feat: default connector provider to chatgpt web"
```

## Task 2: Make provider mode visible in `AI Bağlantıları`

**Files:**
- Modify: `apps/web/src/app/api.ts`
- Modify: `apps/web/src/features/connections/routes/AIConnectionsPage.tsx`
- Modify: `apps/web/src/features/connections/components/ConnectorStatusCard.tsx`
- Modify: `apps/web/src/features/connections/routes/AIConnectionsPage.test.tsx`

- [ ] **Step 1: Add failing UI tests for `mock` warning state and `chatgpt-web` happy path**

```ts
expect(await screen.findByText(/provider: mock/i)).toBeInTheDocument();
expect(await screen.findByText(/test modu aktif/i)).toBeInTheDocument();
expect(await screen.findByText(/CONNECTOR_PROVIDER=chatgpt-web/i)).toBeInTheDocument();
expect(await screen.findByText(/mock workspace test profili/i)).toBeInTheDocument();
```

```ts
expect(await screen.findByText(/provider: chatgpt-web/i)).toBeInTheDocument();
expect(screen.queryByText(/test modu aktif/i)).not.toBeInTheDocument();
expect(await screen.findByText(/chatgpt workspace bağlı/i)).toBeInTheDocument();
```

- [ ] **Step 2: Run the focused AI Connections test and confirm failure**

Run: `pnpm --filter @trendyol-etsy/web test -- src/features/connections/routes/AIConnectionsPage.test.tsx`
Expected: FAIL because the page does not yet render provider labels or mock-mode warnings.

- [ ] **Step 3: Implement provider normalization, warning copy, and mock-specific badges**

```ts
export interface ConnectorHealthResponse {
  status: string;
  provider: string;
  activeProfile: ConnectorProfile | null;
}
```

```ts
const provider = health?.provider ?? health?.activeProfile?.provider ?? "chatgpt-web";
const isMock = provider === "mock";
```

```tsx
{isMock ? (
  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
    Test modu aktif. Bu connector gerçek ChatGPT hesabı yerine local mock provider kullanıyor.
    Gerçek bağlantı için `CONNECTOR_PROVIDER=chatgpt-web` ayarlayıp connector'ı yeniden başlatın.
  </div>
) : null}
```

```tsx
<p className="text-sm text-slate-600">Provider: {provider}</p>
<p className="mt-1 text-sm font-semibold text-slate-900">
  {health?.activeProfile
    ? isMock
      ? `${health.activeProfile.label} test profili aktif`
      : `${health.activeProfile.label} bağlı`
    : "Aktif profil yok"}
</p>
```

- [ ] **Step 4: Re-run the focused AI Connections test**

Run: `pnpm --filter @trendyol-etsy/web test -- src/features/connections/routes/AIConnectionsPage.test.tsx`
Expected: PASS with separate `mock` and `chatgpt-web` render states.

- [ ] **Step 5: Commit the AI Connections visibility update**

```bash
git add apps/web/src/app/api.ts apps/web/src/features/connections/routes/AIConnectionsPage.tsx apps/web/src/features/connections/components/ConnectorStatusCard.tsx apps/web/src/features/connections/routes/AIConnectionsPage.test.tsx
git commit -m "feat: show connector provider and mock warnings"
```

## Task 3: Update the local connector runbook and run focused regression checks

**Files:**
- Modify: `docs/runbooks/local-connector.md`

- [ ] **Step 1: Update the runbook to describe the new default and explicit `mock` opt-in**

```md
1. `apps/connector/.env.example` dosyasını kopyalayıp `.env` oluşturun.
2. Varsayılan provider `chatgpt-web` olarak gelir.
3. Test/demonstrasyon için `mock` kullanmak istiyorsanız `CONNECTOR_PROVIDER=mock` ayarlayın.
4. `mock` modunda `AI Bağlantıları` ekranı test modu uyarısı gösterecektir.
```

- [ ] **Step 2: Re-run the focused regression suite**

Run: `pnpm --filter @trendyol-etsy/connector test -- tests/unit/config.test.ts`
Expected: PASS.

Run: `pnpm --filter @trendyol-etsy/web test -- src/features/connections/routes/AIConnectionsPage.test.tsx`
Expected: PASS.

- [ ] **Step 3: Perform a manual smoke check of the health endpoint**

Run: `CONNECTOR_PORT=4318 pnpm --filter @trendyol-etsy/connector dev`
Expected: Server starts without falling back to `mock`.

Run: `curl -sS http://127.0.0.1:4318/health`
Expected: JSON contains `"provider":"chatgpt-web"` unless the local `.env` explicitly sets `CONNECTOR_PROVIDER=mock`.

- [ ] **Step 4: Commit the documentation update**

```bash
git add docs/runbooks/local-connector.md
git commit -m "docs: clarify connector provider defaults"
```
