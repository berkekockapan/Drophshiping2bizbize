# Shared AI Provider Configs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `AI Baglantilari` ekranini OpenAI/OpenRouter/Google icin API-key tabanli ortak provider registry'ye donusturmek, ayni anda tek aktif provider secmek ve tum draft/field generation akislarini aktif provider uzerinden calistirmak.

**Architecture:** D1 icinde `ai_provider_configs` tablosu ve sifreli secret saklama katmani kurulacak; backend aktif provider'i cozup provider-adapter arayuzu uzerinden generation yapacak. Web tarafinda `AI Baglantilari` sayfasi provider kartlari, yardim popup'lari ve aktif-provider secimi sunacak; draft ve Etsy prep akislari yerel OAuth/connector yerine bu ortak API-key registry'yi kullanacak.

**Tech Stack:** TypeScript, Hono, Cloudflare Workers/D1, Web Crypto API, React, TanStack Query, Tailwind CSS, Vitest

---

## Implementation Notes

- Source spec: `docs/superpowers/specs/2026-03-27-owner-scoped-products-shared-ai-providers-design.md`
- Bu spec iki bagimsiz alt sistem iceriyor; bu plan sadece `AI Baglantilari` ve aktif provider generation akislarini kapsar. Owner-scoped products icin ayri plan: `docs/superpowers/plans/2026-03-27-owner-scoped-products.md`
- `app_settings` icindeki `aiTarget*` alanlari kaldirilacak; artik baglanti servisi override modeli olmayacak. Bu sayede ayni anda hem desktop connector hem API-key registry kullanan belirsiz akisi ortadan kaldiriyoruz.
- `ai_profiles` ve `ai_openai_*` tablolarini bu iterasyonda fiziksel olarak silme; ancak `/ai-profiles` route mount'unu kaldirip yeni UI'dan erisilemez hale getir. Temizlik migrasyonu ayrica ele alinabilir.
- Secret sifreleme icin yeni `AI_PROVIDER_ENCRYPTION_KEY` env'i ekle; yerel gelistirmede gecis kolayligi icin `OPENAI_OAUTH_ENCRYPTION_KEY` fallback'i kabul et.
- OpenAI adapter'i bu iterasyonda `chat/completions` kullansin; boylece mevcut JSON-only parser semasini bozmadan OpenRouter ile ortak parser yolu korunur. Google adapter'i `models/{model}:generateContent` REST yolunu kullanir.
- Because explicit subagent delegation was not requested, do a local plan review instead of the skill's reviewer subagent loop.

## File Structure

### Shared contracts and settings cleanup
- Create: `packages/shared/src/contracts/aiProviders.ts` - provider enum'lari, config summary ve save payload schema'lari
- Modify: `packages/shared/src/schemas/settings.ts` - `aiTarget*` alanlarini kaldir
- Modify: `packages/shared/src/index.ts` - yeni AI provider contract export'lari
- Create: `apps/api/drizzle/0008_ai_provider_configs.sql` - `ai_provider_configs` tablosu ve `app_settings` sadeleştirme migrasyonu
- Modify: `apps/api/src/db/schema.ts` - `ai_provider_configs` Drizzle tanimi
- Modify: `apps/api/tests/integration/schema.test.ts` - yeni tablo beklentileri ve silinen `ai_target_*` kolonlari
- Modify: `apps/api/tests/integration/settings.test.ts` - sade settings payload'i

### Backend provider registry and generation pipeline
- Create: `apps/api/src/db/repositories/aiProviderConfigsRepo.ts` - config kaydetme/listeleme/aktiflestirme/gizli anahtar cozumleme
- Create: `apps/api/src/modules/ai/credentialCrypto.ts` - AES-GCM encrypt/decrypt yardimcilari
- Create: `apps/api/src/modules/ai/providerTypes.ts` - ortak adapter interface'leri
- Create: `apps/api/src/modules/ai/providers/openAiApiProvider.ts` - OpenAI request/response adapter'i
- Create: `apps/api/src/modules/ai/providers/openRouterApiProvider.ts` - OpenRouter request/response adapter'i
- Create: `apps/api/src/modules/ai/providers/googleApiProvider.ts` - Google generateContent adapter'i
- Create: `apps/api/src/modules/ai/resolveActiveAiProvider.ts` - aktif provider cozumleme ve dogrulama
- Create: `apps/api/src/modules/ai/generateDraftWithAi.ts` - aktif provider ile draft generation
- Create: `apps/api/src/modules/ai/generateFieldWithAi.ts` - aktif provider ile field generation
- Modify: `apps/api/src/config/bindings.ts` - `AI_PROVIDER_ENCRYPTION_KEY`
- Create: `apps/api/src/routes/aiProviders.ts` - list/save/activate/delete/generate endpoint'leri
- Modify: `apps/api/src/index.ts` - `/ai-providers` route mount, `/ai-profiles` route removal
- Create: `apps/api/tests/integration/aiProviders.test.ts` - save/activate/validate/no-active-provider senaryolari
- Modify: `apps/api/tests/integration/draftFlows.test.ts` - aktif provider ile draft generation
- Modify: `apps/api/tests/integration/etsyPrep.test.ts` - aktif provider ile Etsy prep field generation

