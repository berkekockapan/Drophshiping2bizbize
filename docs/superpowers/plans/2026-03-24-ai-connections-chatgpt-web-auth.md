# AI Connections ChatGPT Web Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `AI Bağlantıları` ekranından gerçek ChatGPT web hesabı bağlamayı, çoklu hesap ve kalıcı oturum yönetimini, ayrıca `Etsy'e Yükle` alan üretimlerinin aktif bağlı hesap üzerinden gerçekten çalışmasını sağlamak.

**Architecture:** Connector tarafında profil durumu + bağlantı denemesi katmanı eklenir, Playwright oturumları profil bazlı kalıcı storage ile yönetilir ve yeni start/poll/reconnect/delete endpointleri açılır. API tarafı bu profil durumunun snapshot'ını D1 içinde saklayıp ürün bootstrap'ına taşır; web tarafı da typed connector istemcisi, bağlantı polling akışı ve Etsy prep bloklama/yeniden bağlan davranışlarıyla bunu ürünleştirir.

**Tech Stack:** TypeScript, Fastify, Playwright, Hono, D1/SQLite, React, TanStack Query, Tailwind CSS, Vitest

---

## Implementation Notes

- Source spec: `docs/superpowers/specs/2026-03-24-ai-connections-chatgpt-web-auth-design.md`
- `apps/api` ChatGPT web oturumunu asla doğrudan kullanmamalı; runtime bağlantı ve üretim çağrıları yalnızca `apps/web -> apps/connector` hattında kalmalı.
- Yeni migration numarası `0004_ai_profile_connection_state.sql` olmalı; mevcut sıra `0000`-`0003` dolu.
- `CONNECTOR_STATE_DIR` hem profil metadata'sının hem de profile özel browser storage klasörlerinin kökü olmaya devam etmeli.
- `mock` provider bozulmamalı; web ve API testleri gerçek browser login olmadan çalışmaya devam etmeli.
- Connector hata kodları structured response olarak dönmeli; yalnızca düz string hata metnine güvenmeyin.
- Because explicit subagent delegation was not requested, do a local plan review instead of the skill's reviewer subagent loop.

## File Structure

### API snapshot and bootstrap surface
- Create: `apps/api/drizzle/0004_ai_profile_connection_state.sql` - `ai_profiles` tablosuna durum ve doğrulama kolonları ekle.
- Modify: `apps/api/src/db/schema.ts` - yeni `ai_profiles` kolonlarını Drizzle schema'ya kaydet.
- Modify: `apps/api/src/modules/ai/syncProfileMetadata.ts` - connector'dan gelen zengin profil metadata'sını doğrula, yaz ve oku.
- Modify: `apps/api/src/routes/aiProfiles.ts` - genişletilmiş sync payload validation.
- Modify: `apps/api/src/modules/etsyPrep/buildEtsyPrepView.ts` - bootstrap snapshot'a connector profil durumu ekle.
- Create: `apps/api/tests/integration/aiProfiles.test.ts` - sync/list davranışını doğrula.
- Modify: `apps/api/tests/integration/schema.test.ts` - yeni kolonların migration ile geldiğini doğrula.
- Modify: `apps/api/tests/integration/etsyPrep.test.ts` - bootstrap response'unda yeni connector snapshot alanlarını doğrula.

