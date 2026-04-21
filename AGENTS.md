# Proje Kurallari

## Dil

- Bu proje uzerinde calisirken kullaniciya verilen tum dogal dil ciktilari Turkce olmalidir.
- Buna aciklamalar, planlar, durum guncellemeleri, inceleme notlari, ozetler ve benzeri tum asistan/ajan mesajlari dahildir.
- Kod, terminal komutlari, dosya yollari, API alan adlari, kutuphane isimleri ve diger teknik sabitler gerektiginde ozgun halleriyle birakilabilir; bunlar disindaki anlatim dili Turkce olmalidir.

## UI Tasarim Referansi

- `tasarim.md`, bu repodaki UI gelistirmeleri icin temel referans dokumandir.
- UI ile ilgili her degisiklikte once `tasarim.md` okunmali, kararlar bu belgeye gore alinmalidir.
- Yeni bir UI paterni eklenecekse veya mevcut tasarim dilinden sapma gerekiyorsa, kod degisikligiyle birlikte `tasarim.md` de guncellenmelidir.

## Cloudflare Veri Guvenligi

- Cloudflare uzerindeki verilerin silinmesi veya bozulmasi kabul edilemez; veri koruma birinci onceliktir.
- Bu koruma sertligi production, staging ve dev dahil tum ortamlarda ayni sekilde uygulanir.
- "Kullanici verisi" (kullanicinin ekledigi kayitlar) uzerinde etkisi olabilecek yikici islemler (ornek: `DELETE`, `DROP`, `TRUNCATE`, reset, rollback, time-travel restore, destructive migration) acik kullanici onayi olmadan calistirilamaz.
- Hedef verinin kullanici verisi olup olmadigi net degilse, varsayilan davranis "kullanici verisi vardir" kabuludur ve yikici islem durdurulur.
- Gelistirme akisinda varsayilan strateji ekleyici/geri alinabilir degisikliklerdir; veri kaybina yol acabilecek kisayollar kullanilmaz.
- Uygulama adimlari icin: `docs/runbooks/cloudflare-data-safety.md`.
