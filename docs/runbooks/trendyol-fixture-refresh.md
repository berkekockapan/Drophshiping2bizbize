# Trendyol Fixture Refresh Runbook

## Ne zaman yenilenmeli?
- Parser testleri aniden kırılıyorsa
- Trendyol ürün sayfası DOM yapısı değiştiyse

## Yenileme Adımları
1. Hedef sayfaların yeni HTML örneklerini alın.
2. `apps/api/tests/fixtures/trendyol/` altındaki fixture dosyalarını güncelleyin.
3. Parser unit/integration testlerini çalıştırın:
   - `npx pnpm --filter @trendyol-etsy/api test -- --run tests/unit/parseTrendyolProduct.test.ts tests/integration/addTrackedProduct.test.ts`
4. Değişiklikleri kısa notla commit edin.

## Kurallar
- Fixture'lara kişisel veri koymayın.
- En az bir "variants", bir "basic", bir "unavailable" örneği güncel kalsın.