### Connector persistence, auth orchestration, and routes
- Modify: `apps/connector/src/store/profileStore.ts` - profil durum, zaman damgası, silme ve güncelleme davranışlarını destekle.
- Create: `apps/connector/src/store/connectionAttemptStore.ts` - bağlantı denemesi oluşturma, güncelleme ve okuma.
- Modify: `apps/connector/src/browser/browserSession.ts` - profile özel persistent browser context yönetimi.
- Modify: `apps/connector/src/providers/base.ts` - yeni profil/health/attempt/generation contract tipleri.
- Modify: `apps/connector/src/providers/chatgptWebProvider.ts` - start/poll/reconnect/delete, session verify ve structured generation hata kodları.
- Modify: `apps/connector/src/providers/mockProvider.ts` - yeni contract'ı mock davranışla destekle.
- Create: `apps/connector/src/routes/connections.ts` - `start` / `attempts/:id` / `cancel` endpointleri.
- Modify: `apps/connector/src/routes/profiles.ts` - `reconnect` ve `delete` endpointleri, zengin profile response.
- Modify: `apps/connector/src/routes/health.ts` - aktif profil durumu ve son doğrulama alanları.
- Modify: `apps/connector/src/server.ts` - yeni route/store bağımlılıklarını bağla.
- Create: `apps/connector/tests/unit/connectionAttemptStore.test.ts`
- Modify: `apps/connector/tests/unit/profileStore.test.ts`
- Create: `apps/connector/tests/unit/chatGptWebProvider.test.ts`
- Modify: `apps/connector/tests/integration/server.test.ts`

### Web connector client and AI Connections UI
- Modify: `apps/web/src/app/api.ts` - typed connector DTO'ları, typed connector errors, yeni start/poll/reconnect/delete çağrıları.
- Create: `apps/web/src/features/connections/hooks/useAIConnections.ts` - polling, mutation orchestration, metadata sync.
- Modify: `apps/web/src/features/connections/routes/AIConnectionsPage.tsx` - yeni hook ile bağlantı akışını kur.
- Modify: `apps/web/src/features/connections/components/ConnectorStatusCard.tsx` - boş durum, bekleme durumu, çoklu hesap listesi, reconnect/delete CTA'ları.
- Modify: `apps/web/src/features/connections/routes/AIConnectionsPage.test.tsx` - bağlantı başlatma, poll, aktivasyon ve yeniden bağlan testleri.

### Etsy prep gating and operator docs
- Modify: `apps/web/src/features/etsyPrep/hooks/useEtsyPrepWorkspace.ts` - typed connector durumları ve structured error code eşlemesi.
- Modify: `apps/web/src/features/etsyPrep/components/PrepModeHeader.tsx` - aktif hesap ve bloklama nedenini yeni duruma göre göster.
- Modify: `apps/web/src/features/etsyPrep/components/EtsyPrepWorkspace.test.tsx` - `needs_reauth`, `login_in_progress`, `connected` senaryoları.
- Modify: `apps/web/src/features/product/routes/ProductDetailPage.test.tsx` - genişleyen bootstrap connector snapshot tipine uyum.
- Modify: `docs/runbooks/local-connector.md` - gerçek OpenAI / ChatGPT web bağlantı akışını belgeleyin.

## Task 1: Persist richer connector profile state in the API and Etsy prep bootstrap

**Files:**
- Create: `apps/api/drizzle/0004_ai_profile_connection_state.sql`
- Modify: `apps/api/src/db/schema.ts`
- Modify: `apps/api/src/modules/ai/syncProfileMetadata.ts`
- Modify: `apps/api/src/routes/aiProfiles.ts`
- Modify: `apps/api/src/modules/etsyPrep/buildEtsyPrepView.ts`
- Create: `apps/api/tests/integration/aiProfiles.test.ts`
- Modify: `apps/api/tests/integration/schema.test.ts`
- Modify: `apps/api/tests/integration/etsyPrep.test.ts`

- [ ] **Step 1: Write failing schema + sync integration assertions**

```ts
const aiProfileColumns = database.prepare("pragma table_info(ai_profiles)").all() as Array<{ name: string }>;

expect(aiProfileColumns).toEqual(
  expect.arrayContaining([
    expect.objectContaining({ name: "status" }),
    expect.objectContaining({ name: "last_validated_at" }),
    expect.objectContaining({ name: "last_error" }),
    expect.objectContaining({ name: "updated_at" }),
  ]),
);
```

