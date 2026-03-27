# Image metadata cleaner QA checklist

1. `/settings` ekraninda **Gorsel metadata temizleme** karti gorunuyor.
2. `/settings/image-metadata-cleaner` sayfasi aciliyor.
3. Klasor drop ile alt klasor yolu korunuyor.
4. Karisik batch'te basarili dosyalar kok klasorde, basarisizlar `hatali/` altinda.
5. `islem-raporu.json` ZIP icinde uretiliyor.
6. Iptal edilen kuyruk girdileri `cancelled` olarak isaretleniyor.
7. 50-60 dosyada UI etkilesimi (scroll, buton tiklama) donmadan devam ediyor.
