# AI Connections Desktop OpenAI Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Masaüstü kullanımında `AI Bağlantıları` akışını tek aktif hesap, otomatik yerel hedef, gizli gelişmiş ayarlar ve yeniden açılışta kalıcı oturum davranışı ile güvenilir hale getirmek.

**Architecture:** Uygulamanın browser-facing AI bağlantı yüzeyi olarak yerel `apps/connector` servisi kullanılacak; `apps/web` varsayılan olarak `http://127.0.0.1:4317` hedefini kullanacak ve yalnızca gerekirse `app_settings.aiTargetBaseUrl` ile override edilecek. `apps/connector` aktif profili health sırasında yeniden doğrulayacak, tek hesap semantiğini zorlayacak ve silme işleminde local browser storage’ı temizleyecek; `apps/web` bu sözleşmeyi dört durumlu bir ürün UI’ına indirgerken `Etsy Prep` de aynı hedef çözümlemeyi kullanacak.

**Tech Stack:** TypeScript, React, TanStack Query, Fastify, Playwright, Hono, D1/SQLite, Vitest, Playwright E2E, PowerShell

---

## Implementation Notes

- Source spec: `docs/superpowers/specs/2026-03-25-ai-connections-desktop-openai-fix-design.md`
- Bu repo şu anda üç farklı AI bağlantı izi taşıyor: `apps/connector`, `apps/api/src/routes/aiProfiles.ts` tabanlı legacy worker OAuth akışı ve `apps/web` içindeki doğrudan `cliProxyApi` akışı. Bu plan, masaüstü ürün deneyimini sadeleştirmek için **yerel `apps/connector` servisini tek browser-facing kaynak** olarak seçer. Legacy `/ai-profiles` worker akışı bu batch içinde silinmeyecek, fakat yeni UI kritik yolunda kullanılmayacak.
- `app_settings` içindeki `aiTargetManagementKey`, `aiTargetApiKey` ve `aiTargetLabel` alanları bu değişiklikte migration gerektirmeden legacy/hidden alanlar olarak kalabilir. Yeni normal masaüstü akışı bu secret alanlara ihtiyaç duymayacak.
- `C:\Users\berke\Desktop\Dropshipping-Baslat.bat` repo dışında olduğu için plan içinde manuel doğrulama adımı vardır; uygulama kodu tarafında kaynak kontrollü dosya `scripts/windows/start-dev.ps1` olacaktır.
- `.state/` ve `.superpowers/` ignore altında kalmalı; generated runtime/log çıktılarını commit etmeyin.
- PowerShell başlangıç scriptleri için mevcut repo içinde otomatik test harness yok. Bu yüzden script task’larında fail-fast doğrulama ve smoke run kullanılacak; kod tarafındaki davranışlar yine unit/integration testlerle korunacak.

## File Structure

### Connector health, session validation, and single-account semantics
- Modify: `apps/connector/src/providers/chatgptWebProvider.ts` - aktif profile health sırasında yeniden doğrulama, tek hesap pruning, reconnect/delete davranış sertleştirmesi.
- Modify: `apps/connector/src/providers/base.ts` - gerekirse health sözleşmesini ürün UI’ının ihtiyaç duyduğu alanlarla hizala.
- Modify: `apps/connector/tests/unit/chatGptWebProvider.test.ts` - session expiry, reopen validation, single-profile pruning regression’ları.
- Modify: `apps/connector/tests/integration/server.test.ts` - health/start/reconnect/delete uçlarının yeni davranışını doğrula.

### Windows startup contract
- Create: `scripts/windows/start-dev.ps1` - repo içindeki resmi Windows başlangıç zinciri.
- Create: `scripts/windows/stop-dev.ps1` - geliştirme servislerini kapatma yardımcısı.
- Modify: `apps/connector/.env.example` - desktop-first provider varsayılanlarını belgeleyin.
- Modify: `docs/runbooks/local-connector.md` - launcher, health check, mock guard ve smoke akışını belgeleyin.