### Web connections page and AI consumers
- Modify: `apps/web/src/app/api.ts` - `/ai-providers` client helper'lari ve yeni generation fonksiyonlari
- Create: `apps/web/src/features/connections/components/ProviderHelpPopover.tsx` - `?` yardim popup'lari
- Create: `apps/web/src/features/connections/components/ProviderConfigCard.tsx` - OpenAI/OpenRouter/Google kartlari
- Create: `apps/web/src/features/connections/hooks/useAiProviderConnections.ts` - query/mutation orkestrasyonu
- Modify: `apps/web/src/features/connections/routes/AIConnectionsPage.tsx` - yeni provider registry ekrani
- Modify: `apps/web/src/features/connections/routes/AIConnectionsPage.test.tsx` - kaydet/aktiflestir/help popup testleri
- Modify: `apps/web/src/features/etsyPrep/hooks/useEtsyPrepWorkspace.ts` - local connector hedefi yerine aktif provider badge/generation kullan
- Modify: `apps/web/src/features/etsyPrep/components/PrepModeHeader.tsx` - aktif provider badge ve yonlendirme dili
- Modify: `apps/web/src/features/etsyPrep/components/EtsyPrepWorkspace.test.tsx` - aktif provider ve bloklama mesajlari
- Modify: `apps/web/src/features/drafts/routes/SeoEditorPage.tsx` - `generateDraftWithAiProvider` kullan
- Modify: `apps/web/src/features/drafts/components/DraftEditor.tsx` - `connectorOnline` yerine `aiReady`

### Legacy cleanup and docs
- Delete: `apps/web/src/features/connections/components/AiTargetConfigPanel.tsx`
- Delete: `apps/web/src/features/connections/components/ConnectorStatusCard.tsx`
- Delete: `apps/web/src/features/connections/hooks/useAIConnections.ts`
- Delete: `apps/web/src/features/connections/lib/aiTargetStorage.ts`
- Delete: `apps/web/src/features/connections/lib/connectorApi.ts`
- Delete: `apps/web/src/features/connections/lib/resolveConnectorTarget.ts`
- Delete: `apps/web/src/features/connections/lib/connectorApi.test.ts`
- Delete: `apps/web/src/features/connections/lib/resolveConnectorTarget.test.ts`
- Delete: `apps/api/tests/integration/aiProfiles.test.ts`
- Create: `docs/superpowers/runbooks/2026-03-27-ai-provider-env.md` - gerekli env'ler ve local test notlari

## Task 1: Add the shared AI provider contract, migration, and settings cleanup

**Files:**
- Create: `packages/shared/src/contracts/aiProviders.ts`
- Modify: `packages/shared/src/schemas/settings.ts`
- Modify: `packages/shared/src/index.ts`
- Create: `apps/api/drizzle/0008_ai_provider_configs.sql`
- Modify: `apps/api/src/db/schema.ts`
- Modify: `apps/api/tests/integration/schema.test.ts`
- Modify: `apps/api/tests/integration/settings.test.ts`

- [ ] **Step 1: Extend schema/settings tests with the new provider table and the removed aiTarget fields**

```ts
const aiProviderColumns = database.prepare("pragma table_info(ai_provider_configs)").all() as Array<{ name: string }>;
const settingsColumns = database.prepare("pragma table_info(app_settings)").all() as Array<{ name: string }>;

expect(tables).toEqual(expect.arrayContaining([{ name: "ai_provider_configs" }]));
expect(aiProviderColumns).toEqual(
  expect.arrayContaining([
    expect.objectContaining({ name: "provider" }),
    expect.objectContaining({ name: "display_label" }),
    expect.objectContaining({ name: "api_key_encrypted" }),
    expect.objectContaining({ name: "is_active" }),
    expect.objectContaining({ name: "last_validated_at" }),
    expect.objectContaining({ name: "last_validation_error" }),
  ]),
);
expect(settingsColumns.find((column) => column.name === "ai_target_base_url")).toBeUndefined();
expect(settingsColumns.find((column) => column.name === "ai_target_api_key")).toBeUndefined();
```

