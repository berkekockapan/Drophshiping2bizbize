# AI Connections OpenAI New-Tab OAuth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/connections` ekranındaki OpenAI giriş akışını mevcut tarayıcıda yeni sekmede başlatmak, callback sekmesinin kapanmayı denemesini sağlamak ve bağlı durumu manuel refresh ile görünür kılmak.

**Architecture:** `apps/web` tarafındaki `AI Bağlantıları` ekranı local connector start akışından çıkıp mevcut `apps/api /ai-profiles` OAuth endpointlerini kullanacak. Frontend, kullanıcı click’i içinde `authorizationUrl` alıp `window.open(..., "_blank")` ile yeni sekme açacak; `apps/api` ise callback HTML’ini ayrı, test edilebilir bir helper’a taşıyıp başarı durumunda `window.close()` denemesi + fallback metni üretecek.

**Tech Stack:** TypeScript, React, TanStack Query, Hono, Vitest, Testing Library

---

## Implementation Notes

- Source spec: `docs/superpowers/specs/2026-03-25-ai-connections-openai-new-tab-oauth-design.md`
- `apps/web/src/app/api.ts` içinde `/ai-profiles` için gerekli helper’lar (`fetchConnectorHealth`, `startOpenAiConnection`, `fetchConnectionAttempt`, `reconnectConnectorProfile`, `deleteConnectorProfile`) zaten var. Plan, yeni istemci yazmak yerine bunları reuse eder.
- `apps/web/src/features/connections/lib/connectorApi.ts` Etsy Prep tarafından hâlâ kullanıldığı için bu batch içinde silinmemeli; yalnızca `/connections` hook’undan çıkarılmalı.
- `apps/web/src/features/connections/components/AiTargetConfigPanel.tsx` bu planın kritik yolu değildir. Giriş akışını bozmadığı sürece değiştirmeyin.
- `apps/api/src/modules/ai/openAiOAuth.ts` dosyası zaten çok büyüktür; callback HTML üretimini ayrı yardımcı dosyaya taşımak burada hedefli ve yararlı bir ayrıştırmadır.
- Repo içinde halihazırda bu çalışma ile ilgisiz değişiklikler var (`apps/connector/src/providers/chatgptWebProvider.ts`, `apps/connector/tests/unit/chatGptWebProvider.test.ts`). Commit atarken yalnızca bu planın dosyalarını stage edin.

## File Structure

### Web OAuth launch flow
- Modify: `apps/web/src/features/connections/hooks/useAIConnections.ts` - `/connections` state kaynağını `/ai-profiles` helper’larına çevir, yeni sekme açma ve popup failure durumunu yönet.
- Modify: `apps/web/src/features/connections/components/ConnectorStatusCard.tsx` - CTA metnini `OpenAI ile giriş yap` yap, loading kopyasını sekme açma davranışına göre güncelle.
- Modify: `apps/web/src/features/connections/routes/AIConnectionsPage.test.tsx` - `/ai-profiles` mock’ları ve `window.open` doğrulamaları ekle.

### API callback HTML rendering
- Create: `apps/api/src/modules/ai/renderOpenAiCallbackHtml.ts` - callback HTML’ini, success auto-close script’i ve fallback mesajını üreten odaklı helper.
- Modify: `apps/api/src/modules/ai/openAiOAuth.ts` - inline HTML üretimini kaldır, yeni helper’ı kullan.
- Create: `apps/api/tests/unit/renderOpenAiCallbackHtml.test.ts` - success/error HTML varyantlarını doğrula.
- Modify: `apps/api/tests/integration/aiProfiles.test.ts` - start endpoint’inin `authorizationUrl` döndüğünü ve web akışı için kullanılabilir payload verdiğini doğrula.

## Task 1: `/connections` ekranını `/ai-profiles` + yeni sekme OAuth akışına çevir

**Files:**
- Modify: `apps/web/src/features/connections/routes/AIConnectionsPage.test.tsx`
- Modify: `apps/web/src/features/connections/hooks/useAIConnections.ts`
- Modify: `apps/web/src/features/connections/components/ConnectorStatusCard.tsx`

- [ ] **Step 1: Yeni sekme OAuth akışı için failing page testlerini yaz**

`AIConnectionsPage.test.tsx` içine mevcut mock setup’ı `/ai-profiles` endpoint ailesine çeviren ve yeni sekme davranışını doğrulayan testler ekleyin:

```ts
it("opens the returned OpenAI authorization URL in a new browser tab", async () => {
  const user = userEvent.setup();
  const openSpy = vi.spyOn(window, "open").mockReturnValue(window);

  mockAiProfilesFetches({
    health: {
      status: "online",
      provider: "openai-oauth",
      activeProfile: null,
      connectionAttempt: null,
    },
    start: {
      attempt: {
        id: "attempt_1",
        provider: "openai",
        status: "waiting_for_login",
        profileId: null,
        error: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      authorizationUrl: "https://auth.openai.com/oauth/authorize?client_id=test_client",
    },
  });

  renderWithProviders(<AIConnectionsPage />);

  await user.click(await screen.findByRole("button", { name: "OpenAI ile giriş yap" }));

  expect(openSpy).toHaveBeenCalledWith(
    "https://auth.openai.com/oauth/authorize?client_id=test_client",
    "_blank",
    "noopener",
  );
});
```

```ts
it("shows a product error when the browser blocks opening the login tab", async () => {
  const user = userEvent.setup();
  vi.spyOn(window, "open").mockReturnValue(null);

  mockAiProfilesFetches({
    health: {
      status: "online",
      provider: "openai-oauth",
      activeProfile: null,
      connectionAttempt: null,
    },
    start: {
      attempt: {
        id: "attempt_1",
        provider: "openai",
        status: "waiting_for_login",
        profileId: null,
        error: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      authorizationUrl: "https://auth.openai.com/oauth/authorize?client_id=test_client",
    },
  });

  renderWithProviders(<AIConnectionsPage />);

  await user.click(await screen.findByRole("button", { name: "OpenAI ile giriş yap" }));

  expect(await screen.findByText("Giriş sekmesi açılamadı. Tarayıcı izinlerini kontrol edip tekrar deneyin.")).toBeInTheDocument();
});
```

- [ ] **Step 2: Hedeflenmiş connections page testini çalıştır ve kırıldığını doğrula**

Run: `pnpm --filter @trendyol-etsy/web test -- src/features/connections/routes/AIConnectionsPage.test.tsx`

Expected: FAIL because the current page still calls `connectorApi.startOpenAiConnection()`, still renders `OpenAI ile Bağlan`, and never calls `window.open(...)`.

- [ ] **Step 3: Hook’u `/ai-profiles` helper’larını kullanacak şekilde güncelle**

`useAIConnections.ts` içinde `createConnectorApiClient` kullanımını kaldırıp mevcut `apps/web/src/app/api.ts` helper’larına dönün:

```ts
import {
  deleteConnectorProfile,
  fetchConnectionAttempt,
  fetchConnectorHealth,
  fetchSettings,
  patchSettings,
  reconnectConnectorProfile,
  startOpenAiConnection,
} from "../../../app/api";
```

Health ve polling query’lerini base URL yerine app route anahtarlarına çevirin:

```ts
const healthQuery = useQuery({
  queryKey: ["ai-profiles-health"],
  queryFn: fetchConnectorHealth,
  retry: false,
});

const attemptQuery = useQuery({
  queryKey: ["ai-profiles-attempt", effectiveAttemptId],
  enabled: Boolean(effectiveAttemptId),
  queryFn: () => fetchConnectionAttempt(effectiveAttemptId as string),
  retry: false,
  refetchInterval: (query) => {
    const attempt = query.state.data?.attempt;
    return attempt && isAttemptInProgress(attempt) ? 1_000 : false;
  },
});
```

Start mutation içinde yeni sekme açma ve popup failure yönetimi ekleyin:

```ts
const [launchError, setLaunchError] = useState<string | null>(null);

const startMutation = useMutation({
  mutationFn: async () => startOpenAiConnection(),
  onSuccess: async ({ attempt, authorizationUrl }) => {
    setLaunchError(null);
    const opened = window.open(authorizationUrl, "_blank", "noopener");
    if (!opened) {
      throw new Error("Giriş sekmesi açılamadı. Tarayıcı izinlerini kontrol edip tekrar deneyin.");
    }

    setActiveAttemptId(attempt.id);
    await queryClient.invalidateQueries({ queryKey: ["ai-profiles-health"] });
  },
});
```