### Web connector client and target resolution
- Delete: `apps/web/src/features/connections/lib/cliProxyApi.ts`
- Delete: `apps/web/src/features/connections/lib/cliProxyApi.test.ts`
- Create: `apps/web/src/features/connections/lib/connectorApi.ts` - local connector health, connect, poll, reconnect, delete, generate-field istemcisi.
- Create: `apps/web/src/features/connections/lib/connectorApi.test.ts` - hata mapping’i ve endpoint sözleşmeleri.
- Create: `apps/web/src/features/connections/lib/resolveConnectorTarget.ts` - default localhost + settings override çözümleme.
- Create: `apps/web/src/features/connections/lib/resolveConnectorTarget.test.ts` - target resolution regression’ları.
- Modify: `apps/web/src/features/connections/lib/aiTargetStorage.ts` - yalnızca URL override cache’i taşıyan sade model.
- Modify: `apps/web/src/features/connections/lib/aiTargetStorage.test.ts` - yeni storage semantics.
- Modify: `apps/web/src/features/connections/hooks/useAIConnections.ts` - connector health ve dört durumlu view model orkestrasyonu.

### Connections UI
- Modify: `apps/web/src/features/connections/routes/AIConnectionsPage.tsx` - dört durumlu ekran kompozisyonu.
- Modify: `apps/web/src/features/connections/components/ConnectorStatusCard.tsx` - tek aktif hesap özeti, bağlan/yeniden bağlan/kaldır aksiyonları.
- Modify: `apps/web/src/features/connections/components/AiTargetConfigPanel.tsx` - gizli `Gelişmiş Ayarlar` alanı, yalnızca URL override düzenleme.
- Modify: `apps/web/src/features/connections/routes/AIConnectionsPage.test.tsx` - connected/disconnected/connecting/error/advanced-settings senaryoları.

### Etsy Prep integration and product messaging
- Modify: `apps/web/src/features/etsyPrep/hooks/useEtsyPrepWorkspace.ts` - shared connector target resolution ve direct connector generate-field kullanımı.
- Modify: `apps/web/src/features/etsyPrep/components/PrepModeHeader.tsx` - yeni bağlantı durumu dili.
- Modify: `apps/web/src/features/etsyPrep/components/EtsyPrepWorkspace.test.tsx` - health/reauth/no-profile gating regression’ları.
- Modify: `apps/web/src/features/product/routes/ProductDetailPage.test.tsx` - üst seviye ürün ekranı mesajlarının yeni bootstrap/gating modeli ile uyumu.
- Modify: `apps/web/tests/e2e/product-detail-etsy-prep.spec.ts` - masaüstü bağlantı hazır / hazır değil akışları.

## Task 1: Connector health’i masaüstü için güvenilir ve tek hesaplı hale getir

**Files:**
- Modify: `apps/connector/src/providers/chatgptWebProvider.ts`
- Modify: `apps/connector/src/providers/base.ts`
- Modify: `apps/connector/tests/unit/chatGptWebProvider.test.ts`
- Modify: `apps/connector/tests/integration/server.test.ts`

- [ ] **Step 1: Aktif oturumu health sırasında yeniden doğrulayan ve ekstra profilleri prune eden failing testleri yaz**

```ts
it("marks the active profile as needs_reauth when health validation sees an expired session", async () => {
  const dir = await mkdtemp(join(tmpdir(), "connector-chatgpt-provider-"));
  const store = createProfileStore(dir);

  await store.saveProfile({
    id: "profile_main",
    label: "ChatGPT Workspace",
    emailMasked: "wo***@company.com",
    provider: "chatgpt-web",
    status: "connected",
    lastValidatedAt: Date.parse("2026-03-25T09:00:00.000Z"),
    lastError: null,
  });

  const provider = new ChatGptWebProvider(store, {
    stateDir: dir,
    browserSession: {
      ensureProfilePage: async () => ({ page: {} as never }),
    },
    inspectSession: async () => null,
    openLoginPage: async () => undefined,
  });

  const health = await provider.getHealth();
  expect(health.activeProfile?.status).toBe("needs_reauth");
  expect(health.activeProfile?.lastError).toBe("Session expired");
});
```

