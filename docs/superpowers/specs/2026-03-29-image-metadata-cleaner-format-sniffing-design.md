# Image Metadata Cleaner Format Sniffing Design

## Goal

Yanlis uzanti ile adlandirilmis ama JPEG/PNG/WebP olarak gecerli olan gorsellerin, dosya uzantisina degil gercek binary imzasina gore temizlenmesini saglamak. Ek olarak web girisinde gorulen `/favicon.ico` 404 gurultusunu kaldirmak.

## Problem

Mevcut metadata temizleyici parser secimini yalnizca dosya uzantisindan yapiyor. Bu nedenle:

- `foto.png` adi ile gelen ama gercekte JPEG olan dosya PNG parser'ina gidiyor.
- Kullanici `PNG dosyasi beklenen baslik ile baslamiyor` benzeri hatalar goruyor.
- Temizleme basarili olsa bile cikti ZIP'e orijinal yanlis uzanti ile girerse ikinci bir kullanim hatasi olusuyor.

Ayri olarak `apps/web` icin acik bir favicon tanimi bulunmadigindan tarayici `/favicon.ico` istegi atip 404 uretiyor.

## Decision

### 1. Parser secimini gercek dosya imzasindan yap

JPEG, PNG ve WebP icin:

- once binary signature kontrolu yapilacak
- imza taniniyorsa temizleme bu gercek formata gore yapilacak
- uzanti ile icerik farkliysa islem yine devam edecek

HEIC ve AVIF icin:

- uzanti tabanli destek/engelleme davranisi korunacak
- binary sniffing yalnizca lossless desteklenen formatlar icin kullanilacak

### 2. Basarili cikti yolunu gercek formata gore duzelt

Yanlis uzantili dosya basarili temizlenirse:

- UI satirinda kaynak goreli yol korunacak
- ZIP icindeki basarili dosya yolu, gercek formata uygun uzanti ile yazilacak
- Blob MIME type'i de gercek formata gore ayarlanacak

Ornek:

- kaynak: `album/foto.png`
- gercek icerik: JPEG
- ZIP cikti yolu: `album/foto.jpg`

### 3. Hata dili daha net olsun

Uzanti destekleniyor ama binary imza taninamiyorsa:

- hata dosya bozuk ya da uzanti-icerik uyusmazligi seviyesinde acik olmali
- mevcut genel `INVALID_IMAGE_DATA` kategorisi korunabilir, ancak mesaj daha anlasilir olmali

### 4. Favicon gürültüsünü kaldır

`apps/web/index.html` icine acik bir `rel="icon"` tanimi eklenecek ve `apps/web/public/favicon.svg` olusturulacak. Bu, varsayilan `/favicon.ico` istegini ortadan kaldiracak.

## Files

- Modify: `apps/web/src/features/mediaMetadataCleaner/lib/metadataCleaner.ts`
- Modify: `apps/web/src/features/mediaMetadataCleaner/workers/metadataCleaner.worker.ts`
- Modify: `apps/web/src/features/mediaMetadataCleaner/hooks/useImageMetadataCleaner.ts`
- Modify: `apps/web/src/features/mediaMetadataCleaner/lib/pathUtils.ts`
- Modify: `apps/web/src/features/mediaMetadataCleaner/lib/zipBuilder.ts`
- Modify: `apps/web/src/features/mediaMetadataCleaner/lib/metadataCleaner.test.ts`
- Modify: `apps/web/src/features/mediaMetadataCleaner/hooks/useImageMetadataCleaner.test.tsx`
- Modify: `apps/web/index.html`
- Create: `apps/web/public/favicon.svg`

## Testing

- `metadataCleaner` unit testlerine uzanti/icerik uyusmazligi senaryolari eklenecek
- `useImageMetadataCleaner` testlerinde ZIP'e duzeltilmis cikti yolunun gittigi dogrulanacak
- ilgili web testleri calistirilacak