`combinedError` içine `launchError` ekleyin veya launch hata durumunu `buildViewState()` öncesinde tek bir hata nesnesine dönüştürün.

- [ ] **Step 4: CTA metnini ve loading metnini yeni akışa göre güncelle**

`ConnectorStatusCard.tsx` içindeki disconnected CTA kopyasını değiştirin:

```tsx
{isStartingConnection ? "Giriş Sekmesi Açılıyor..." : "OpenAI ile giriş yap"}
```

Mevcut `onStartConnection` imzası korunabilir; page bileşeni değiştirilmeden çalışmalıdır.

- [ ] **Step 5: Connections page testini tekrar çalıştır ve geçtiğini doğrula**

Run: `pnpm --filter @trendyol-etsy/web test -- src/features/connections/routes/AIConnectionsPage.test.tsx`

Expected: PASS with `/ai-profiles` mocks, `window.open(...)` assertion, updated CTA copy, and popup-blocked error rendering.

- [ ] **Step 6: Web OAuth tab launch değişikliğini commit et**

```bash
git add apps/web/src/features/connections/hooks/useAIConnections.ts apps/web/src/features/connections/components/ConnectorStatusCard.tsx apps/web/src/features/connections/routes/AIConnectionsPage.test.tsx
git commit -m "feat: open ai oauth in a new browser tab"
```

## Task 2: Callback HTML’ini test edilebilir helper’a taşı ve auto-close davranışını ekle

**Files:**
- Create: `apps/api/src/modules/ai/renderOpenAiCallbackHtml.ts`
- Modify: `apps/api/src/modules/ai/openAiOAuth.ts`
- Create: `apps/api/tests/unit/renderOpenAiCallbackHtml.test.ts`

- [ ] **Step 1: Callback success/error HTML’i için failing unit testleri yaz**

Yeni `renderOpenAiCallbackHtml.test.ts` dosyasında success ve error varyantlarını netçe doğrulayın:

```ts
import { describe, expect, it } from "vitest";

import { renderOpenAiCallbackHtml } from "../../src/modules/ai/renderOpenAiCallbackHtml";

describe("renderOpenAiCallbackHtml", () => {
  it("includes an auto-close script and fallback copy on success", () => {
    const html = renderOpenAiCallbackHtml({
      ok: true,
      title: "OpenAI hesabı bağlandı",
      message: "Hesap başarıyla bağlandı. Uygulamaya geri dönüp devam edebilirsiniz.",
    });

    expect(html).toContain("window.close()");
    expect(html).toContain("Bu sekmeyi kapatıp uygulamaya dönebilirsiniz.");
  });

  it("does not auto-close the tab on failure", () => {
    const html = renderOpenAiCallbackHtml({
      ok: false,
      title: "OpenAI hesabı bağlanamadı",
      message: "OAuth akışı tamamlanamadı.",
    });

    expect(html).not.toContain("window.close()");
    expect(html).toContain("AI Bağlantıları sayfasına dönüp tekrar deneyin.");
  });
});
```

- [ ] **Step 2: Yeni unit test dosyasını çalıştır ve önce kırıldığını doğrula**

Run: `pnpm --filter @trendyol-etsy/api test -- tests/unit/renderOpenAiCallbackHtml.test.ts`

Expected: FAIL because the helper file does not exist yet and `openAiOAuth.ts` still contains inline HTML without auto-close behavior.

- [ ] **Step 3: Callback HTML helper’ını oluştur ve `openAiOAuth.ts` içine bağla**

Yeni helper dosyasında success-only auto-close script’i üretin:

```ts
function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function renderOpenAiCallbackHtml(input: {
  ok: boolean;
  title: string;
  message: string;
}) {
  const color = input.ok ? "#0f766e" : "#be123c";
  const fallback = input.ok
    ? "Bu sekmeyi kapatıp uygulamaya dönebilirsiniz."
    : "AI Bağlantıları sayfasına dönüp tekrar deneyin.";
  const autoCloseScript = input.ok
    ? `<script>
         setTimeout(() => {
           try { window.close(); } catch {}
         }, 800);
       </script>`
    : "";

  return `<!doctype html>
<html lang="tr">
  <head>...</head>
  <body>
    <main>
      <h1>${escapeHtml(input.title)}</h1>
      <p>${escapeHtml(input.message)}</p>
      <p>${fallback}</p>
    </main>
    ${autoCloseScript}
  </body>