```ts
const response = await app.request(
  "http://localhost/settings",
  {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ aiTargetBaseUrl: "https://clip.example.com" }),
  },
  env,
);

expect(response.status).toBe(400);
expect(await response.json()).toEqual({ error: "Unknown settings field: aiTargetBaseUrl" });
```

- [ ] **Step 2: Run the schema/settings tests before adding the migration**

Run: `pnpm --filter @trendyol-etsy/api test -- schema.test.ts settings.test.ts`
Expected: FAIL because `ai_provider_configs` does not exist and settings still accepts `aiTarget*` fields

- [ ] **Step 3: Add the migration, shared contracts, and a reduced settings schema**

```ts
// packages/shared/src/contracts/aiProviders.ts
import { z } from "zod";

export const aiProviderSchema = z.enum(["openai", "openrouter", "google"]);
export type AiProvider = z.infer<typeof aiProviderSchema>;

export const aiProviderConfigSummarySchema = z.object({
  id: z.string().min(1),
  provider: aiProviderSchema,
  displayLabel: z.string().min(1),
  defaultModel: z.string().min(1).nullable(),
  baseUrl: z.string().url().nullable(),
  hasApiKey: z.boolean(),
  apiKeyHint: z.string().min(1).nullable(),
  isActive: z.boolean(),
  lastValidatedAt: z.number().int().nullable(),
  lastValidationError: z.string().min(1).nullable(),
  extraConfig: z.record(z.string(), z.unknown()).default({}),
});
```

```sql
-- apps/api/drizzle/0008_ai_provider_configs.sql
create table ai_provider_configs (
  id text primary key not null,
  provider text not null check (provider in ('openai', 'openrouter', 'google')),
  display_label text not null,
  api_key_encrypted text not null,
  base_url text,
  default_model text,
  extra_config_json text,
  is_active integer not null default 0,
  last_validated_at integer,
  last_validation_error text,
  created_at integer not null default (unixepoch() * 1000),
  updated_at integer not null default (unixepoch() * 1000)
);
create unique index ai_provider_configs_provider_unique on ai_provider_configs(provider);
create unique index ai_provider_configs_single_active_idx on ai_provider_configs(is_active) where is_active = 1;

create table app_settings_next (
  id text primary key not null,
  refresh_interval_hours integer not null default 5,
  prompt_preferences_json text,
  connector_healthcheck_enabled integer not null default 1,
  created_at integer not null,
  updated_at integer not null
);
insert into app_settings_next (
  id,
  refresh_interval_hours,
  prompt_preferences_json,
  connector_healthcheck_enabled,
  created_at,
  updated_at
)
select
  id,
  refresh_interval_hours,
  prompt_preferences_json,
  connector_healthcheck_enabled,
  created_at,
  updated_at
from app_settings;
drop table app_settings;
alter table app_settings_next rename to app_settings;
```

```ts
// packages/shared/src/schemas/settings.ts
export const settingsSchema = z.object({
  refreshIntervalHours: z.number().int().min(1).max(168).default(5),
  promptPreferences: z
    .object({
      tone: z.string().min(1).optional(),
      seoFocus: z.string().min(1).optional(),
      language: z.string().min(1).default("tr"),
    })
    .nullable()
    .default(null),
  connectorHealthcheckEnabled: z.boolean().default(true),
});
```

- [ ] **Step 4: Re-run schema/settings tests and both typechecks**

Run: `pnpm --filter @trendyol-etsy/api test -- schema.test.ts settings.test.ts && pnpm --filter @trendyol-etsy/api typecheck && pnpm --filter @trendyol-etsy/web typecheck`
Expected: PASS with `ai_provider_configs` visible and `aiTarget*` payloads rejected

- [ ] **Step 5: Commit the migration and shared contract cleanup**

```bash
git add packages/shared/src/contracts/aiProviders.ts packages/shared/src/schemas/settings.ts packages/shared/src/index.ts apps/api/drizzle/0008_ai_provider_configs.sql apps/api/src/db/schema.ts apps/api/tests/integration/schema.test.ts apps/api/tests/integration/settings.test.ts
git commit -m "feat: add ai provider config schema"
```

## Task 2: Build encrypted provider storage and provider adapter modules

**Files:**
- Create: `apps/api/src/db/repositories/aiProviderConfigsRepo.ts`
- Create: `apps/api/src/modules/ai/credentialCrypto.ts`
- Create: `apps/api/src/modules/ai/providerTypes.ts`
- Create: `apps/api/src/modules/ai/providers/openAiApiProvider.ts`
- Create: `apps/api/src/modules/ai/providers/openRouterApiProvider.ts`
- Create: `apps/api/src/modules/ai/providers/googleApiProvider.ts`
- Create: `apps/api/src/modules/ai/resolveActiveAiProvider.ts`
- Create: `apps/api/tests/unit/credentialCrypto.test.ts`
- Create: `apps/api/tests/unit/aiProviderAdapters.test.ts`

