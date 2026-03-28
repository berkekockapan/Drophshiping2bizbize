# Central cloud persistence rollout

Bu runbook, production D1'i tek resmi canli veri kaynagi olarak kullanima alma, iki cihaz smoke test ve geri donus/Time Travel adimlarini toplar.

## 1. Production D1 tek resmi veri kaynagidir

- Canli kullanimda yalnizca deploy edilmis Pages + deploy edilmis Worker + `trendyol-etsy-prod` kullanilir.
- Lokal D1, `trendyol-etsy-dev` ve `wrangler dev` canli veri kaynagi degildir.
- `VITE_API_BASE_URL` production Pages ortaminda Worker domainine ayarlanmis olmalidir.

## 2. Baslamadan once kontrol

1. `pnpm --filter @trendyol-etsy/api exec wrangler d1 info trendyol-etsy-prod`
2. `pnpm --filter @trendyol-etsy/api exec wrangler d1 time-travel info trendyol-etsy-prod`
3. Gerekirse mevcut veri kaynaklarini ve kritik kayitlari not alin.

## 3. Rollout sirasi

1. `pnpm --filter @trendyol-etsy/api exec wrangler d1 migrations apply trendyol-etsy-prod --remote`
2. `pnpm cf:deploy:api`
3. Pages ortam degiskeninde `VITE_API_BASE_URL=https://<worker-subdomain>.workers.dev` oldugunu dogrula.
4. Web uygulamasini deploy et ve health check calistir.

## 4. Iki cihaz smoke test

1. Cihaz A'da bir owner sayfasini ac.
2. Cihaz A'dan yeni bir urun linki ekle.
3. Cihaz B'de ayni owner listesi acik kalsin.
4. En gec 10 saniye icinde ve pencere odaga gelince ayni kaydin gorundugunu dogrula.
5. Cihaz A'da favori, kategori veya draft degisikligi yap.
6. Cihaz B'de ayni kaydin tekrar cekildigini ve guncel verinin gorundugunu dogrula.
7. Cop kutusu ve bildirim gorunumlerinde de merkezi veri tutarliligini kontrol et.

## 5. Time Travel ve geri donus

- Kod hatasinda once son saglam commit'i yeniden deploy et.
- Veri duzeltmesi gerekiyorsa once bookmark listesini kontrol et:

```bash
pnpm --filter @trendyol-etsy/api exec wrangler d1 time-travel info trendyol-etsy-prod
```

- Ardindan ilgili bookmark ile geri donus uygula:

```bash
pnpm --filter @trendyol-etsy/api exec wrangler d1 time-travel restore trendyol-etsy-prod --bookmark=<bookmark>
```

- Geri donus sonrasi yeniden smoke test calistir.

## 6. Basari kriteri

- Production veri yalnizca `trendyol-etsy-prod` uzerinden okunup yazilir.
- Iki cihazdaki owner ekranlari 10 saniyelik live-sync ile senkron kalir.
- Time Travel ile veri geri alinabilir.
- Lokal veya dev ortam canli veri yerine gecmez.
