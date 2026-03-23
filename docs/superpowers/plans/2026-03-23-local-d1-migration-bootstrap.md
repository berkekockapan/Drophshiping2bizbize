# Local D1 Migration Bootstrap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Yerel gelistirme acilisinda bekleyen D1 SQL migrationlarini otomatik uygulayip `/tracking/products` benzeri endpointlerin eksik sema nedeniyle 500 vermesini engellemek.

**Architecture:** `scripts/macos/start-dev.sh` icindeki veritabani hazirlama adimi, `apps/api/drizzle/*.sql` dosyalarini migration kayit tablosu ile yonetecek. Eski local veritabanlari icin bootstrap mantigi, zaten mevcut semayi yeniden uygulamadan uygun migrationlari kayitli sayacak; yeni migrationlar ise sirayla calisacak.

**Tech Stack:** Bash, Wrangler D1 local execute, SQLite metadata sorgulari

---

### Task 1: Plani ve etkiledigi dosyalari netlestir

**Files:**
- Modify: `scripts/macos/start-dev.sh`
- Test: `scripts/macos/start-dev.sh`

- [ ] **Step 1: Mevcut D1 bootstrap mantigini incele**

Beklenen: Script sadece `0000_initial.sql` uyguladigi icin yeni migrationlar local DB'ye yansimiyor.

- [ ] **Step 2: Idempotent migration stratejisini belirle**

Beklenen: `d1_local_migrations` benzeri bir tablo olusturulacak; eski DB'lerde ilk migrationlar sema sorgulariyla "uygulanmis" kabul edilip kaydedilecek.

### Task 2: Scripti guncelle

**Files:**
- Modify: `scripts/macos/start-dev.sh`

- [ ] **Step 1: Migration metadata tablosu olustur**

```bash
create table if not exists d1_local_migrations (
  name text primary key,
  applied_at integer not null
);
```

- [ ] **Step 2: Bootstrap kayit mantigini ekle**

Beklenen: `products` tablosu varsa `0000_initial.sql`, `is_favorite` kolonu varsa `0001_products_is_favorite.sql` metadata tablosuna eklenir.

- [ ] **Step 3: Bekleyen migration dosyalarini sirayla uygula**

Beklenen: `apps/api/drizzle/*.sql` listelenir, metadata tablosunda olmayanlar `wrangler d1 execute --file` ile uygulanir ve basari sonrasi kayda gecirilir.

### Task 3: Dogrulama

**Files:**
- Test: `scripts/macos/start-dev.sh`

- [ ] **Step 1: Script syntax kontrolu yap**

Run: `bash -n scripts/macos/start-dev.sh`
Expected: Komut sessiz sekilde basarili doner.

- [ ] **Step 2: Mantik icin hedefli smoke test yap**

Run: `pnpm --filter @trendyol-etsy/api exec wrangler d1 execute trendyol-etsy --local --command "SELECT name FROM sqlite_master WHERE type='table' AND name='d1_local_migrations';" --json`
Expected: Migration metadata tablosu gorunur veya script calistiginda olusturulabilir.

- [ ] **Step 3: Uygulama akisinin artik sema nedeniyle kirilmayacagini dogrula**

Beklenen: `is_favorite` kolonu local DB'de mevcut olur; `/tracking/products` sorgusu eksik kolon nedeniyle 500 uretmez.