- [ ] **Step 1: Add unit tests for secret encryption and provider adapter parsing**

```ts
const encrypted = await encryptSecret(env, "sk-openai-live-123456");
expect(encrypted).not.toContain("sk-openai-live-123456");
expect(await decryptSecret(env, encrypted)).toBe("sk-openai-live-123456");
```

```ts
const response = await createGoogleApiProvider({
  fetchImpl: async () =>
    new Response(
      JSON.stringify({
        candidates: [{ content: { parts: [{ text: '{"title":"Generated title"}' }] } }],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    ),
}).generateJson(config, {
  systemPrompt: "Return JSON",
  userPrompt: "Return {\"title\":\"Generated title\"}",
});

expect(JSON.parse(response.text)).toEqual({ title: "Generated title" });
expect(response.model).toBe("gemini-2.0-flash");
```

- [ ] **Step 2: Run the new unit tests before implementing crypto and adapters**

Run: `pnpm --filter @trendyol-etsy/api test -- credentialCrypto.test.ts aiProviderAdapters.test.ts`
Expected: FAIL because the new crypto and adapter modules do not exist yet

- [ ] **Step 3: Implement encrypted storage helpers and one adapter per provider**

```ts
// apps/api/src/modules/ai/credentialCrypto.ts
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toBase64(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes));
}

function fromBase64(value: string) {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

async function readAesKey(env: Pick<Env, "AI_PROVIDER_ENCRYPTION_KEY" | "OPENAI_OAUTH_ENCRYPTION_KEY">) {
  const rawKey = env.AI_PROVIDER_ENCRYPTION_KEY ?? env.OPENAI_OAUTH_ENCRYPTION_KEY;
  if (!rawKey || rawKey.length !== 32) {
    throw new Error("AI_PROVIDER_ENCRYPTION_KEY must be 32 characters long.");
  }

  return crypto.subtle.importKey("raw", encoder.encode(rawKey), "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptSecret(env: Env, plainText: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await readAesKey(env);
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(plainText));
  return `${toBase64(iv)}:${toBase64(new Uint8Array(encrypted))}`;
}
```

