# 2026-04-21 Proje Ayırıştırma Planı

**Belge tarihi:** 2026-04-21  
**Durum:** Faz A/B/C/D tamamlandı, Faz E kısmi  
**Kapsam:** `dropshiping2bizbize` reposunun `dropshiping-win` ve legacy kimliklerden operasyonel olarak ayrıştırılması

---

## 1) Nihai karar seti

Bu repo için sabitlenen hedef referanslar:

- Cloudflare hesabı: `berkekockapan3535@gmail.com`
- `account_id`: `102eaec87235c67e6d7524d859bd92dd`
- Prod Worker: `dropshiping2bizbize-api`
- Dev Worker: `dropshiping2bizbize-api-dev`
- Prod D1: `dropshiping2bizbize-prod`
- Dev D1: `dropshiping2bizbize-dev`
- Prod Queue: `dropshiping2bizbize-refresh`
- Dev Queue: `dropshiping2bizbize-refresh-dev`
- Root package: `dropshiping2bizbize-workflow`
- Workspace scope: `@dropshiping2bizbize/*`
- Port standardı: API `8788`, web dev `5174`, web preview `4175`, connector `4318`

`dropshiping-win` bu referans setinin parçası değildir ve ayrı Cloudflare hesabında kalır.

---

## 2) Bu turda gerçekten yapılan işler

### 2.1 Cloudflare izolasyonu uygulandı

Aşağıdaki kaynaklar hedef hesapta oluşturuldu veya sabitlendi:

- Prod D1: `dropshiping2bizbize-prod`
  - `database_id = "aab63623-ff50-4109-b927-e2fff3f45fbc"`
- Dev D1: `dropshiping2bizbize-dev`
  - `database_id = "ea8b4312-d2f8-47d0-91bd-8b10745c47ff"`
- Prod Queue: `dropshiping2bizbize-refresh`
- Dev Queue: `dropshiping2bizbize-refresh-dev`

`apps/api/wrangler.toml` ve `apps/api/wrangler.isolated.toml` dosyaları hedef hesap ve yeni kaynak adlarıyla güncellendi.

### 2.2 Paket ve kimlik ayrımı uygulandı

Aşağıdaki isim standardı repo içinde aktif hale getirildi:

- Root package: `dropshiping2bizbize-workflow`
- API: `@dropshiping2bizbize/api`
- Web: `@dropshiping2bizbize/web`
- Connector: `@dropshiping2bizbize/connector`
- Shared: `@dropshiping2bizbize/shared`

Eski `@trendyol-etsy/*` referansları operasyonel kod ve script yüzeylerinden çıkarıldı.

### 2.3 Port ayrımı uygulandı

Repo ve ilişkili script/config yüzeylerinde hedef port standardı uygulanmıştır:

- API `8788`
- Web dev `5174`
- Web preview `4175`
- Connector `4318`

### 2.4 Dokümantasyon uyarlaması yapıldı

Operasyonel belgeler yeni kimliğe göre güncellendi. Tarihsel belgeler silinmedi; gerekli yerlerde historical/archive notu ile sınırlandı.

### 2.5 Repo içi secret/deploy guard eklendi

Yanlış hesaba deploy veya secret yazmayı azaltmak için repo içine şu korumalar eklendi:

- `scripts/cloudflare/ensure-target-account.mjs`
- `scripts/cloudflare/worker-secret.mjs`
- root scriptleri: `pnpm cf:guard`, `pnpm cf:deploy:api`, `pnpm cf:deploy:api:dev`, `pnpm cf:d1:migrate:prod`, `pnpm cf:d1:migrate:dev`, `pnpm cf:secret`
- `apps/api` deploy ve migration scriptleri guard çağıracak şekilde güncellendi
- `scripts/windows/restart-main-server.ps1` Cloudflare deploy öncesi guard kontrolü yapacak şekilde güncellendi

---

## 3) Doğrulanmış teknik sonuçlar

### 3.1 Hesap doğrulaması

`wrangler whoami` çıktısı hedef hesabı doğruladı:

- Email: `berkekockapan3535@gmail.com`
- Account ID: `102eaec87235c67e6d7524d859bd92dd`

### 3.2 D1 migration durumu

Uzak migration'lar her iki veritabanına da başarıyla uygulandı:

- `dropshiping2bizbize-prod`
- `dropshiping2bizbize-dev`

### 3.3 Deploy durumu

Başarılı deploy edilmiş worker URL'leri:

- Prod: `https://dropshiping2bizbize-api.berkekockapan3535.workers.dev`
- Dev: `https://dropshiping2bizbize-api-dev.berkekockapan3535.workers.dev`

Not: Dev ortam deploy'unda hesap planı nedeniyle cron tetikleyicisi hata verdiği için `env.dev.triggers.crons = []` olarak ayarlandı. Bu bilinçli bir koruma uyarlamasıdır.

### 3.4 Health check sonucu

Her iki endpoint de doğrulandı:

- `GET https://dropshiping2bizbize-api.berkekockapan3535.workers.dev/health` → `200` / `{"ok":true}`
- `GET https://dropshiping2bizbize-api-dev.berkekockapan3535.workers.dev/health` → `200` / `{"ok":true}`

### 3.5 Repo tip denetimi

`pnpm typecheck` başarıyla geçti.

### 3.6 Guard doğrulaması

Aşağıdaki komutlar doğrulandı:

- `pnpm cf:guard` → başarılı
- `pnpm --filter @dropshiping2bizbize/api run guard:cloudflare` → başarılı
- `pnpm cf:secret -- --help` → wrapper erişilebilir

---

## 4) Faz bazlı son durum

### Faz A — Cloudflare izolasyonu
**Durum:** Tamamlandı

Tamamlanan maddeler:
1. `account_id` hedef hesaba sabitlendi.
2. Worker/D1/queue adları `dropshiping2bizbize-*` standardına geçirildi.
3. Hedef hesap `wrangler whoami` ile doğrulandı.
4. Yeni D1 ve queue kaynakları oluşturuldu.
5. Uzak migration ve deploy başarıyla yapıldı.

### Faz B — Kimlik / scope ayrımı
**Durum:** Tamamlandı

Tamamlanan maddeler:
1. Root package adı güncellendi.
2. Workspace scope `@dropshiping2bizbize/*` standardına taşındı.
3. Kod importları ve script filtreleri bu standarda uyarlandı.

### Faz C — Port ve lokal runtime ayrımı
**Durum:** Tamamlandı

Tamamlanan maddeler:
1. API `8788`
2. Web dev `5174`
3. Web preview `4175`
4. Connector `4318`
5. İlgili test, env ve script yüzeyleri bu portlara uyarlandı.

### Faz D — Dokümantasyon temizliği
**Durum:** Tamamlandı

Tamamlanan maddeler:
1. Operasyonel Cloudflare/runbook belgeleri yeni kimlikle eşlendi.
2. Tarihsel referanslar archive/historical notlarıyla sınırlandı.
3. Bu plan belgesi gerçek uygulama sonucuna göre yeniden yazıldı.

### Faz E — CI/CD ve secret ayrımı
**Durum:** Kısmi, repo içi guard tamamlandı

Mevcut durum:
1. Repo içinde `.github/workflows` bulunmuyor.
2. Buna rağmen repo içine yanlış hesaba deploy/secret yazmayı engelleyen yerel guard eklendi.
3. `pnpm cf:guard`, `pnpm cf:deploy:api`, `pnpm cf:deploy:api:dev`, `pnpm cf:d1:migrate:prod`, `pnpm cf:d1:migrate:dev` ve `pnpm cf:secret` komutları hedef hesabı doğrulayarak çalışır.
4. `apps/api` package scriptleri de deploy ve migration öncesi aynı guard'ı çağırır.
5. Windows restart/deploy akışı guard kontrolü olmadan Cloudflare deploy başlatmaz.
6. Buna rağmen kalıcı token/secret yönetişimi dashboard veya dış CI yüzeyinde ayrıca sabitlenmelidir.

Önerilen sonraki adım:
- Bu repo için ayrı bir Cloudflare API token seti oluşturulması ve deploy yüzeyinde yalnızca `berkekockapan3535@gmail.com` hesabına yetki verilmesi.

---

## 5) Veri güvenliği notu

Bu turda yıkıcı veri işlemi yapılmadı.

- `DROP`
- `DELETE`
- `TRUNCATE`
- restore/rollback
- destructive migration

uygulanmadı. Yapılan işlemler yeni kaynak oluşturma, migration uygulama, yapılandırma güncelleme ve deploy ile sınırlı kaldı.

Veri etkileyen gelecekteki adımlar için zorunlu referans:
- `docs/runbooks/cloudflare-data-safety.md`

---

## 6) Done değerlendirmesi

Aşağıdaki maddelerden ilk altısı mevcut durumda sağlanmıştır:

1. Repo hedef Cloudflare hesabına sabitlendi. ✅
2. Worker/D1/queue adları `dropshiping2bizbize-*` standardına geçti. ✅
3. Paket scope `@dropshiping2bizbize/*` oldu. ✅
4. Yerel portlar `8788 / 5174 / 4175 / 4318` standardına geçti. ✅
5. Dokümantasyon ile gerçek repo durumu eşlendi. ✅
6. Deploy ve health check doğrulandı. ✅
7. Repo içi guard tamamlandı; dış CI/dashboard token yönetişimi ayrıca kesinleştirilmeli. ⏳

---

## 7) Operasyonel kaynak zinciri

Güncel operasyon için öncelik sırası:

1. `docs/runbooks/cloudflare-data-safety.md`
2. `docs/runbooks/2026-04-21-proje-ayristirma-plani.md`
3. `docs/deploy/cloudflare.md`
4. `docs/runbooks/2026-03-28-central-cloud-persistence-rollout.md`
5. `docs/superpowers/HISTORICAL-NOTE.md`
