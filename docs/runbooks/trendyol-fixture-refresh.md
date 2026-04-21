# Trendyol Fixture Refresh Runbook

## Ne zaman yenilenmeli?
- Parser testleri aniden kýrýlýyorsa
- Trendyol ürün sayfasý DOM yapýsý deðiþtiyse

## Yenileme Adýmlarý
1. Hedef sayfalarýn yeni HTML örneklerini alýn.
2. `apps/api/tests/fixtures/trendyol/` altýndaki fixture dosyalarýný güncelleyin.
3. Parser unit/integration testlerini çalýþtýrýn:
   - `npx pnpm --filter @dropshiping2bizbize/api run test -- --run tests/unit/parseTrendyolProduct.test.ts tests/integration/addTrackedProduct.test.ts`
4. Deðiþiklikleri kýsa notla commit edin.

## Kurallar
- Fixture'lara kiþisel veri koymayýn.
- En az bir "variants", bir "basic", bir "unavailable" örneði güncel kalsýn.