</html>`;
}
```

Ardından `openAiOAuth.ts` içindeki mevcut `renderCallbackHtml(...)` fonksiyonunu kaldırıp yeni helper importunu kullanın:

```ts
import { renderOpenAiCallbackHtml } from "./renderOpenAiCallbackHtml";
```

ve tüm çağrıları buna çevirin.

- [ ] **Step 4: API callback helper testini tekrar çalıştır ve geçtiğini doğrula**

Run: `pnpm --filter @trendyol-etsy/api test -- tests/unit/renderOpenAiCallbackHtml.test.ts`

Expected: PASS with success HTML including `window.close()` and failure HTML keeping a retry instruction without auto-close.

- [ ] **Step 5: Callback helper değişikliğini commit et**

```bash
git add apps/api/src/modules/ai/renderOpenAiCallbackHtml.ts apps/api/src/modules/ai/openAiOAuth.ts apps/api/tests/unit/renderOpenAiCallbackHtml.test.ts
git commit -m "feat: auto-close oauth callback tab after success"
```

## Task 3: `/ai-profiles/openai/start` entegrasyonunu doğrula ve hedeflenmiş regresyon sweep yap

**Files:**
- Modify: `apps/api/tests/integration/aiProfiles.test.ts`

- [ ] **Step 1: OAuth start endpoint’i için failing integration test ekle**

`aiProfiles.test.ts` içine yeni sekme akışının dayandığı payload’ı doğrulayan test ekleyin:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";

it("returns an authorizationUrl for the web new-tab oauth flow", async () => {
  const { env } = createTestEnv();
  env.OPENAI_OAUTH_CLIENT_ID = "client_test";
  env.OPENAI_OAUTH_REDIRECT_URI = "http://localhost/ai-profiles/openai/callback";

  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(null, {
      status: 302,
      headers: {
        Location: "https://auth.openai.com/oauth/authorize",
      },
    }),
  );

  const app = createApp();
  const response = await app.request("http://localhost/ai-profiles/openai/start", { method: "POST" }, env);
  const body = await response.json();

  expect(response.status).toBe(202);
  expect(body).toEqual(
    expect.objectContaining({
      authorizationUrl: expect.stringContaining("client_id=client_test"),
      attempt: expect.objectContaining({
        status: "waiting_for_login",
      }),
    }),
  );
});
```

Bu dosyada `afterEach(() => vi.restoreAllMocks())` ekleyin ki fetch mock’ları diğer testlere sızmasın.

- [ ] **Step 2: Hedeflenmiş API testlerini çalıştır ve önce kırıldığını doğrula**

Run: `pnpm --filter @trendyol-etsy/api test -- tests/integration/aiProfiles.test.ts`

Expected: FAIL until the new callback helper wiring and/or test cleanup is in place.

- [ ] **Step 3: Gerekli küçük entegrasyon düzeltmelerini yap**

Start endpoint testi kırılırsa yalnızca gerekli minimum düzenlemeyi uygulayın:

- `aiProfiles.test.ts` importlarını genişletin (`afterEach`, `vi`)
- `fetch` mock’unun `ensureOauthClientIsSupported(...)` çağrısını tatmin ettiğinden emin olun
- test body assertion’ını gerçek route payload’ı ile hizalayın

Bu adımda ürün davranışı değişikliği yapmayın; amaç yalnızca yeni web akışının dayandığı endpoint sözleşmesini sabitlemektir.

- [ ] **Step 4: Web + API hedeflenmiş regresyon paketini çalıştır**

Run: `pnpm --filter @trendyol-etsy/web test -- src/features/connections/routes/AIConnectionsPage.test.tsx && pnpm --filter @trendyol-etsy/api test -- tests/unit/renderOpenAiCallbackHtml.test.ts tests/integration/aiProfiles.test.ts`

Expected: PASS with:
- `/connections` ekranı yeni sekme açıyor
- popup block hatası kullanıcıya gösteriliyor
- callback success HTML’i auto-close script’i içeriyor
- `/ai-profiles/openai/start` web için kullanılabilir `authorizationUrl` döndürüyor

- [ ] **Step 5: Final regression değişikliklerini commit et**

```bash
git add apps/api/tests/integration/aiProfiles.test.ts
git commit -m "test: cover ai profiles oauth start flow"
```
