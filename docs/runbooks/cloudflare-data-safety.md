# Cloudflare Data Safety Runbook

Bu runbook'un amacı Cloudflare üzerindeki verilerin silinmesini veya bozulmasını engellemektir.

## Kapsam

- Kural production, staging ve dev dahil tüm Cloudflare ortamlarında aynı sertlikte uygulanır.
- Odak veri tipi: kullanıcının eklediği kayıtlar (manuel girilen veya operasyonel akışla biriken veriler).
- `dropshiping2bizbize` için hedef hesap `berkekockapan3535@gmail.com` / `102eaec87235c67e6d7524d859bd92dd` olsa da aynı veri koruma kuralı tüm hesaplarda geçerlidir.

## Temel ilke

- Varsayılan davranış: veriyi koru, yıkıcı işlem yapma.
- Yıkıcı bir adım gerekiyorsa önce etkisi netleştirilir, sonra yalnızca gerekli ise devam edilir.

## Yıkıcı işlem sınıfı

Aşağıdaki adımlar kullanıcı verisini etkileyebilir:

- SQL seviyesinde: `DELETE`, `DROP`, `TRUNCATE`, toplu `UPDATE` (geri dönüşü olmayan).
- Wrangler seviyesinde: reset, restore, rollback, destructive migration etkisi yaratabilecek adımlar.
- Veri taşıma/seed adımları: mevcut kayıtları ezebilecek import/reseed işlemleri.

## Zorunlu onay kuralı

- Yıkıcı adım kullanıcı verisini etkileyebilecekse açık kullanıcı onayı olmadan çalıştırılmaz.
- Ortam tek başına karar kriteri değildir; belirleyici kriter `kullanıcı verisi etkilenir mi` sorusudur.
- Etki belirsizse işlem durdurulur ve önce etki analizi yapılır.

## İşlem öncesi kontrol listesi

1. Hedef hesabı doğrula: email ve `account_id` doğru mu?
2. Hedef kaynağı doğrula: worker adı, D1 adı, queue adı ve `database_id`.
3. Hedef ortamı doğrula: production/staging/dev ayrımını komut seviyesinde açıkça yaz.
4. Planlanan komutları `read-only` ve `write/destructive` olarak sınıflandır.
5. Destructive komut varsa etki alanını dokümante et:
   - Hangi tablolar/satır tipleri etkilenecek?
   - Kullanıcı verisi etkileniyor mu?
6. Geri dönüş yolunu hazırla:
   - Mümkünse mevcut bookmark bilgisini al (`d1 time-travel info`).
   - Geri dönüş komutunu çalışmadan önce yazılı hale getir.
7. Kullanıcı onayı gerekiyorsa net onay metniyle durdur:
   - `Bu adım şu verileri etkileyebilir: ... Onaylıyor musun?`

## İşlem sonrası kontrol listesi

1. Kritik tablolar için satır sayısı ve örnek kayıt tutarlılığını kontrol et.
2. Uygulamada temel akış smoke testi yap (listeleme, detay, kaydetme).
3. Beklenmeyen fark varsa yeni yazma işlemlerini durdur ve geri dönüş planını uygula.

## Operasyon notu

- Migrations additive tasarlanmalıdır.
- Veri kaybı riski taşıyan değişiklikler tek adımda değil, aşamalı ve doğrulama noktalı ilerletilmelidir.
- Hedef veri üzerinde emin olunamıyorsa komut çalıştırma; önce netleştir.
- `dropshiping-win` ve `dropshiping2bizbize` kaynakları birbirinin yerine kullanılamaz; hesap karışıklığı bir veri güvenliği riskidir.
