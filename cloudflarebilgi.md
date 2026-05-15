# Cloudflare Bilgi ve Sabit Bağlantı Modeli

Bu doküman, projede kullanılan Cloudflare yapılandırmasının **tek referansıdır**.

## Kritik Kural (Değiştirmeyin)

- Bu projedeki Cloudflare hesap/bağlantı bilgileri **kesinlikle değiştirilmemelidir**.
- Özellikle aşağıdakiler, açık onay olmadan değiştirilemez:
  - `account_id`
  - worker adları
  - D1 veritabanı adları/ID’leri
  - queue adları
  - API base URL
  - auth dosyası formatı ve anahtarları
- Bu proje, Cloudflare’a **yalnızca aşağıda tanımlı modelle** bağlanır. Bunun dışında farklı yöntem kullanılmaz.

---

## 1) Cloudflare Hesap Kimliği (Sabit)

Kaynak: `C:\dropshipingtakip2\scripts\cloudflare\ensure-target-account.mjs`

- Beklenen e-posta: `berkekockapan3535@gmail.com`
- Beklenen account id: `102eaec87235c67e6d7524d859bd92dd`
- Gerekli token izinleri: `workers:write`, `d1:write`, `queues:write`

---

## 2) Worker / D1 / Queue Bilgileri

Kaynak: `C:\dropshipingtakip2\apps\api\wrangler.toml`

### Worker
- Production worker adı: `dropshiping2bizbize-api`
- Dev worker adı: `dropshiping2bizbize-api-dev`

### D1
- Prod DB:
  - ad: `dropshiping2bizbize-prod`
  - id: `aab63623-ff50-4109-b927-e2fff3f45fbc`
- Dev DB:
  - ad: `dropshiping2bizbize-dev`
  - id: `ea8b4312-d2f8-47d0-91bd-8b10745c47ff`

### Queue
- Prod queue: `dropshiping2bizbize-refresh`
- Dev queue: `dropshiping2bizbize-refresh-dev`

### R2
- Prompt gorselleri binding: `PROMPT_IMAGES`
- Prod bucket adi: `dropshiping2bizbize-prompt-images`
- Dev bucket adi: `dropshiping2bizbize-prompt-images-dev`
- Bu bucketlar prompt kutuphanesi gorselleri icindir; otomatik temizlik/silme akisi yoktur. Manuel silme onayi olmadan prompt/gorsel verisi kaldirilmaz.

### Cron
- Prod cron: `0 * * * *`
- Dev cron: yok

---

## 3) Cloudflare Auth Dosyaları

### Asıl auth dosyası
`C:\dropshipingtakip2\apps\api\.cloudflare.env`

İçerik anahtarları:
- `CLOUDFLARE_API_TOKEN` (**gizli**, değeri paylaşılmaz)
- `CLOUDFLARE_ACCOUNT_ID` (yukarıdaki sabit hesap)

### Örnek dosya
`C:\dropshipingtakip2\apps\api\.cloudflare.env.example`

Bu dosya sadece şablondur.

---

## 4) Web’in Cloudflare API’ye Bağlandığı Yer

Kaynaklar:
- `C:\dropshipingtakip2\apps\web\.env.production`
- `C:\dropshipingtakip2\apps\web\.env.local`

Temel değişken:
- `VITE_API_BASE_URL=https://dropshiping2bizbize-api.berkekockapan3535.workers.dev`

Not: Bu URL yalnızca onayla değiştirilir.

---

## 5) Zorunlu Bağlantı/Deploy Modeli (Tek Model)

Bu proje Cloudflare komutlarını doğrudan çıplak `wrangler` ile değil, aşağıdaki güvenli akışla yürütür:

1. Auth env yüklenir  
   - `C:\dropshipingtakip2\scripts\cloudflare-auth-run.mjs`
2. Hedef hesap guard kontrolü yapılır  
   - `pnpm.cmd cf:guard`
3. Deploy/migration komutları `pnpm` scriptleri üzerinden çalıştırılır  
   - `pnpm.cmd cf:deploy:api`
   - `pnpm.cmd cf:migrate:api:prod` (gerekirse)

Windows başlatma akışında Cloud mod:
- `C:\dropshipingtakip2\scripts\windows\start-server.bat`
- `C:\dropshipingtakip2\scripts\windows\restart-main-server.ps1`

---

## 6) Yasaklanan Alternatifler

- Farklı Cloudflare hesabıyla deploy yapmak
- `wrangler.toml` içinde hesap/kaynakları rastgele değiştirmek
- `.cloudflare.env` içeriğini keyfi değiştirmek
- Bu model dışında manuel/alternatif deploy yöntemi kullanmak

---

## 7) Hızlı Doğrulama Komutları

```powershell
pnpm.cmd cf:guard
pnpm.cmd cf:deploy:api
```

Başarılı deploy sonrası worker URL:
- `https://dropshiping2bizbize-api.berkekockapan3535.workers.dev`