```ts
it("keeps only the newest connected chatgpt-web profile after a successful connection", async () => {
  const dir = await mkdtemp(join(tmpdir(), "connector-chatgpt-provider-"));
  const store = createProfileStore(dir);
  const attempts = createConnectionAttemptStore(dir);

  await store.saveProfile({
    id: "profile_old",
    label: "Old Workspace",
    emailMasked: "ol***@mail.com",
    provider: "chatgpt-web",
    status: "connected",
    lastValidatedAt: Date.parse("2026-03-24T10:00:00.000Z"),
    lastError: null,
  });

  let verified = false;
  const provider = new ChatGptWebProvider(store, {
    stateDir: dir,
    attempts,
    browserSession: {
      ensureProfilePage: async () => ({ page: {} as never }),
      deleteProfileStorage: async () => undefined,
    },
    openLoginPage: async () => undefined,
    inspectSession: async () =>
      verified ? { label: "New Workspace", emailMasked: "ne***@mail.com" } : null,
    createId: () => "profile_new",
  });

  const started = await provider.startConnection("openai");
  verified = true;
  await provider.getConnectionAttempt(started.id);

  const profiles = await provider.listProfiles();
  expect(profiles.map((item) => item.id)).toEqual(["profile_new"]);
});
```

- [ ] **Step 2: Focused connector testlerini çalıştır ve önce kırıldığını doğrula**

Run: `pnpm --filter @trendyol-etsy/connector test -- tests/unit/chatGptWebProvider.test.ts tests/integration/server.test.ts`

Expected: FAIL because `getHealth()` currently returns stored `activeProfile` without re-validating the browser session and successful login completion does not remove older `chatgpt-web` profiles.

- [ ] **Step 3: Health doğrulama ve single-account pruning için minimal implementation’ı ekle**

```ts
private async validateActiveProfileForHealth() {
  const activeProfile = await this.getActiveProfile();
  if (!activeProfile || activeProfile.status !== "connected") {
    return activeProfile;
  }

  const latestAttempt = await this.attempts.getLatest();
  if (latestAttempt && IN_PROGRESS_ATTEMPT_STATUSES.has(latestAttempt.status)) {
    return activeProfile;
  }

  const { page } = await this.browserSession.ensureProfilePage(activeProfile.id);
  const session = await this.inspectSessionImpl(page, activeProfile.id);

  if (!session) {
    return this.store.updateProfile(activeProfile.id, {
      status: "needs_reauth",
      lastError: SESSION_EXPIRED_MESSAGE,
    });
  }

  return this.store.saveProfile({
    id: activeProfile.id,
    label: session.label || activeProfile.label,
    emailMasked: session.emailMasked ?? activeProfile.emailMasked,
    provider: this.id,
    status: "connected",
    lastValidatedAt: this.now(),
    lastError: null,
  });
}
```

```ts
private async pruneOtherOwnedProfiles(keepProfileId: string) {
  const profiles = await this.listOwnedProfiles();

  for (const profile of profiles) {
    if (profile.id === keepProfileId) continue;
    await this.store.deleteProfile(profile.id);
    await this.browserSession.deleteProfileStorage?.(profile.id).catch(() => undefined);
  }
}
```

Call `validateActiveProfileForHealth()` inside `getHealth()`, and call `pruneOtherOwnedProfiles(profileId)` immediately after a connection attempt is completed and the new profile is promoted active.

- [ ] **Step 4: Focused connector testlerini tekrar çalıştır ve geçtiğini doğrula**

Run: `pnpm --filter @trendyol-etsy/connector test -- tests/unit/chatGptWebProvider.test.ts tests/integration/server.test.ts`

Expected: PASS with `getHealth()` downgrading expired sessions to `needs_reauth` and successful new logins leaving only one `chatgpt-web` profile in the store.

- [ ] **Step 5: Connector değişikliğini commit et**

```bash
git add apps/connector/src/providers/chatgptWebProvider.ts apps/connector/src/providers/base.ts apps/connector/tests/unit/chatGptWebProvider.test.ts apps/connector/tests/integration/server.test.ts
git commit -m "fix: harden desktop connector session health"
```

## Task 2: Windows başlangıç zincirini repo içine al ve desktop-first guard ekle

