# Cloudflare Data Safety Runbook

Bu runbook'un amaci Cloudflare uzerindeki verilerin silinmesini veya bozulmasini engellemektir.

## Kapsam

- Kural production, staging ve dev dahil tum Cloudflare ortamlarinda ayni sertlikte uygulanir.
- Odak veri tipi: kullanicinin ekledigi kayitlar (manuel girilen veya operasyonel akisla biriken veriler).

## Temel ilke

- Varsayilan davranis: veriyi koru, yikici islem yapma.
- Yikici bir adim gerekiyorsa once etkisi netlestirilir, sonra yalnizca gerekli ise devam edilir.

## Yikici islem sinifi

Asagidaki adimlar kullanici verisini etkileyebilir:

- SQL seviyesinde: `DELETE`, `DROP`, `TRUNCATE`, toplu `UPDATE` (geri donusu olmayan).
- Wrangler seviyesinde: reset, restore, rollback, destructive migration etkisi yaratabilecek adimlar.
- Veri tasima/seed adimlari: mevcut kayitlari ezebilecek import/reseed islemleri.

## Zorunlu onay kurali

- Yikici adim kullanici verisini etkileyebilecekse acik kullanici onayi olmadan calistirilmaz.
- Ortam tek basina karar kriteri degildir; belirleyici kriter "kullanici verisi etkilenir mi" sorusudur.
- Etki belirsizse islem durdurulur ve once etki analizi yapilir.

## Islem oncesi kontrol listesi

1. Hedef kaynagi dogrula: Worker adi, D1 adi ve `database_id`.
2. Hedef ortami dogrula: production/staging/dev ayrimini komut seviyesinde acikca yaz.
3. Planlanan komutlari "read-only" ve "write/destructive" olarak siniflandir.
4. Destructive komut varsa etki alani dokumante et:
   - Hangi tablolar/satir tipleri etkilenecek?
   - Kullanici verisi etkileniyor mu?
5. Geri donus yolunu hazirla:
   - Mumkunse mevcut bookmark bilgisini al (`d1 time-travel info`).
   - Geri donus komutunu calismadan once yazili hale getir.
6. Kullanici onayi gerekiyorsa net onay metniyle durdur:
   - "Bu adim su verileri etkileyebilir: ... Onayliyor musun?"

## Islem sonrasi kontrol listesi

1. Kritik tablolar icin satir sayisi ve ornek kayit tutarliligini kontrol et.
2. Uygulamada temel akis smoke testi yap (listeleme, detay, kaydetme).
3. Beklenmeyen fark varsa yeni yazma islemlerini durdur ve geri donus planini uygula.

## Operasyon notu

- Migrations additive tasarlanmalidir.
- Veri kaybi riski tasiyan degisiklikler tek adimda degil, asamali ve dogrulama noktali ilerletilmelidir.
- Hedef veri uzerinde emin olunamiyorsa komut calistirma; once netlestir.