```ts
// apps/api/src/db/repositories/aiProviderConfigsRepo.ts
export function createAiProviderConfigsRepo(db: D1Database, env: Env) {
  return {
    async saveConfig(
      provider: AiProvider,
      input: {
        displayLabel: string;
        apiKey: string;
        defaultModel: string | null;
        baseUrl: string | null;
        extraConfig: Record<string, unknown>;
        activate: boolean;
      },
      now: number,
    ) {
      const encryptedApiKey = await encryptSecret(env, input.apiKey);
      await db
        .prepare(
          `insert into ai_provider_configs (
             id, provider, display_label, api_key_encrypted, base_url, default_model,
             extra_config_json, is_active, created_at, updated_at
           ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           on conflict(provider) do update set
             display_label = excluded.display_label,
             api_key_encrypted = excluded.api_key_encrypted,
             base_url = excluded.base_url,
             default_model = excluded.default_model,
             extra_config_json = excluded.extra_config_json,
             is_active = excluded.is_active,
             updated_at = excluded.updated_at`,
        )
        .bind(provider, provider, input.displayLabel, encryptedApiKey, input.baseUrl, input.defaultModel, JSON.stringify(input.extraConfig), input.activate ? 1 : 0, now, now)
        .run();
    },
  };
}
```

```ts
// apps/api/src/modules/ai/providerTypes.ts
export interface AiProviderAdapter {
  validate(config: ResolvedAiProviderConfig): Promise<void>;
  generateJson(
    config: ResolvedAiProviderConfig,
    input: { systemPrompt: string; userPrompt: string; temperature?: number },
  ): Promise<{ text: string; model: string }>;
}
```

```ts
// apps/api/src/modules/ai/providers/openRouterApiProvider.ts
const headers: Record<string, string> = {
  Authorization: `Bearer ${config.apiKey}`,
  "Content-Type": "application/json",
};
if (typeof config.extraConfig.siteUrl === "string") headers["HTTP-Referer"] = config.extraConfig.siteUrl;
if (typeof config.extraConfig.appName === "string") headers["X-Title"] = config.extraConfig.appName;
```

```ts
// apps/api/src/modules/ai/providers/googleApiProvider.ts
const response = await fetch(
  `${config.baseUrl ?? "https://generativelanguage.googleapis.com/v1beta"}/models/${encodeURIComponent(config.defaultModel ?? "gemini-2.0-flash")}:generateContent`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": config.apiKey,
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: `${input.systemPrompt}\n\n${input.userPrompt}` }] }],
      generationConfig: { temperature: input.temperature ?? 0.2 },
    }),
  },
);
```

- [ ] **Step 4: Re-run the new unit tests and API typecheck**

Run: `pnpm --filter @trendyol-etsy/api test -- credentialCrypto.test.ts aiProviderAdapters.test.ts && pnpm --filter @trendyol-etsy/api typecheck`
Expected: PASS with encrypted secrets and successful adapter parsing for all three providers

- [ ] **Step 5: Commit the provider registry core modules**

```bash
git add apps/api/src/db/repositories/aiProviderConfigsRepo.ts apps/api/src/modules/ai/credentialCrypto.ts apps/api/src/modules/ai/providerTypes.ts apps/api/src/modules/ai/providers/openAiApiProvider.ts apps/api/src/modules/ai/providers/openRouterApiProvider.ts apps/api/src/modules/ai/providers/googleApiProvider.ts apps/api/src/modules/ai/resolveActiveAiProvider.ts apps/api/tests/unit/credentialCrypto.test.ts apps/api/tests/unit/aiProviderAdapters.test.ts
git commit -m "feat: add ai provider registry core"
```

## Task 3: Expose `/ai-providers` routes and switch generation to the active provider

**Files:**
- Modify: `apps/api/src/config/bindings.ts`
- Create: `apps/api/src/modules/ai/generateDraftWithAi.ts`
- Create: `apps/api/src/modules/ai/generateFieldWithAi.ts`
- Create: `apps/api/src/routes/aiProviders.ts`
- Modify: `apps/api/src/index.ts`
- Create: `apps/api/tests/integration/aiProviders.test.ts`
- Modify: `apps/api/tests/integration/draftFlows.test.ts`
- Modify: `apps/api/tests/integration/etsyPrep.test.ts`

- [ ] **Step 1: Add integration tests for save/activate/list/generate and the no-active-provider error**

```ts
const saveOpenRouter = await app.request(
  "http://localhost/ai-providers/openrouter",
  {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      displayLabel: "OpenRouter",
      apiKey: "or-live-123",
      defaultModel: "openrouter/auto",
      baseUrl: "https://openrouter.ai/api/v1",
      extraConfig: { appName: "dropshiping-win", siteUrl: "https://localhost" },
      activate: true,
    }),
  },
  env,
);

expect(saveOpenRouter.status).toBe(200);
expect((await saveOpenRouter.json()).config).toEqual(
  expect.objectContaining({ provider: "openrouter", isActive: true, hasApiKey: true }),
);

const generateField = await app.request(
  "http://localhost/ai-providers/generate-field",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ field: "title", prompt: "Return JSON", context: {} }),
  },
  env,
);
expect(generateField.status).toBe(200);
expect((await generateField.json()).provider).toBe("openrouter");
```

```ts
const noActive = await app.request(
  "http://localhost/ai-providers/generate-field",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ field: "title", prompt: "Return JSON", context: {} }),
  },
  env,
);

expect(noActive.status).toBe(409);
expect(await noActive.json()).toEqual(
  expect.objectContaining({
    error: expect.objectContaining({ code: "NO_ACTIVE_PROVIDER", message: "Once AI baglantisi yapin." }),
  }),
);
```

- [ ] **Step 2: Run the provider integration tests before adding the route and generation dispatcher**

Run: `pnpm --filter @trendyol-etsy/api test -- aiProviders.test.ts draftFlows.test.ts etsyPrep.test.ts`
Expected: FAIL because `/ai-providers` does not exist and draft/prep still call the old OpenAI OAuth generation path

- [ ] **Step 3: Add the route surface and dispatch generation through the active provider registry**

```ts
// apps/api/src/config/bindings.ts
export interface Env {
  DB: D1Database;
  REFRESH_QUEUE: Queue<RefreshJob>;
  AI_PROVIDER_ENCRYPTION_KEY?: string;
  OPENAI_OAUTH_ENCRYPTION_KEY?: string;
  OPENAI_API_BASE_URL?: string;
  OPENAI_DEFAULT_MODEL?: string;
}
```

```ts
// apps/api/src/modules/ai/generateFieldWithAi.ts
export async function generateFieldWithAi(db: D1Database, env: Env, input: GenerateFieldWithAiInput) {
  const active = await resolveActiveAiProvider(db, env);
  const adapter = createAdapterForProvider(active.provider, env);
  const generated = await adapter.generateJson(active, {
    systemPrompt: "You generate Etsy listing fields. Return only valid JSON.",
    userPrompt: [
      `Field: ${input.field}`,
      input.prompt,
      `Context: ${JSON.stringify(input.context)}`,
    ].join("\n"),
    temperature: 0.2,
  });

  const parsed = parseJsonPayload(generated.text);
  if (!parsed) {
    throw new AiProviderRequestError("GENERATION_FAILED", "AI yaniti gecerli JSON icermiyor.", 502);
  }

  return {
    field: input.field,
    value: normalizeGeneratedFieldValue(input, parsed),
    provider: active.provider,
  };
}
```

```ts
// apps/api/src/routes/aiProviders.ts
const parseProvider = (value: string | undefined) => {
  const parsed = aiProviderSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
};

app.get("/", async (c) => {
  const repo = createAiProviderConfigsRepo(c.env.DB, c.env);
  return c.json(await repo.listConfigs());
});

app.put("/:provider", async (c) => {
  const provider = parseProvider(c.req.param("provider"));
  if (!provider) return c.json({ error: "Unsupported provider" }, 404);

  const body = await c.req.json<SaveAiProviderPayload>().catch(() => null);
  if (!body) return c.json({ error: "Invalid provider payload" }, 400);

  const repo = createAiProviderConfigsRepo(c.env.DB, c.env);
  const saved = await repo.saveAndValidate(provider, body, Date.now());
  return c.json(saved);
});

app.post("/:provider/activate", async (c) => {
  const provider = parseProvider(c.req.param("provider"));
  if (!provider) return c.json({ error: "Unsupported provider" }, 404);

  return c.json(await createAiProviderConfigsRepo(c.env.DB, c.env).activate(provider, Date.now()));
});

app.post("/generate-field", async (c) => {
  const body = await c.req.json<GenerateFieldWithAiInput>().catch(() => null);
  if (!body) return c.json({ error: "Invalid JSON payload" }, 400);
  return c.json(await generateFieldWithAi(c.env.DB, c.env, body));
});
app.post("/generate", async (c) => {
  const body = await c.req.json<GenerateDraftWithAiInput>().catch(() => null);
  if (!body) return c.json({ error: "Invalid JSON payload" }, 400);
  return c.json(await generateDraftWithAi(c.env.DB, c.env, body));
});
```

```ts
// apps/api/src/index.ts
app.route("/ai-providers", createAiProvidersRouter());
// remove: app.route("/ai-profiles", createAiProfilesRouter());
```

- [ ] **Step 4: Re-run the provider integration suite and the full API test command**

Run: `pnpm --filter @trendyol-etsy/api test -- aiProviders.test.ts draftFlows.test.ts etsyPrep.test.ts settings.test.ts`
Expected: PASS with save/activate/list/generate coverage and no more `/ai-profiles` dependency in draft/prep tests

- [ ] **Step 5: Commit the API routes and active-provider generation switch**

```bash
git add apps/api/src/config/bindings.ts apps/api/src/modules/ai/generateDraftWithAi.ts apps/api/src/modules/ai/generateFieldWithAi.ts apps/api/src/routes/aiProviders.ts apps/api/src/index.ts apps/api/tests/integration/aiProviders.test.ts apps/api/tests/integration/draftFlows.test.ts apps/api/tests/integration/etsyPrep.test.ts
git commit -m "feat: route ai generation through active provider"
```

## Task 4: Rewrite the web AI Connections page and the prep/draft consumers around `/ai-providers`

**Files:**
- Modify: `apps/web/src/app/api.ts`
- Create: `apps/web/src/features/connections/components/ProviderHelpPopover.tsx`
- Create: `apps/web/src/features/connections/components/ProviderConfigCard.tsx`
- Create: `apps/web/src/features/connections/hooks/useAiProviderConnections.ts`
- Modify: `apps/web/src/features/connections/routes/AIConnectionsPage.tsx`
- Modify: `apps/web/src/features/connections/routes/AIConnectionsPage.test.tsx`
- Modify: `apps/web/src/features/etsyPrep/hooks/useEtsyPrepWorkspace.ts`
- Modify: `apps/web/src/features/etsyPrep/components/PrepModeHeader.tsx`
- Modify: `apps/web/src/features/etsyPrep/components/EtsyPrepWorkspace.test.tsx`
- Modify: `apps/web/src/features/drafts/routes/SeoEditorPage.tsx`
- Modify: `apps/web/src/features/drafts/components/DraftEditor.tsx`

- [ ] **Step 1: Add UI tests for provider cards, help popovers, active-provider switching, and blocked generation messaging**

```tsx
renderWithProviders(<AIConnectionsPage />);

expect(await screen.findByRole("heading", { name: /AI Baglantilari/i })).toBeInTheDocument();
expect(screen.getByRole("button", { name: /OpenAI ayarlarini kaydet/i })).toBeInTheDocument();
expect(screen.getByRole("button", { name: /OpenRouter'i aktif yap/i })).toBeInTheDocument();

await user.click(screen.getByLabelText("OpenAI API Key yardimi"));
expect(await screen.findByText(/bu bilgi nereden alinir/i)).toBeInTheDocument();
```

```tsx
renderWithProviders(<EtsyPrepWorkspace productId="prod_1" onBack={() => {}} />);
expect(await screen.findByText(/Aktif AI Saglayicisi: OpenRouter/i)).toBeInTheDocument();
expect(screen.queryByText(/Yerel baglanti servisi hazir degil/i)).not.toBeInTheDocument();
```

- [ ] **Step 2: Run the web tests before switching the page and prep hooks away from connector-target logic**

Run: `pnpm --filter @trendyol-etsy/web test -- AIConnectionsPage.test.tsx EtsyPrepWorkspace.test.tsx ProductDetailPage.test.tsx`
Expected: FAIL because the page still renders desktop OpenAI state, uses `connectorApi`, and prep badges still mention connector health

- [ ] **Step 3: Replace the old connection UI with provider cards and consume `/ai-providers` everywhere**

```ts
// apps/web/src/app/api.ts
export interface AiProviderConfigSummary {
  id: string;
  provider: "openai" | "openrouter" | "google";
  displayLabel: string;
  defaultModel: string | null;
  baseUrl: string | null;
  hasApiKey: boolean;
  apiKeyHint: string | null;
  isActive: boolean;
  lastValidatedAt: number | null;
  lastValidationError: string | null;
  extraConfig: Record<string, unknown>;
}

export async function fetchAiProviders() {
  return parseJson<{ items: AiProviderConfigSummary[]; activeProvider: AiProviderConfigSummary | null }>(
    await fetchWithTimeout("/ai-providers"),
  );
}

export async function saveAiProvider(provider: AiProviderConfigSummary["provider"], payload: SaveAiProviderPayload) {
  return parseJson<{ config: AiProviderConfigSummary; activeProvider: AiProviderConfigSummary | null }>(
    await fetchWithTimeout(`/ai-providers/${provider}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
}
```

```tsx
// apps/web/src/features/connections/routes/AIConnectionsPage.tsx
export function AIConnectionsPage() {
  const connections = useAiProviderConnections();

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Ortak Provider Registry</p>
        <h1 className="mt-3 text-2xl font-semibold text-slate-900">AI Baglantilari</h1>
      </section>

      {connections.cards.map((card) => (
        <ProviderConfigCard
          key={card.provider}
          card={card}
          pending={connections.pendingProvider === card.provider}
          onSave={connections.saveProvider}
          onActivate={connections.activateProvider}
          onDelete={connections.deleteProvider}
        />
      ))}
    </div>
  );
}
```

```ts
// apps/web/src/features/etsyPrep/hooks/useEtsyPrepWorkspace.ts
const providersQuery = useQuery({ queryKey: ["ai-providers"], queryFn: fetchAiProviders });
const activeProvider = providersQuery.data?.activeProvider ?? null;
const generationBlockedReason = activeProvider
  ? activeProvider.lastValidationError
  : "Once AI baglantisi yapin.";