```ts
const syncResponse = await app.request(
  "http://localhost/ai-profiles/sync",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      connectorStatus: { status: "online", provider: "chatgpt-web" },
      profiles: [
        {
          id: "profile_main",
          label: "ChatGPT Workspace",
          emailMasked: "wo***@company.com",
          provider: "chatgpt-web",
          isActive: true,
          status: "needs_reauth",
          lastValidatedAt: Date.parse("2026-03-24T10:00:00.000Z"),
          lastError: "Session expired",
        },
      ],
    }),
  },
  env,
);

expect((await syncResponse.json()).items[0]).toEqual(
  expect.objectContaining({
    id: "profile_main",
    status: "needs_reauth",
    lastError: "Session expired",
  }),
);
```

- [ ] **Step 2: Run the focused API tests to verify they fail first**

Run: `pnpm --filter @trendyol-etsy/api test -- tests/integration/schema.test.ts tests/integration/aiProfiles.test.ts tests/integration/etsyPrep.test.ts`
Expected: FAIL because `ai_profiles` does not yet have the new columns and `/ai-profiles/sync` does not accept or return the richer payload.

- [ ] **Step 3: Add the migration and schema fields**

```sql
ALTER TABLE "ai_profiles" ADD COLUMN "status" text NOT NULL DEFAULT 'connected';
ALTER TABLE "ai_profiles" ADD COLUMN "last_validated_at" integer;
ALTER TABLE "ai_profiles" ADD COLUMN "last_error" text;
ALTER TABLE "ai_profiles" ADD COLUMN "updated_at" integer NOT NULL DEFAULT (unixepoch() * 1000);
```

```ts
export const aiProfiles = sqliteTable("ai_profiles", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  emailMasked: text("email_masked"),
  provider: text("provider").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(false),
  status: text("status").notNull().default("connected"),
  lastSeenAt: integer("last_seen_at", { mode: "timestamp_ms" }),
  lastValidatedAt: integer("last_validated_at", { mode: "timestamp_ms" }),
  lastError: text("last_error"),
  connectorStatusSnapshot: text("connector_status_snapshot"),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});
```

- [ ] **Step 4: Extend sync validation and Etsy prep bootstrap**

```ts
export interface SyncProfileInput {
  connectorStatus: { status: string; provider: string };
  profiles: Array<{
    id: string;
    label: string;
    emailMasked: string | null;
    provider: string;
    isActive: boolean;
    status: "connected" | "needs_reauth" | "disconnected" | "error";
    lastValidatedAt: number | null;
    lastError: string | null;
  }>;
}
```

```ts
export interface EtsyPrepConnectorProfileSnapshot {
  id: string;
  label: string;
  status: string;
  lastValidatedAt: number | null;
}
```

- [ ] **Step 5: Re-run the focused API tests**

Run: `pnpm --filter @trendyol-etsy/api test -- tests/integration/schema.test.ts tests/integration/aiProfiles.test.ts tests/integration/etsyPrep.test.ts`
Expected: PASS with the richer `ai_profiles` schema, sync payload, and Etsy prep bootstrap snapshot.

- [ ] **Step 6: Commit the API snapshot groundwork**

```bash
git add apps/api/drizzle/0004_ai_profile_connection_state.sql apps/api/src/db/schema.ts apps/api/src/modules/ai/syncProfileMetadata.ts apps/api/src/routes/aiProfiles.ts apps/api/src/modules/etsyPrep/buildEtsyPrepView.ts apps/api/tests/integration/aiProfiles.test.ts apps/api/tests/integration/schema.test.ts apps/api/tests/integration/etsyPrep.test.ts
git commit -m "feat: persist connector profile status metadata"
```

## Task 2: Extend connector storage primitives for profile status and connection attempts

**Files:**
- Modify: `apps/connector/src/store/profileStore.ts`
- Create: `apps/connector/src/store/connectionAttemptStore.ts`
- Modify: `apps/connector/src/providers/base.ts`
- Modify: `apps/connector/src/providers/mockProvider.ts`
- Modify: `apps/connector/tests/unit/profileStore.test.ts`
- Create: `apps/connector/tests/unit/connectionAttemptStore.test.ts`