**Files:**
- Create: `scripts/windows/start-dev.ps1`
- Create: `scripts/windows/stop-dev.ps1`
- Modify: `apps/connector/.env.example`
- Modify: `docs/runbooks/local-connector.md`

- [ ] **Step 1: Mevcut launcher davranışını repo içindeki PowerShell scriptine taşı**

`start-dev.ps1` şu sırayı uygulamalı:

1. proje kökünü resolve et
2. log klasörünü `.state/windows-dev/logs` altında hazırla
3. Node / pnpm / bağımlılık / Chromium önkoşullarını kontrol et
4. eski `Dropship Connector`, `Dropship API`, `Dropship Web` pencerelerini temizle
5. connector → api → web sırasıyla başlat
6. `http://127.0.0.1:4317/health`, `http://127.0.0.1:8787/health`, `http://127.0.0.1:5173` health’lerini bekle
7. hazır olduktan sonra tarayıcıyı aç

- [ ] **Step 2: Desktop modunda `mock` provider için fail-fast guard ekle**

```powershell
$connectorEnvPath = Join-Path $ProjectDir 'apps\connector\.env'
$connectorProvider = 'chatgpt-web'
if (Test-Path $connectorEnvPath) {
  $envLines = Get-Content $connectorEnvPath
  $providerLine = $envLines | Where-Object { $_ -match '^\s*CONNECTOR_PROVIDER=' } | Select-Object -First 1
  if ($providerLine) {
    $connectorProvider = ($providerLine -split '=', 2)[1].Trim().Trim('"').Trim("'")
  }
}

if ($connectorProvider -eq 'mock' -and $env:ALLOW_MOCK_DESKTOP -ne '1') {
  throw 'Desktop startup CONNECTOR_PROVIDER=mock ile devam etmeyecek. apps/connector/.env dosyasini chatgpt-web olarak duzeltin ya da ALLOW_MOCK_DESKTOP=1 ile test modunu acik secin.'
}
```

- [ ] **Step 3: `.env.example` ve runbook’u yeni desktop-first davranışa göre güncelle**

`.env.example` içindeki önerilen provider `chatgpt-web` olarak kalmalı; runbook içinde de “OpenAI bağlanma deneyimi için `mock` desktop modunda varsayılan olamaz” notu açıkça yazılmalı.

- [ ] **Step 4: Versioned startup script için smoke run yap**

Run: `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\windows\start-dev.ps1`

Expected: `.state\windows-dev\logs\startup.log` içinde connector/api/web için `Hazir:` satırları görülmeli ve `CONNECTOR_PROVIDER=mock` ise script açık hata ile durmalı.

- [ ] **Step 5: Dış masaüstü launcher’ı manuel doğrula**

Manual check: `C:\Users\berke\Desktop\Dropshipping-Baslat.bat`

Expected: batch file yeni versioned `scripts/windows/start-dev.ps1` yolunu kullanarak aynı smoke akışını tetiklemeli.

- [ ] **Step 6: Startup contract değişikliğini commit et**

```bash
git add scripts/windows/start-dev.ps1 scripts/windows/stop-dev.ps1 apps/connector/.env.example docs/runbooks/local-connector.md
git commit -m "chore: version windows desktop startup flow"
```

## Task 3: Web tarafını local connector hedefi ve sade target çözümlemesi ile değiştir

**Files:**
- Delete: `apps/web/src/features/connections/lib/cliProxyApi.ts`
- Delete: `apps/web/src/features/connections/lib/cliProxyApi.test.ts`
- Create: `apps/web/src/features/connections/lib/connectorApi.ts`
- Create: `apps/web/src/features/connections/lib/connectorApi.test.ts`
- Create: `apps/web/src/features/connections/lib/resolveConnectorTarget.ts`
- Create: `apps/web/src/features/connections/lib/resolveConnectorTarget.test.ts`
- Modify: `apps/web/src/features/connections/lib/aiTargetStorage.ts`
- Modify: `apps/web/src/features/connections/lib/aiTargetStorage.test.ts`
- Modify: `apps/web/src/features/connections/hooks/useAIConnections.ts`

- [ ] **Step 1: Hedef çözümleme ve local connector client için failing unit testleri yaz**