const generated = await generateAiProviderField({
  field,
  prompt: promptPackage.prompt,
  context: promptPackage.context,
});
```

```tsx
// apps/web/src/features/drafts/components/DraftEditor.tsx
interface DraftEditorProps {
  aiReady?: boolean;
}

<button
  type="button"
  disabled={disabled || !aiReady || isGeneratingTitle}
  onClick={onGenerateTitle}
>
  {isGeneratingTitle ? "Uretiliyor..." : "Baslik Uret"}
</button>
```

- [ ] **Step 4: Re-run the web unit tests and typecheck**

Run: `pnpm --filter @trendyol-etsy/web test -- AIConnectionsPage.test.tsx EtsyPrepWorkspace.test.tsx ProductDetailPage.test.tsx && pnpm --filter @trendyol-etsy/web typecheck`
Expected: PASS with provider cards, help popup coverage, and prep/draft screens now reading the active provider registry

- [ ] **Step 5: Commit the web provider registry UI and AI consumer updates**

```bash
git add apps/web/src/app/api.ts apps/web/src/features/connections/components/ProviderHelpPopover.tsx apps/web/src/features/connections/components/ProviderConfigCard.tsx apps/web/src/features/connections/hooks/useAiProviderConnections.ts apps/web/src/features/connections/routes/AIConnectionsPage.tsx apps/web/src/features/connections/routes/AIConnectionsPage.test.tsx apps/web/src/features/etsyPrep/hooks/useEtsyPrepWorkspace.ts apps/web/src/features/etsyPrep/components/PrepModeHeader.tsx apps/web/src/features/etsyPrep/components/EtsyPrepWorkspace.test.tsx apps/web/src/features/drafts/routes/SeoEditorPage.tsx apps/web/src/features/drafts/components/DraftEditor.tsx
git commit -m "feat: replace connector ui with ai provider cards"
```

## Task 5: Delete the old connector-specific surface and document the new provider env setup

**Files:**
- Delete: `apps/web/src/features/connections/components/AiTargetConfigPanel.tsx`
- Delete: `apps/web/src/features/connections/components/ConnectorStatusCard.tsx`
- Delete: `apps/web/src/features/connections/hooks/useAIConnections.ts`
- Delete: `apps/web/src/features/connections/lib/aiTargetStorage.ts`
- Delete: `apps/web/src/features/connections/lib/connectorApi.ts`
- Delete: `apps/web/src/features/connections/lib/resolveConnectorTarget.ts`
- Delete: `apps/web/src/features/connections/lib/connectorApi.test.ts`
- Delete: `apps/web/src/features/connections/lib/resolveConnectorTarget.test.ts`
- Delete: `apps/api/tests/integration/aiProfiles.test.ts`
- Create: `docs/superpowers/runbooks/2026-03-27-ai-provider-env.md`

- [ ] **Step 1: Add a docs/check regression that references the new encryption env and provider defaults**

```md
# AI provider env checklist