- [ ] **Step 1: Write failing unit tests for richer profile persistence and attempt state**

```ts
await store.saveProfile({
  id: "primary",
  label: "Primary",
  emailMasked: "wo***@company.com",
  provider: "chatgpt-web",
  status: "needs_reauth",
  lastValidatedAt: 1711274400000,
  lastError: "Session expired",
  sessionSecret: "super-secret",
});

expect(await store.getActiveProfile()).toEqual(
  expect.objectContaining({
    id: "primary",
    status: "needs_reauth",
    lastError: "Session expired",
  }),
);
```

```ts
const attempts = createConnectionAttemptStore(dir);
const created = await attempts.create({ provider: "openai" });

expect(created.status).toBe("pending_browser_launch");

await attempts.update(created.id, {
  status: "completed",
  profileId: "profile_main",
});

expect(await attempts.get(created.id)).toEqual(
  expect.objectContaining({ status: "completed", profileId: "profile_main" }),
);
```

- [ ] **Step 2: Run the focused connector unit tests and confirm failure**

Run: `pnpm --filter @trendyol-etsy/connector test -- tests/unit/profileStore.test.ts tests/unit/connectionAttemptStore.test.ts`
Expected: FAIL because `ProfileStore` and the new attempt store do not support the richer state yet.

- [ ] **Step 3: Expand the store contracts and on-disk shape**

```ts
export interface ConnectorProfile {
  id: string;
  label: string;
  emailMasked: string | null;
  provider: ProviderId;
  status: "connected" | "needs_reauth" | "disconnected" | "error";
  lastValidatedAt: number | null;
  lastError: string | null;
}
```

```ts
export interface ProfileStore {
  saveProfile(input: SaveProfileInput): Promise<ConnectorProfile>;
  listProfiles(): Promise<ConnectorProfile[]>;
  getActiveProfile(): Promise<ConnectorProfile | null>;
  setActiveProfile(profileId: string): Promise<ConnectorProfile>;
  updateProfile(profileId: string, patch: Partial<ConnectorProfile>): Promise<ConnectorProfile>;
  deleteProfile(profileId: string): Promise<void>;
  getProfileSecret(profileId: string): Promise<string | null>;
}
```

- [ ] **Step 4: Add the attempt store and align provider base/mock contracts**

```ts
export interface ConnectionAttempt {
  id: string;
  provider: "openai";
  status:
    | "pending_browser_launch"
    | "waiting_for_login"
    | "verifying_session"
    | "completed"
    | "failed"
    | "cancelled";
  profileId: string | null;
  error: string | null;
  createdAt: number;
  updatedAt: number;
}
```

```ts
export interface AIProvider {
  readonly id: string;
  listProfiles(): Promise<ConnectorProfile[]>;
  getActiveProfile(): Promise<ConnectorProfile | null>;
  getHealth(): Promise<ConnectorHealth>;
  startConnection(provider: "openai"): Promise<ConnectionAttempt>;
  getConnectionAttempt(attemptId: string): Promise<ConnectionAttempt | null>;
  reconnectProfile(profileId: string): Promise<ConnectionAttempt>;
  deleteProfile(profileId: string): Promise<void>;
  activateProfile(profileId: string): Promise<ConnectorProfile>;
  generateField(request: GenerateFieldRequest): Promise<GenerateFieldResponse>;
}
```

- [ ] **Step 5: Re-run the focused connector unit tests**

Run: `pnpm --filter @trendyol-etsy/connector test -- tests/unit/profileStore.test.ts tests/unit/connectionAttemptStore.test.ts`
Expected: PASS with the new persisted profile metadata and attempt lifecycle storage.

- [ ] **Step 6: Commit the connector state primitives**

```bash
git add apps/connector/src/store/profileStore.ts apps/connector/src/store/connectionAttemptStore.ts apps/connector/src/providers/base.ts apps/connector/src/providers/mockProvider.ts apps/connector/tests/unit/profileStore.test.ts apps/connector/tests/unit/connectionAttemptStore.test.ts
git commit -m "feat: add connector profile and attempt state"
```