```ts
it("uses the desktop localhost connector when no override is saved", () => {
  expect(resolveConnectorTarget({ aiTargetBaseUrl: null }, null)).toEqual({
    baseUrl: "http://127.0.0.1:4317",
    source: "desktop_default",
    isOverride: false,
  });
});
```

```ts
it("prefers the saved settings override over the desktop default", () => {
  expect(
    resolveConnectorTarget(
      { aiTargetBaseUrl: "http://127.0.0.1:5317" },
      { baseUrl: "http://127.0.0.1:5317" },
    ),
  ).toEqual({
    baseUrl: "http://127.0.0.1:5317",
    source: "settings_override",
    isOverride: true,
  });
});
```

```ts
it("maps connector 409 profile reauth responses to a typed error", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify({ error: { code: "PROFILE_NEEDS_REAUTH", message: "Aktif hesap yeniden giriş istiyor." } }), {
      status: 409,
      headers: { "Content-Type": "application/json" },
    }),
  );

  const client = createConnectorApiClient({ baseUrl: "http://127.0.0.1:4317" });
  await expect(client.generateField({ field: "title", prompt: "Return JSON", context: {} })).rejects.toMatchObject({
    code: "PROFILE_NEEDS_REAUTH",
  });
});
```

- [ ] **Step 2: Focused web lib testlerini çalıştır ve kırıldığını doğrula**

Run: `pnpm --filter @trendyol-etsy/web test -- src/features/connections/lib/aiTargetStorage.test.ts src/features/connections/lib/resolveConnectorTarget.test.ts src/features/connections/lib/connectorApi.test.ts`

Expected: FAIL because the repo still contains `cliProxyApi` assumptions (management key/auth-files) and there is no desktop-default connector resolver yet.

- [ ] **Step 3: `cliProxyApi` yerine local connector client ve sade target resolver’ı uygula**

```ts
const DEFAULT_CONNECTOR_BASE_URL = "http://127.0.0.1:4317";

export function resolveConnectorTarget(
  settings: { aiTargetBaseUrl: string | null } | undefined,
  cached: { baseUrl: string } | null,
) {
  const override = settings?.aiTargetBaseUrl?.trim() || cached?.baseUrl?.trim() || "";

  if (override) {
    return {
      baseUrl: override,
      source: "settings_override" as const,
      isOverride: true,
    };
  }

  return {
    baseUrl: DEFAULT_CONNECTOR_BASE_URL,
    source: "desktop_default" as const,
    isOverride: false,
  };
}
```

```ts
export function createConnectorApiClient({ baseUrl, fetchImpl = fetch }: { baseUrl: string; fetchImpl?: typeof fetch }) {
  return {
    async getHealth() {
      return request<ConnectorHealthResponse>(fetchImpl, baseUrl, "/health");
    },
    async startOpenAiConnection() {
      return request<{ attempt: ConnectionAttemptResponse }>(fetchImpl, baseUrl, "/connections/openai/start", {
        method: "POST",
      });
    },
    async getConnectionAttempt(attemptId: string) {
      return request<{ attempt: ConnectionAttemptResponse }>(
        fetchImpl,
        baseUrl,
        `/connections/openai/attempts/${encodeURIComponent(attemptId)}`,
      );
    },
    async reconnectProfile(profileId: string) {
      return request<{ attempt: ConnectionAttemptResponse }>(
        fetchImpl,
        baseUrl,
        `/profiles/${encodeURIComponent(profileId)}/reconnect`,
        { method: "POST" },
      );
    },
    async deleteProfile(profileId: string) {
      await request(fetchImpl, baseUrl, `/profiles/${encodeURIComponent(profileId)}`, { method: "DELETE" });
    },
    async generateField(payload: ConnectorGenerateFieldPayload) {
      return request<{ field: EtsyPrepField; value: string; provider: string }>(fetchImpl, baseUrl, "/generate-field", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
      });
    },
  };
}
```

Also simplify `aiTargetStorage` so it only stores `baseUrl` for the advanced override path; remove `label/managementKey/apiKey` assumptions from `useAIConnections`.