- `AI_PROVIDER_ENCRYPTION_KEY` -> 32 karakter AES-GCM key
- `OPENAI_API_BASE_URL` -> opsiyonel, bos ise `https://api.openai.com/v1`
- OpenRouter default base URL -> `https://openrouter.ai/api/v1`
- Google default base URL -> `https://generativelanguage.googleapis.com/v1beta`
```

- [ ] **Step 2: Run a final grep-style check so the old connector surface is still visible before cleanup**

Run: `Get-ChildItem apps/web/src -Recurse | Select-String -Pattern "connectorApi|aiTarget|useAIConnections|resolveConnectorTarget"`
Expected: MATCHES found in the legacy connection files and prep hook

- [ ] **Step 3: Delete the connector-specific files and write the new env runbook**

```md
# Local setup for shared AI providers

1. Add `AI_PROVIDER_ENCRYPTION_KEY` to the Worker env (32 chars).
2. Restart `wrangler dev` after changing env values.
3. Use the `AI Baglantilari` page to save at least one provider config.
4. Mark exactly one provider as active before testing Etsy draft or prep generation.
```

```bash
Remove-Item apps/web/src/features/connections/components/AiTargetConfigPanel.tsx
Remove-Item apps/web/src/features/connections/components/ConnectorStatusCard.tsx
Remove-Item apps/web/src/features/connections/hooks/useAIConnections.ts
Remove-Item apps/web/src/features/connections/lib/aiTargetStorage.ts
Remove-Item apps/web/src/features/connections/lib/connectorApi.ts
Remove-Item apps/web/src/features/connections/lib/resolveConnectorTarget.ts
Remove-Item apps/web/src/features/connections/lib/connectorApi.test.ts
Remove-Item apps/web/src/features/connections/lib/resolveConnectorTarget.test.ts
Remove-Item apps/api/tests/integration/aiProfiles.test.ts
```

- [ ] **Step 4: Run the final regression matrix after cleanup**

Run: `pnpm --filter @trendyol-etsy/api test -- aiProviders.test.ts draftFlows.test.ts etsyPrep.test.ts settings.test.ts && pnpm --filter @trendyol-etsy/web test -- AIConnectionsPage.test.tsx EtsyPrepWorkspace.test.tsx ProductDetailPage.test.tsx && pnpm --filter @trendyol-etsy/web typecheck`
Expected: PASS with no remaining connector-specific imports or tests

- [ ] **Step 5: Commit the cleanup and runbook**

```bash
git add -A apps/web/src/features/connections apps/api/tests/integration/aiProfiles.test.ts docs/superpowers/runbooks/2026-03-27-ai-provider-env.md
git commit -m "chore: remove legacy connector surface"
```

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-03-27-shared-ai-provider-configs.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