## Task 3: Implement ChatGPT web auth orchestration and connector routes

**Files:**
- Modify: `apps/connector/src/browser/browserSession.ts`
- Modify: `apps/connector/src/providers/chatgptWebProvider.ts`
- Create: `apps/connector/src/routes/connections.ts`
- Modify: `apps/connector/src/routes/profiles.ts`
- Modify: `apps/connector/src/routes/health.ts`
- Modify: `apps/connector/src/server.ts`
- Create: `apps/connector/tests/unit/chatGptWebProvider.test.ts`
- Modify: `apps/connector/tests/integration/server.test.ts`

- [ ] **Step 1: Write failing provider/server tests for start, poll, reconnect, delete, and structured health**

```ts
const start = await context.server.inject({
  method: "POST",
  url: "/connections/openai/start",
});

expect(start.statusCode).toBe(202);
expect(start.json().attempt).toEqual(
  expect.objectContaining({
    status: "waiting_for_login",
  }),
);
```

```ts
const health = await context.server.inject({ method: "GET", url: "/health" });
expect(health.json()).toEqual(
  expect.objectContaining({
    status: "online",
    provider: "chatgpt-web",
    activeProfile: expect.objectContaining({
      status: "connected",
    }),
  }),
);
```

```ts
const reconnect = await context.server.inject({
  method: "POST",
  url: "/profiles/profile_main/reconnect",
});
expect(reconnect.statusCode).toBe(202);
```

- [ ] **Step 2: Run the focused connector tests and confirm they fail**

Run: `pnpm --filter @trendyol-etsy/connector test -- tests/unit/chatGptWebProvider.test.ts tests/integration/server.test.ts`
Expected: FAIL because the auth attempt routes, persistent browser orchestration, and richer health/profile responses do not exist yet.

- [ ] **Step 3: Make the browser session profile-aware and persistent**

```ts
async ensureProfilePage(profileId: string) {
  const profileDir = resolve(this.stateDir, "profiles", profileId);
  const context = await chromium.launchPersistentContext(profileDir, {
    headless: this.options.headless ?? false,
  });

  const page = context.pages()[0] ?? (await context.newPage());
  return { context, page };
}
```

- [ ] **Step 4: Implement provider auth flow, structured errors, and new routes**

```ts
server.post("/connections/openai/start", async (_request, reply) => {
  const attempt = await deps.provider.startConnection("openai");
  return reply.code(202).send({ attempt });
});
```

```ts
if (activeProfile.status === "needs_reauth") {
  throw new ConnectorProviderError("PROFILE_NEEDS_REAUTH", "Aktif hesap yeniden giriş istiyor.");
}
```

```ts
server.delete<{ Params: { id: string } }>("/profiles/:id", async (request, reply) => {
  await deps.provider.deleteProfile(request.params.id);
  return reply.code(204).send();
});
```

- [ ] **Step 5: Re-run the focused connector tests**

Run: `pnpm --filter @trendyol-etsy/connector test -- tests/unit/chatGptWebProvider.test.ts tests/integration/server.test.ts`
Expected: PASS with working start/poll/reconnect/delete flows, richer `/health`, and structured generation errors.

- [ ] **Step 6: Commit the connector auth routes**

```bash
git add apps/connector/src/browser/browserSession.ts apps/connector/src/providers/chatgptWebProvider.ts apps/connector/src/routes/connections.ts apps/connector/src/routes/profiles.ts apps/connector/src/routes/health.ts apps/connector/src/server.ts apps/connector/tests/unit/chatGptWebProvider.test.ts apps/connector/tests/integration/server.test.ts
git commit -m "feat: add chatgpt web auth connection routes"
```

## Task 4: Build the typed connector client and AI Connections page orchestration

