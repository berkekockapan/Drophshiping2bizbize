# Cloudflare Deploy Runbook

> Bu belge Cloudflare ?zerindeki OpenAI OAuth / connector secret y?netimini ve yanl?? hesaba yazmay? engelleyen yerel guard ak???n? toplar.
> Ana deploy ak??? i?in `docs/deploy/cloudflare.md` kullan?l?r.
> Veri g?venli?i i?in her zaman `docs/runbooks/cloudflare-data-safety.md` ?nceliklidir.

## Kapsam

Bu runbook a?a??daki i?ler i?in kullan?l?r:

- Worker secret yazmak
- OpenAI OAuth callback ak???n? do?ru worker ?zerinde ?al??t?rmak
- Deploy ?ncesi hedef hesab? do?rulamak

## Hedef kimlik

- Repo kimli?i: `dropshiping2bizbize`
- Cloudflare hesab?: `berkekockapan3535@gmail.com`
- `account_id`: `102eaec87235c67e6d7524d859bd92dd`
- Prod worker: `dropshiping2bizbize-api`
- Dev worker: `dropshiping2bizbize-api-dev`

## Repo i?i guard komutlar?

Bu repo art?k yanl?? hesaba deploy veya secret yazmay? azaltmak i?in yerel guard komutlar? i?erir:

```bash
pnpm cf:guard
pnpm cf:deploy:api
pnpm cf:deploy:api:dev
pnpm cf:d1:migrate:prod
pnpm cf:d1:migrate:dev
pnpm cf:secret -- SECRET_NAME
pnpm cf:secret -- SECRET_NAME --env dev
```

`pnpm cf:guard` ?unlar? do?rular:

- giri? yap?lan email do?ru mu
- hedef `account_id` mevcut mu
- token i?inde `workers:write`, `d1:write`, `queues:write` izinleri var m?

Guard ba?ar?s?z olursa deploy ve secret ak??? durur.

## OpenAI OAuth konfig?rasyonu

1. OpenAI Dashboard'da bu proje i?in bir OAuth uygulamas? olu?turun.
2. Callback / redirect URL olarak ?unu ekleyin:
   - `https://dropshiping2bizbize-api.berkekockapan3535.workers.dev/ai-profiles/openai/callback`
3. Worker secret de?erlerini tan?mlay?n:
   - `OPENAI_OAUTH_CLIENT_ID`
   - `OPENAI_OAUTH_CLIENT_SECRET`
   - `OPENAI_OAUTH_REDIRECT_URI`
   - `OPENAI_OAUTH_ENCRYPTION_KEY`

Production ?rne?i:

```bash
pnpm cf:secret -- OPENAI_OAUTH_CLIENT_ID
pnpm cf:secret -- OPENAI_OAUTH_CLIENT_SECRET
pnpm cf:secret -- OPENAI_OAUTH_REDIRECT_URI
pnpm cf:secret -- OPENAI_OAUTH_ENCRYPTION_KEY
```

Dev ?rne?i:

```bash
pnpm cf:secret -- OPENAI_OAUTH_CLIENT_ID --env dev
pnpm cf:secret -- OPENAI_OAUTH_CLIENT_SECRET --env dev
pnpm cf:secret -- OPENAI_OAUTH_REDIRECT_URI --env dev
pnpm cf:secret -- OPENAI_OAUTH_ENCRYPTION_KEY --env dev
```

## Secret y?neti?imi kurallar?

1. Production ve dev secret de?erlerini ayr? d???n?n.
2. Secret de?erlerini `.env`, `.md`, batch veya PowerShell dosyas?na d?z metin olarak yazmay?n.
3. Secret girmeden ?nce `pnpm cf:guard` ?al??t?r?n veya do?rudan `pnpm cf:secret` wrapper'?n? kullan?n.
4. `dropshiping-win` hesab?ndaki OAuth bilgilerini bu repo i?in yeniden kullanmay?n.
5. Secret yazma s?ras?nda terminal ge?mi?inde d?z de?er b?rakmay?n; `wrangler secret put` etkile?imli giri?ini kullan?n.

## Do?rulama sonras? kontrol listesi

- `pnpm cf:guard` ba?ar?l? m??
- Prod secret'lar yaln?zca prod worker'a m? yaz?ld??
- Dev secret'lar yaln?zca dev worker'a m? yaz?ld??
- Callback URL production worker alan ad?na m? gidiyor?
- Yanl?? hesapta yaz?lm?? bir secret ihtimali d??land? m??

## Kritik notlar

- `~/.codex/auth.json` i?indeki `client_id` bu proje i?in kullan?lmaz.
- Production D1 tek resmi canl? veri kayna??d?r; lokal veya dev D1 bunun yerine ge?mez.
- Production veri geri d?n??? gerekiyorsa ?nce `docs/deploy/cloudflare.md` i?indeki Time Travel b?l?m? kullan?l?r.
