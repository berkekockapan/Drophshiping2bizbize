# Tracking Favoriler, Kalici Silme ve JPG Indirme Tasarimi

**Tarih:** 2026-03-21  
**Durum:** Tasarim onaylandi, planlama oncesi kullanici review bekleniyor  
**Kapsam:** Takip edilen urunlerde favori durumu, kalici silme ve urun detayindan tek tik JPG indirme

---

## 1. Amac

Bu degisikligin amaci, takip merkezindeki urunlerin daha yonetilebilir hale gelmesidir. Kullanici:

- takip ettigi urunleri kalici olarak silebilmelidir
- belirli urunleri favoriye alabilmelidir
- sadece favori urunleri gorebildigi ayri bir gorunum kullanabilmelidir
- urun detayinda secili gorseli tek tikla JPG olarak indirebilmelidir

Bu kapsam, mevcut takip akisinin ustune yonetim aksiyonlari ekler; yeni bir urun tipi, yeni bir senkronizasyon modeli veya toplu islem sistemi hedeflemez.

---

## 2. Onaylanan urun kararlari

- Urun silme davranisi **kalici silme** olacaktir.
- Favoriler, ana listeyi degistirmeyen ayri bir **Favoriler** gorunumunde sunulacaktir.
- Ana `Tum Urunler` listesi mevcut mantigiyla calismaya devam edecektir.
- Gorsel indirme yalnizca **urun detay ekraninda** sunulacaktir.
- Indirme aksiyonu, o anda galeride secili olan tek gorsel icin calisacaktir.
- `Tum gorselleri indir`, arsivleme, geri alma veya cop kutusu bu kapsamda yoktur.

---

## 3. Mevcut durum

Mevcut kod tabaninda bu degisiklik icin yararlanilabilecek altyapi zaten bulunmaktadir:

- tracking list API urun kartlari icin ozet veri donmektedir
- urun detay API urun gorsellerini `product.images` olarak donmektedir
- web arayuzunde tracking kartlari ve urun detay galerisi zaten vardir
- urun kaydi, varyasyonlar, current state, history ve notification verileri farkli tablolarda tutulmaktadir

Eksik olanlar ise sunlardir:

- urun bazli kalici favori alani
- favori gorunumu icin filtreleme / listeleme akisi
- kalici silme endpointi ve buna bagli tum kayitlari temizleyen servis akisi
- secili gorseli indirilebilir JPG cikisina ceviren bir endpoint
- kart ve detay ekranlarinda bu aksiyonlari tetikleyen arayuz kontrolleri

Bu nedenle ihtiyac, yeni bir modulu sifirdan kurmaktan cok, mevcut takip ve detay akisini yonetim eylemleriyle genisletmektir.

---

## 4. Secilen yaklasim

Uc aday arasindan secilen yaklasim sudur:

- favori durumu sunucuda kalici olarak saklanacaktir
- silme islemi backend tarafinda kontrollu olarak yapilacaktir
- JPG indirme akisi backend uzerinden saglanacaktir

Bu secim su nedenlerle uygun gorulmustur:

- favoriler cihaz veya tarayici degistiginde kaybolmaz
- `Favoriler` gorunumu API seviyesinde net bicimde desteklenir
- silme davranisi tek bir servis akisi icinde yonetilir ve yari silinmis durum riski azaltilir
- gorsel indirme, tarayici CORS sinirlarina takilmadan ve istemci tarafinda dusuk kaliteli yeniden encode akisina mahkum kalmadan calisir

Bu kapsam icin daha buyuk bir "aksiyon merkezi" soyutlamasi secilmemistir; cunku istek dogrudan uc somut davranisa odaklidir ve daha genis bir ortak action sistemi bu iterasyonda gereksiz buyume yaratir.

---

## 5. Veri modeli ve kalici durum

### 5.1 Products tablosu

`products` tablosuna yeni bir boolean alan eklenir:

- `is_favorite`

Kurallar:

- varsayilan deger `false` olur
- urun favoriye alindiginda `true`, favoriden cikarildiginda `false` olur
- tek kullanicili MVP varsayimi nedeniyle ayri bir `favorites` join tablosu hedeflenmez

Bu secim, mevcut urun modeline en kucuk degisiklikle istenen davranisi ekler.

### 5.2 Silme kapsamı

Kalici silme isleminde urunle iliskili asagidaki kayitlar temizlenmelidir:

- `product_variants`
- `product_current_state`
- `price_history`
- `stock_history`
- `notifications`
- `etsy_drafts`
- en son `products`

Mevcut semada database-level cascade guvencesi bulunmadigi icin, silme akisi uygulama katmaninda kontrollu sirayla calistirilacaktir.

### 5.3 Listeleme ve filtreleme