- [ ] **Step 4: Focused web lib testlerini tekrar çalıştır ve geçtiğini doğrula**

Run: `pnpm --filter @trendyol-etsy/web test -- src/features/connections/lib/aiTargetStorage.test.ts src/features/connections/lib/resolveConnectorTarget.test.ts src/features/connections/lib/connectorApi.test.ts`

Expected: PASS with desktop default URL resolution, typed local connector request errors, and storage carrying only the manual override URL.

- [ ] **Step 5: Connector client geçişini commit et**

```bash
git add apps/web/src/features/connections/lib/connectorApi.ts apps/web/src/features/connections/lib/connectorApi.test.ts apps/web/src/features/connections/lib/resolveConnectorTarget.ts apps/web/src/features/connections/lib/resolveConnectorTarget.test.ts apps/web/src/features/connections/lib/aiTargetStorage.ts apps/web/src/features/connections/lib/aiTargetStorage.test.ts apps/web/src/features/connections/hooks/useAIConnections.ts
git rm apps/web/src/features/connections/lib/cliProxyApi.ts apps/web/src/features/connections/lib/cliProxyApi.test.ts
git commit -m "refactor: switch web ai connections to local connector"
```

## Task 4: Connections ekranını dört durumlu sade ürün UI’ına dönüştür

**Files:**
- Modify: `apps/web/src/features/connections/routes/AIConnectionsPage.tsx`
- Modify: `apps/web/src/features/connections/components/ConnectorStatusCard.tsx`
- Modify: `apps/web/src/features/connections/components/AiTargetConfigPanel.tsx`
- Modify: `apps/web/src/features/connections/routes/AIConnectionsPage.test.tsx`

- [ ] **Step 1: Yeni connected/disconnected/connecting/error UI durumları için failing page testlerini yaz**

```ts
it("shows the connected desktop state without exposing technical fields by default", async () => {
  mockConnectorFetches({
    health: {
      status: "online",
      provider: "chatgpt-web",
      activeProfile: {
        id: "profile_main",
        label: "OpenAI Workspace",
        emailMasked: "wo***@company.com",
        provider: "chatgpt-web",
        status: "connected",
        lastValidatedAt: Date.now(),
        lastError: null,
      },
      connectionAttempt: null,
    },
  });

  renderWithProviders(<AIConnectionsPage />);

  expect(await screen.findByText(/openai bağlantısı hazır/i)).toBeInTheDocument();
  expect(screen.getByText(/wo\*\*\*@company.com/i)).toBeInTheDocument();
  expect(screen.queryByLabelText(/hedef url/i)).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: /bağlantıyı kaldır/i })).toBeInTheDocument();
});
```

```ts
it("keeps advanced settings collapsed until the user opens them", async () => {
  mockConnectorFetches({
    healthError: new Error("connect ECONNREFUSED 127.0.0.1:4317"),
  });

  renderWithProviders(<AIConnectionsPage />);

  expect(await screen.findByText(/yerel bağlantı servisi hazır değil/i)).toBeInTheDocument();
  expect(screen.queryByLabelText(/bağlantı servisi url/i)).not.toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: /gelişmiş ayarlar/i }));
  expect(screen.getByLabelText(/bağlantı servisi url/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Connections page testlerini çalıştır ve önce kırıldığını doğrula**

Run: `pnpm --filter @trendyol-etsy/web test -- src/features/connections/routes/AIConnectionsPage.test.tsx`

Expected: FAIL because the page still renders target URL/key inputs by default and still expects auth-file / multi-account actions.

- [ ] **Step 3: Hook ve bileşenleri yeni ürün modeline göre güncelle**

`useAIConnections()` dönüşü şu tipte sadeleşmeli:

```ts
type ConnectionViewState =
  | {
      kind: "ready_connected";
      profileId: string;
      label: string;
      emailMasked: string | null;
      providerStatus: "connected" | "needs_reauth";
    }
  | {
      kind: "ready_disconnected";
      message: string;
    }
  | {
      kind: "connecting";
      attemptId: string;
      message: string;
    }
  | {
      kind: "error";
      message: string;
      source: "desktop_default" | "settings_override";
    };