**Files:**
- Modify: `apps/web/src/app/api.ts`
- Create: `apps/web/src/features/connections/hooks/useAIConnections.ts`
- Modify: `apps/web/src/features/connections/routes/AIConnectionsPage.tsx`
- Modify: `apps/web/src/features/connections/components/ConnectorStatusCard.tsx`
- Modify: `apps/web/src/features/connections/routes/AIConnectionsPage.test.tsx`

- [ ] **Step 1: Write a failing AI Connections page test for start -> waiting -> connected and account actions**

```ts
await user.click(await screen.findByRole("button", { name: /openai ile bağlan/i }));

expect(await screen.findByText(/tarayıcıda giriş bekleniyor/i)).toBeInTheDocument();
expect(await screen.findByRole("button", { name: /yeniden bağlan/i })).toBeInTheDocument();
expect(await screen.findByRole("button", { name: /bağlantıyı kaldır/i })).toBeInTheDocument();
```

- [ ] **Step 2: Run the focused web test and verify it fails**

Run: `pnpm --filter @trendyol-etsy/web test -- src/features/connections/routes/AIConnectionsPage.test.tsx`
Expected: FAIL because the page cannot start a connection, poll attempts, or render reconnect/delete controls yet.

- [ ] **Step 3: Add typed connector DTOs, connector error parsing, and route helpers**

```ts
export class ConnectorRequestError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}
```

```ts
export async function startOpenAiConnection() {
  const response = await fetchWithTimeout(`${connectorBaseUrl}/connections/openai/start`, {
    method: "POST",
  });

  return parseJson<{ attempt: ConnectionAttemptResponse }>(response);
}
```

- [ ] **Step 4: Implement the polling hook and richer card UI**

```ts
const attemptQuery = useQuery({
  queryKey: ["connector-attempt", activeAttemptId],
  enabled: Boolean(activeAttemptId),
  queryFn: () => fetchConnectionAttempt(activeAttemptId as string),
  refetchInterval: (query) =>
    query.state.data?.attempt.status === "completed" || query.state.data?.attempt.status === "failed" ? false : 1_000,
});
```

```tsx
{attempt?.status === "waiting_for_login" ? (
  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
    Tarayıcıda giriş bekleniyor.
  </div>
) : null}
```

- [ ] **Step 5: Re-run the focused web test**

Run: `pnpm --filter @trendyol-etsy/web test -- src/features/connections/routes/AIConnectionsPage.test.tsx`
Expected: PASS with connection start polling, profile list rendering, activation, reconnect, delete, and metadata sync.

- [ ] **Step 6: Commit the web connection UX**

```bash
git add apps/web/src/app/api.ts apps/web/src/features/connections/hooks/useAIConnections.ts apps/web/src/features/connections/routes/AIConnectionsPage.tsx apps/web/src/features/connections/components/ConnectorStatusCard.tsx apps/web/src/features/connections/routes/AIConnectionsPage.test.tsx
git commit -m "feat: add ai connection polling and account controls"
```

## Task 5: Gate Etsy prep generation with connector status and structured errors

**Files:**
- Modify: `apps/web/src/app/api.ts`
- Modify: `apps/web/src/features/etsyPrep/hooks/useEtsyPrepWorkspace.ts`
- Modify: `apps/web/src/features/etsyPrep/components/PrepModeHeader.tsx`
- Modify: `apps/web/src/features/etsyPrep/components/EtsyPrepWorkspace.test.tsx`
- Modify: `apps/web/src/features/product/routes/ProductDetailPage.test.tsx`

- [ ] **Step 1: Write failing prep tests for `needs_reauth`, login-in-progress, and healthy generation**

```ts
expect(await screen.findByText(/yeniden bağlan/i)).toBeInTheDocument();
expect(screen.getByRole("button", { name: /title üret/i })).toBeDisabled();
```

```ts
expect(await screen.findByText(/giriş tamamlanana kadar bekleniyor/i)).toBeInTheDocument();
```

- [ ] **Step 2: Run the focused prep tests and verify failure**