Tracking list yanitina urun bazli su alan eklenir:

- `isFavorite: boolean`

Listeleme kurallari:

- `Tum Urunler` gorunumu tum kayitlari doner
- `Favoriler` gorunumu yalnizca `isFavorite = true` kayitlari doner
- siralama mantigi iki gorunumde de ayni kalir; bu kapsamda yeni bir manuel siralama kontrolu eklenmez

---

## 6. API ve backend tasarimi

### 6.1 Tracking list endpointi

Mevcut `GET /tracking/products` akisi, favori filtrelemesini destekleyecek sekilde genisletilir.

Onerilen davranis:

- `favorite=true` verildiginde yalnizca favori urunler doner
- parametre verilmezse mevcut tum urun listesi doner

Yanit ogesi:

- mevcut kart alanlari korunur
- `isFavorite` alani eklenir

### 6.2 Favori toggle endpointi

Urunun favori durumunu degistiren ayri bir endpoint eklenir.

Onerilen sozlesme:

- `POST /tracking/products/:productId/favorite`
- body icinde hedef durum veya toggle niyeti tasinabilir

Tercih:

- hedef durumun acik gonderilmesi (`isFavorite: true/false`) daha guvenlidir
- boylece istemci ile sunucu arasinda tekrar denemelerde yanlis toggle riski azalir

Yanitta en azindan su bilgi donmelidir:

- `productId`
- `isFavorite`

Istenirse guncel kart ozetinin tamamini donmek de mumkundur; ancak planlama acisindan zorunlu degildir.

### 6.3 Kalici silme endpointi

Urunu kalici silen ayri bir endpoint eklenir.

Onerilen sozlesme:

- `DELETE /tracking/products/:productId`

Davranis:

1. ilgili urunun varligi dogrulanir
2. bagli kayitlar kontrollu sirayla silinir
3. urun kaydi silinir
4. basariliysa `204 No Content` veya sade bir basari yaniti doner

### 6.4 JPG indirme endpointi

Urun detay ekranindaki secili gorsel icin backend uzerinden indirme saglanir.

Onerilen sozlesme:

- `GET /products/:productId/images/download?url=<encoded-image-url>`

Davranis:

1. gelen URL'in ilgili urunun bilinen gorsellerinden biri olup olmadigi dogrulanir
2. uzak gorsel backend tarafinda fetch edilir
3. gorsel JPG cikisina hazirlanir
4. uygun dosya adi ve `Content-Disposition: attachment` ile binary donulur

Guvenlik ve sinirlar:

- keyfi herhangi bir URL indirilemez; yalnizca o urune ait bilinen gorseller kabul edilir
- dosya adi urun basligindan turetilir
- gecersiz veya urune ait olmayan URL istekleri reddedilir

### 6.5 JPG kalite yorumu

Kullanici beklentisi "goruntu kaybi yasamadan JPG indirme" olarak ifade edilmistir. Teknik olarak JPG formatinin dogasi kayipsiz degildir. Bu nedenle tasarim su yorumu benimser:

- kaynak gorsel zaten JPG ise gereksiz yeniden encode yapilmamasi tercih edilir
- donusum gerekiyorsa boyut korunur ve en yuksek kalite ayari kullanilir
- hedef, gozle fark edilir kalite kaybi olusturmayan bir indirime deneyimidir

Bu yorum, istenen urun deneyimini pratikte saglar ve planlama asamasinda yanlis bir "tam kayipsiz JPG" beklentisi olusmasini engeller.

Mevcut backend Cloudflare Worker oldugu icin, planlama asamasinda Worker tarafindaki resmi image transformation/JPEG output yetenekleri temel alinabilir.

---

## 7. Arayuz tasarimi

### 7.1 Tracking Center

Tracking ekranina ust seviye iki gorunum eklenir:

- `Tum Urunler`
- `Favoriler`

Bu gorunumler ayni sayfa icinde sekme/segment kontrolu olarak ele alinabilir. Yeni route zorunlu degildir.

Davranis:

- `Tum Urunler` mevcut kart akisini korur
- `Favoriler` yalnizca favori urunleri listeler
- favori listesi bossa acik bir bos durum mesaji gosterilir

### 7.2 ProductCard aksiyonlari

Her kartta iki yeni aksiyon bulunur:

- `Favoriye ekle` / `Favoriden cikar`
- `Sil`

Kurallar:

- favori aksiyonu aninda gorunur durum degistirir, basarisiz olursa onceki duruma geri doner
- silme aksiyonu tek tikla hemen calismaz; kullanicidan kisa bir onay ister
- silme basariliysa urun aktif gorunumden kalkar ve sayaclar guncellenir

Kartin geri kalan davranisi korunur:

- gorsel ve baslik detay sayfasina goturur
- fiyat/stok kutulari bilgi amaclidir

### 7.3 Favoriler gorunumu

`Favoriler` bolumu, ana listenin ikinci bir kopyasi gibi degil, ayni kart bilesenlerini kullanan filtrelenmis bir gorunum olmalidir.

Bu tercih:

- UI tekrarini azaltir
- test sayisini kontrol altinda tutar
- ileride arama veya ekstra filtreler eklenirse iki liste arasinda davranis tutarliligi saglar

### 7.4 Urun detay ekraninda JPG indir

`ProductImageGallery` veya ona komsu ozet alaninda bir `JPG indir` butonu bulunur.

Davranis:

- buton her zaman secili ana gorsel icin calisir
- kullanici galeri icinden baska bir gorsel secerse indirme hedefi de otomatik guncellenir
- hic gorsel yoksa buton gosterilmez
- indirme baslayinca kullaniciya bekleme geri bildirimi verilir

Bu akis, kullanicinin "once sec, sonra indir" modelini ogrenmesini kolaylastirir.

---

## 8. Hata yonetimi ve fallback davranislari

### 8.1 Favori aksiyonu

- API hatasi durumunda UI optimistic guncelleme geri alinabilir
- kullaniciya kisa bir hata mesaji gosterilir
- kart tamamen yeniden yuklenmeden sadece ilgili urun durumu duzeltilir

### 8.2 Kalici silme

- urun bulunamazsa anlamli bir hata donulur
- alt kayitlardan biri temizlenemezse islem basarisiz sayilir
- yari silinmis durum birakmamak icin silme sirasi kontrollu bicimde yonetilir

### 8.3 JPG indirme

Asagidaki durumlar desteklenmelidir:

- secili gorsel URL'i gecersiz
- uzak gorsel fetch edilemedi
- gorsel donusumu basarisiz oldu
- urune ait olmayan bir URL ile indirme denendi

Bu durumlarda kullaniciya tek ve sade bir hata gosterilir:

- `Gorsel indirilemedi.`

Gerekirse log tarafinda daha detayli teknik nedenler tutulabilir; fakat UI mesaji sade kalmalidir.

---

## 9. Test stratejisi

### 9.1 API / entegrasyon testleri

Asagidaki senaryolar kapsanmalidir:

- tracking list yaniti `isFavorite` doner
- `favorite=true` ile sadece favori urunler listelenir
- favori endpointi urunun durumunu gunceller
- silme endpointi bagli kayitlari da temizler
- urun detay gorsellerinden biri icin indirme endpointi `image/jpeg` doner
- urune ait olmayan URL ile indirme reddedilir

### 9.2 Web bilesen testleri

Asagidaki davranislar dogrulanmalidir:

- kartta favori ve sil aksiyonlari gorunur
- `Tum Urunler` ile `Favoriler` gorunumleri arasinda gecis yapilabilir
- favori urunler `Favoriler` gorunumunde listelenir
- favori listesi bos oldugunda bos durum gorunur
- detay sayfasinda secili gorsele gore `JPG indir` aksiyonu degisir
- gorsel yoksa indirme butonu gosterilmez

### 9.3 E2E temel akis

Ana kullanici akisi su sekilde dogrulanmalidir:

1. kullanici urun ekler
2. urunu favoriye alir
3. `Favoriler` gorunumune gecip urunu gorur
4. detay ekranina gider
5. farkli bir gorsel secer ve `JPG indir` ile indirme baslatir
6. urunu siler ve listeden kalktigini gorur

---

## 10. Kapsam disi

Bu calisma asagidakileri kapsamaz:

- arsive alma veya geri yukleme
- cop kutusu
- toplu silme / toplu favorileme
- `Tum gorselleri indir`
- favorileri elle yeniden siralama
- farkli formatlarda indirme (`png`, `webp`, `zip`)
- gorsel cache veya CDN katmani

Bu kararlar, kapsamı tek bir plan dokumaniyla uygulanabilir buyuklukte tutmak icin alinmistir.

---

## 11. Planlamaya hazir uygulama basliklari

Bu tasarimin uygulanmasi muhtemelen su is paketlerine ayrilacaktir:

1. veritabani ve repo degisiklikleri (`is_favorite`, silme akisi)
2. tracking API genisletmeleri (liste filtreleme, favori toggle, silme)
3. detay API genisletmesi (JPG indirme endpointi)
4. web tracking ekraninda sekme ve kart aksiyonlari
5. web detay ekraninda secili gorsel icin indirme deneyimi
6. testlerin guncellenmesi

Bu kapsam, tek bir implementasyon planinda ele alinabilecek kadar odakli ve mevcut mimariyle uyumludur.