```

`AiTargetConfigPanel` defaultta yalnızca bir disclosure olmalı:

```tsx
<details>
  <summary>Gelişmiş Ayarlar</summary>
  <label>
    Bağlantı Servisi URL
    <input type="url" value={baseUrl} onChange={...} />
  </label>
  <button type="submit">Kaydet</button>
</details>
```

`ConnectorStatusCard` içinde `Aktif Yap` gibi çoklu hesap dili kaldırılmalı; yalnızca `OpenAI ile Bağlan`, `Yeniden Bağlan`, `Bağlantıyı Kaldır`, `Tekrar Dene` aksiyonları duruma göre görünmeli.

- [ ] **Step 4: Connections page testlerini tekrar çalıştır ve geçtiğini doğrula**

Run: `pnpm --filter @trendyol-etsy/web test -- src/features/connections/routes/AIConnectionsPage.test.tsx`

Expected: PASS with hidden advanced settings, single-account copy, and four-state rendering.

- [ ] **Step 5: UI sadeleştirmesini commit et**

```bash
git add apps/web/src/features/connections/routes/AIConnectionsPage.tsx apps/web/src/features/connections/components/ConnectorStatusCard.tsx apps/web/src/features/connections/components/AiTargetConfigPanel.tsx apps/web/src/features/connections/routes/AIConnectionsPage.test.tsx apps/web/src/features/connections/hooks/useAIConnections.ts
git commit -m "feat: simplify ai connections desktop ui"
```

## Task 5: Etsy Prep’i aynı connector hedefi ve bağlantı durum dili ile hizala

**Files:**
- Modify: `apps/web/src/features/etsyPrep/hooks/useEtsyPrepWorkspace.ts`
- Modify: `apps/web/src/features/etsyPrep/components/PrepModeHeader.tsx`
- Modify: `apps/web/src/features/etsyPrep/components/EtsyPrepWorkspace.test.tsx`
- Modify: `apps/web/src/features/product/routes/ProductDetailPage.test.tsx`
- Modify: `apps/web/tests/e2e/product-detail-etsy-prep.spec.ts`

- [ ] **Step 1: Yeni connector-based gating ve generate-field path’i için failing testleri yaz**

```ts
it("blocks field generation with a product-language message when no active connector profile exists", async () => {
  mockConnectorFetches({
    health: {
      status: "online",
      provider: "chatgpt-web",
      activeProfile: null,
      connectionAttempt: null,
    },
  });

  renderWithProviders(<EtsyPrepWorkspace productId="prod_1" />);

  expect(await screen.findByText(/openai bağlantısı gerekli/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /openai ile bağlan/i })).toBeDisabled();
});
```

```ts
it("uses the local connector generate-field endpoint once the desktop connection is healthy", async () => {
  mockConnectorFetches({
    health: {
      status: "online",
      provider: "chatgpt-web",
      activeProfile: {
        id: "profile_main",
        label: "OpenAI Workspace",
        emailMasked: "wo***@company.com",
        provider: "chatgpt-web",
        status: "connected",
        lastValidatedAt: Date.now(),
        lastError: null,
      },
      connectionAttempt: null,
    },
    generateField: {
      field: "title",
      value: "Minimalist Wall Decor",
      provider: "chatgpt-web",
    },
  });

  renderWithProviders(<EtsyPrepWorkspace productId="prod_1" />);
  await user.click(await screen.findByRole("button", { name: /title üret/i }));

  expect(await screen.findByDisplayValue(/Minimalist Wall Decor/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Focused Etsy prep testlerini çalıştır ve kırıldığını doğrula**

Run: `pnpm --filter @trendyol-etsy/web test -- src/features/etsyPrep/components/EtsyPrepWorkspace.test.tsx src/features/product/routes/ProductDetailPage.test.tsx`

Expected: FAIL because `useEtsyPrepWorkspace` still expects CLIProxy management/auth-files and direct inference API key semantics.

- [ ] **Step 3: Shared connector target resolution ve direct `/generate-field` kullanımını uygula**

`useEtsyPrepWorkspace.ts` içinde current `CliProxyRequestError/createCliProxyApiClient` yolunu şu çizgiye çevir:

```ts
const target = resolveConnectorTarget(settingsQuery.data, cachedTarget);
const connectorClient = createConnectorApiClient({ baseUrl: target.baseUrl });
const connectorHealthQuery = useQuery({
  queryKey: ["connector-health", target.baseUrl],
  queryFn: () => connectorClient.getHealth(),
  retry: false,
});
```

Field generation için:

```ts
const generated = await connectorClient.generateField({
  field,
  prompt: event.prompt,
  context: event.context,
});
```

Error mapping kullanıcıya şu dille yansıtılmalı:
- `OpenAI bağlantısı gerekli`
- `Bağlantı yeniden doğrulanmalı`
- `Yerel bağlantı servisi hazır değil`

- [ ] **Step 4: Focused Etsy prep testlerini tekrar çalıştır ve geçtiğini doğrula**

Run: `pnpm --filter @trendyol-etsy/web test -- src/features/etsyPrep/components/EtsyPrepWorkspace.test.tsx src/features/product/routes/ProductDetailPage.test.tsx`

Expected: PASS with connector-health gating and direct connector field generation.

- [ ] **Step 5: Web e2e regresyonunu çalıştır**

Run: `pnpm --filter @trendyol-etsy/web test:e2e -- product-detail-etsy-prep.spec.ts`

Expected: PASS with the desktop connection path reflected in the product detail / Etsy Prep flow.

- [ ] **Step 6: Etsy Prep connector geçişini commit et**

```bash
git add apps/web/src/features/etsyPrep/hooks/useEtsyPrepWorkspace.ts apps/web/src/features/etsyPrep/components/PrepModeHeader.tsx apps/web/src/features/etsyPrep/components/EtsyPrepWorkspace.test.tsx apps/web/src/features/product/routes/ProductDetailPage.test.tsx apps/web/tests/e2e/product-detail-etsy-prep.spec.ts
git commit -m "feat: route etsy prep ai actions through desktop connector"
```

## Task 6: Dokümantasyon ve tam regresyon sweep’i tamamla

**Files:**
- Modify: `docs/runbooks/local-connector.md`

- [ ] **Step 1: Runbook’u gerçek masaüstü kullanım diline göre son kez düzenle**

Runbook içinde açıkça yaz:
- normal akışta kullanıcı yalnızca `C:\Users\berke\Desktop\Dropshipping-Baslat.bat` çalıştırır
- `AI Bağlantıları` varsayılan olarak teknik alan göstermez
- `Gelişmiş Ayarlar` yalnızca override/debug içindir
- `Bağlantıyı Kaldır` local session storage’ı temizler
- `CONNECTOR_PROVIDER=mock` desktop modunda açık seçilmedikçe kullanılmaz

- [ ] **Step 2: Hedeflenmiş tüm test paketlerini arka arkaya çalıştır**

Run: `pnpm --filter @trendyol-etsy/connector test -- tests/unit/chatGptWebProvider.test.ts tests/integration/server.test.ts && pnpm --filter @trendyol-etsy/web test -- src/features/connections/routes/AIConnectionsPage.test.tsx src/features/etsyPrep/components/EtsyPrepWorkspace.test.tsx src/features/product/routes/ProductDetailPage.test.tsx`

Expected: PASS across connector health, connections UI, and Etsy Prep gating.

- [ ] **Step 3: Masaüstü smoke check yap**

Manual run:
1. `C:\Users\berke\Desktop\Dropshipping-Baslat.bat`
2. `AI Bağlantıları` sayfasını aç
3. Geçerli oturum varsa `OpenAI bağlantısı hazır` durumunu gör
4. `Bağlantıyı Kaldır` ile temizlenmiş disconnected state’e dön
5. `OpenAI ile Bağlan` ile yeniden giriş başlat
6. `Etsy'e Yükle` içinde `Title Üret` çalıştır

Expected: Oturum kalıcılığı, kaldırma temizliği ve yeniden bağlanma akışı ürün diliyle tutarlı çalışır.

- [ ] **Step 4: Final docs/regression değişikliklerini commit et**

```bash
git add docs/runbooks/local-connector.md
git commit -m "docs: finalize desktop ai connections runbook"
```