Run: `pnpm --filter @trendyol-etsy/web test -- src/features/etsyPrep/components/EtsyPrepWorkspace.test.tsx src/features/product/routes/ProductDetailPage.test.tsx`
Expected: FAIL because the prep workspace only knows “aktif profil var/yok” and cannot distinguish reconnect or login-in-progress states yet.

- [ ] **Step 3: Thread the richer snapshot and health types through the prep UI**

```ts
const canGenerate =
  Boolean(connectorProfileSnapshot) &&
  connectorHealth?.activeProfile?.status === "connected";
```

```ts
const generationBlockedReason =
  connectorHealth?.activeProfile?.status === "needs_reauth"
    ? "Aktif hesap yeniden bağlanmalı."
    : connectorHealth?.connectionAttempt?.status === "waiting_for_login"
      ? "Giriş tamamlanana kadar bekleniyor."
      : null;
```

- [ ] **Step 4: Map structured connector errors to field-level helper text**

```ts
if (error instanceof ConnectorRequestError && error.code === "PROFILE_NEEDS_REAUTH") {
  return "Aktif hesap yeniden giriş istiyor. AI Bağlantıları sayfasından yeniden bağlanın.";
}
```

- [ ] **Step 5: Re-run the focused prep tests**

Run: `pnpm --filter @trendyol-etsy/web test -- src/features/etsyPrep/components/EtsyPrepWorkspace.test.tsx src/features/product/routes/ProductDetailPage.test.tsx`
Expected: PASS with targeted reconnect/login guidance while healthy generation still succeeds.

- [ ] **Step 6: Commit the Etsy prep gating changes**

```bash
git add apps/web/src/app/api.ts apps/web/src/features/etsyPrep/hooks/useEtsyPrepWorkspace.ts apps/web/src/features/etsyPrep/components/PrepModeHeader.tsx apps/web/src/features/etsyPrep/components/EtsyPrepWorkspace.test.tsx apps/web/src/features/product/routes/ProductDetailPage.test.tsx
git commit -m "feat: gate etsy prep generation on connector status"
```

## Task 6: Update the operator runbook and run the targeted regression suite

**Files:**
- Modify: `docs/runbooks/local-connector.md`

- [ ] **Step 1: Update the runbook for the new OpenAI web connection flow**

```md
1. `CONNECTOR_PROVIDER=chatgpt-web` ile connector'ı başlatın.
2. Uygulamada `AI Bağlantıları > OpenAI ile Bağlan` aksiyonunu kullanın.
3. Açılan tarayıcıda ChatGPT girişini tamamlayın.
4. Hesap `Bağlı` görünmüyorsa `Yeniden Bağlan` aksiyonunu deneyin.
5. Oturum verileri `CONNECTOR_STATE_DIR/profiles/<profile-id>/` altında tutulur.
```

- [ ] **Step 2: Run the targeted regression suite**

Run: `pnpm --filter @trendyol-etsy/connector test -- tests/unit/profileStore.test.ts tests/unit/connectionAttemptStore.test.ts tests/unit/chatGptWebProvider.test.ts tests/integration/server.test.ts`
Expected: PASS

Run: `pnpm --filter @trendyol-etsy/api test -- tests/integration/schema.test.ts tests/integration/aiProfiles.test.ts tests/integration/etsyPrep.test.ts`
Expected: PASS

Run: `pnpm --filter @trendyol-etsy/web test -- src/features/connections/routes/AIConnectionsPage.test.tsx src/features/etsyPrep/components/EtsyPrepWorkspace.test.tsx src/features/product/routes/ProductDetailPage.test.tsx`
Expected: PASS

- [ ] **Step 3: Do one manual smoke check in dev mode**

Run: `pnpm dev:connector`
Expected: Connector starts on `http://127.0.0.1:4317` with `chatgpt-web` or `mock` provider, and `/health` responds without crashing.

- [ ] **Step 4: Commit the docs and verification pass**

```bash
git add docs/runbooks/local-connector.md
git commit -m "docs: update local connector auth runbook"
```
