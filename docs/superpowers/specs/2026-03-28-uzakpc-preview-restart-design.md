# UzakPC Tek-Tik Preview Restart Tasarimi

**Tarih:** 2026-03-28  
**Durum:** Tasarim onaylandi  
**Kapsam:** `scripts/windows`, `apps/web`, `uzakpc.md`, `docs/superpowers`

---

## 1. Amac

Bu degisikligin amaci, `C:\dropshiping-win\scripts\windows\restart-main-server.bat` calistirildiginda `uzakpc` uzerinden yayinlanan uygulamanin:

- her zaman guncel `origin/main` kodunu kullanmasini,
- baska bilgisayarlarda prod-benzeri davranis gostermesini,
- Vite dev server kaynakli worker/tarayici farklari nedeniyle kirilmamasini,
- kullaniciya tek tikla guvenilir bir uzaktan erisim linki uretmesini

saglamaktir.

Ozellikle `image-metadata-cleaner` ekraninda gorulen `module worker` / `importScripts` kaynakli hata, `uzakpc` uzerinden disariya **Vite dev server** acildigi icin olusmaktadir. Tasarimin ana hedefi, disari acilan web katmanini dev server olmaktan cikarip **build + preview** tabanli hale getirmektir.

---

## 2. Mevcut durum ve problem

Bugunku `restart-main-server.ps1` akisi su davranisa sahiptir:

- varsayilan mod `Cloud` olsa da web katmani `pnpm.cmd dev:web` ile acilir
- ngrok dogrudan `5173` portundaki Vite dev server'a baglanir
- lokal gelistirme icin faydali olan dev davranisi, uzaktan erisimde de aynen disari verilir

Bu durumun yarattigi somut problemler:

1. **Tarayiciya gore degisen worker davranisi**
   - Chromium tarafinda calisan bir module worker akisi, Firefox benzeri ortamlarda dev server uzerinden hata verebilmektedir.
   - Bu, urun kodunun bozuk oldugu anlamina gelmez; uzaktan servis edilen katman prod-benzeri olmadigi icin sorun yaratir.

2. **Uzaktan dogrulama ile lokal gelistirme modunun birbirine karismasi**
   - `uzakpc`, pratikte bir "yayin/dogrulama" makinesi gibi kullanilmaktadir.
   - Buna ragmen disari verilen katman halen HMR/dev odaklidir.

3. **"Son guncellemeler eksiksiz calisiyor mu?" sorusunun guvenilir cevaplanamamasi**
   - Dev server acik oldugunda tarayici, module worker, proxy ve cache davranislari production'a esit degildir.
   - Bu da uzaktaki kullanicilarin gordugu hatalarin gercek urun regesyonu mu, yoksa dev sunum bicimi mi oldugunu belirsizlestirir.

Temel problem, `restart-main-server.bat` aracinin bugun **tek tikla yayin makinesi** gibi kullanilmasina ragmen arka planda hala **gelistirme sunucusu** acmasidir.

---

## 3. Onaylanan urun ve operasyon kararlari

Bu tasarim icin netlesen kararlar sunlardir:

- `restart-main-server.bat` calistiginda varsayilan ve oncelikli hedef, `uzakpc` uzerinden **guvenilir uzaktan yayin** yapmak olacaktir.
- `Cloud` modda web katmani artik Vite dev server ile degil, **`build + vite preview`** ile acilacaktir.
- ngrok, dev portuna degil **preview portuna** baglanacaktir.
- build basarisizsa script devam etmeyecek; yari-calisan veya eski surum acik birakilmayacaktir.
- script sonunda aktif commit, kullanilan mod, local URL ve ngrok public URL acik sekilde loglanacaktir.
- dokumantasyon, `uzakpc` makinesinin rolunu "lokal HMR gelistirme" degil, "tek tikla uzaktan yayin" olacak sekilde netlestirecektir.

Ek kapsam karari:

- Bu iterasyonda **ana hedef `Cloud` modun uzaktan yayin kalitesini duzeltmektir.**
- `Local` mod, mevcut `wrangler dev + dev:web` mantigi ile korunacaktir; bu modun ikinci bir preview/proxy katmanina tasinmasi bu degisikligin kapsami disinda tutulacaktir.

Bu karar bilincli secilmistir; cunku `Local` modun de preview tabanli hale getirilmesi, ayri bir API yayin katmani veya tek-host reverse proxy kurgusu gerektirir ve tek tikla guvenilirlik hedefini bu iterasyonda gereksiz sekilde buyutur.

---

## 4. Degerlendirilen yaklasimlar

### Yaklasim A - Mevcut Vite dev yayini korunur, worker tarafi ayarlanir

`restart-main-server` ayni kalir; sorunlu worker akislari icin fallback veya tarayiciya ozel cozumler eklenir.

**Artilari**

- en az script degisikligi gerektirir
- HMR akisi bozulmaz

**Eksileri**

- asil problemi cozmeyip semptomu yamalar
- baska dev-only tarayici farklari devam eder
- `uzakpc` uzaktan yayin makinesi olarak guvenilir hale gelmez

Bu nedenle secilmemistir.

### Yaklasim B - Hem `Cloud` hem `Local` mod tamamen `build + preview` olur

Her iki modda da web build edilir; `Local` mod icin ayrica API'yi preview web ile ayni host altina toplamak uzere ikinci tunnel veya reverse proxy katmani eklenir.

**Artilari**

- tum modlarda prod-benzeri web davranisi verir
- uzun vadede en tutarli modeldir

**Eksileri**

- `Local` mod icin ek yayin/proxy mimarisi gerekir
- ngrok hesap/plani, cift tunnel veya ekstra reverse proxy bagimliligi dogurabilir
- tek tikla guvenilir restart hedefini bu iterasyonda gereginden fazla buyutur

Uzun vadeli aday olarak degerlidir ancak bu iterasyonda secilmemistir.

### Yaklasim C - `Cloud` mod `build + preview` olur, `Local` mod mevcut kalir (**secilen**)

Varsayilan ve fiili uzaktan yayin senaryosu olan `Cloud` mod prod-benzeri hale getirilir. `Local` mod, lokal tanilama/gelistirme amacli mevcut yapiyla korunur.

**Artilari**

- bugunu kiran problemi dogrudan cozer
- tek tikla uzaktan yayin akisini sade sekilde guvenilir yapar
- `Local` modun ek mimari karmasikligi bu iterasyona tasinmaz
- implementasyon riski dusuktur

**Eksileri**

- iki mod arasinda web baslatma davranisi farkli kalir
- `Local` mod hala dev sunucu mantigina dayanir

Bu iterasyon icin secilen yaklasim budur.

---

## 5. Secilen tasarim

### 5.1 Yeni calisma matrisi

| Mod | API kaynagi | Web calisma bicimi | Disariya acilan port | Dis kullanici icin hedef |
| --- | --- | --- | --- | --- |
| Cloud | Cloud Worker (`VITE_API_BASE_URL`) | `build + vite preview` | `4174` | Varsayilan uzaktan yayin |
| Local | Lokal `wrangler dev` | Mevcut `dev:web` | `5173` | Lokal tanilama / gelistirme |

Bu tabloyla `Cloud` mod artik "demo, paylasim, uzaktan test" modu; `Local` mod ise "lokal API ile bakim/gelistirme" modu olarak netlesir.

### 5.2 `Cloud` mod yeni baslatma akisi

`restart-main-server.ps1` icinde `Cloud` mod akisi su siraya getirilecektir:

1. eski `node/ngrok/caddy` sureclerini kapat
2. repo yolunu dogrula ve `main` dalini `origin/main` ile zorla senkronla
3. `pnpm install` calistir
4. cloud API base URL'yi cozumle
5. cloud API health kontrolu yap
6. web build al:
   - `VITE_API_BASE_URL=<cloud-url>` ile
   - `pnpm --filter @trendyol-etsy/web build`
7. preview baslat:
   - `pnpm --filter @trendyol-etsy/web exec vite preview --host 0.0.0.0 --port 4174`
8. `http://127.0.0.1:4174` icin health kontrolu yap
9. ngrok'u `4174` portuna bagla
10. ngrok public URL'yi yazdir

Bu akisla uzaktan kullaniciya giden katman:

- `@vite/client`
- `/src/main.tsx`
- HMR baglantisi
- dev-time worker donusumleri

yerine build edilmis `dist` cikti olur.

### 5.3 `Local` mod davranisi

`Local` mod bu iterasyonda davranis degistirmeyecektir:

1. lokal API (`wrangler dev --port 8787`) acilir
2. web `pnpm.cmd dev:web` ile acilir
3. ngrok `5173` portuna baglanir

Ancak log ve dokumantasyonda su ayrim acikca belirtilecektir:

- `Cloud` mod: uzaktan yayin ve paylasim icin onerilen mod
- `Local` mod: lokal API ile tanilama icin korunmus mod

Boylece kullanici, tarayici-uyum veya worker-dogrulama icin hangi modu secmesi gerektigini acikca gorecektir.

### 5.4 Port ve komut sozlesmesi

Yeni sabitler:

- preview web portu: `4174`
- dev web portu: `5173` (degismiyor)
- lokal API portu: `8787` (degismiyor)

Yeni `Cloud` web komutu:

```cmd
set "VITE_API_BASE_URL=<cloud-url>" && pnpm.cmd --filter @trendyol-etsy/web build && pnpm.cmd --filter @trendyol-etsy/web exec vite preview --host 0.0.0.0 --port 4174
```

Build ve preview'nin ayni pencere/komut zincirinde kalmasi, yayinlanan preview'un hangi build ile acildigini belirginlestirir.

### 5.5 Script sorumluluk sinirlari

Bu degisiklikten sonra `restart-main-server.ps1` su sorumluluklara sahip olacaktir:

- yayina cikmadan once kodu zorla guncellemek
- gerekli bagimliliklari yuklemek
- secilen moda gore API'yi dogru kaynaga baglamak
- uzaktan erisim icin uygun web katmanini acmak
- hazir olmayan durumda fail etmek
- son durumda kullaniciya hangi commit'in acik oldugunu gostermek

Scriptin **olmayan** sorumluluklari:

- `Local` mod icin ek cift-tunnel/reverse-proxy mimarisi kurmak
- Windows servis yonetimi yapmak
- ngrok hesap/plani ile ilgili limitleri yonetmek

---

## 6. Veri ve kontrol akisi

### 6.1 `Cloud` mod veri akisi

1. kullanici `restart-main-server.bat` calistirir
2. PowerShell scripti repo'yu `origin/main` ile esitler
3. script cloud API URL'yi cozumler
4. web build, bu URL'yi `VITE_API_BASE_URL` olarak bake eder
5. preview `dist` cikisini servis eder
6. ngrok preview portunu disariya acar
7. uzak tarayici butun API isteklerini relative degil, build-time enjekte edilen cloud URL'ye gonderir

Bu akista artik dev proxy veya dev worker donusumu bulunmaz.

### 6.2 `Local` mod kontrol akisi

1. lokal API ayaga kalkar
2. Vite dev server mevcut proxy mantigiyla web'i servis eder
3. ngrok dev portunu disariya acar

Bu akis korunur; fakat uzaktan prod-benzeri dogrulama beklentisi `Cloud` moda tasinir.

---

## 7. Hata yonetimi

Asagidaki durumlarda script devam etmeyecek ve acik hata vererek sonlanacaktir:

- `git fetch`, `git checkout`, `git reset --hard` veya `git clean` basarisizsa
- `pnpm install` basarisizsa
- `Cloud` modda API health kontrolu basarisizsa
- web build basarisizsa
- preview beklenen surede ayaga kalkmazsa
- ngrok public URL alinamazsa
- `Local` modda API veya web saglik kontrolu basarisizsa

Fail-fast kuralinin hedefi:

- eski surumu sessizce acik birakmamak
- yari-hazir yayini "calisti" gibi gostermemek
- uzaktaki kullaniciya yalanci yesil durum gostermemek

---

## 8. Test ve dogrulama stratejisi

### 8.1 Script-seviyesi dogrulama

`Cloud` mod restart sonrasi:

- `git rev-parse --short HEAD` ve `origin/main` eslesmeli
- `apps/web/dist` taze build ile uretilmeli
- `http://127.0.0.1:4174` 200 donmeli
- ngrok public URL alinmali

`Local` mod restart sonrasi:

- `http://127.0.0.1:8787/health` 200 donmeli
- `http://127.0.0.1:5173` 200 donmeli
- ngrok public URL alinmali

### 8.2 Uygulama-seviyesi dogrulama

`Cloud` mod ngrok URL'si uzerinden su akislar manuel dogrulanacaktir:

- ana ekran aciliyor
- ayarlar sayfasi aciliyor
- `settings/image-metadata-cleaner` aciliyor
- PNG metadata temizleme basarili tamamlaniyor
- ZIP indirme akisi bozulmuyor

### 8.3 Regresyon odaklari

- `VITE_API_BASE_URL` build asamasinda dogru bake ediliyor mu
- preview altinda tum route'lar aciliyor mu
- cloud API'ye giden fetch'lerde CORS veya URL bozulmasi var mi
- script log'lari yeni port/URL'leri tutarli sekilde yaziyor mu

---

## 9. Dokumantasyon guncellemeleri

`uzakpc.md` su sekilde guncellenecektir:

- yayin modeli anlatiminda `Cloud` modun preview tabanli oldugu acik yazilacak
- `Cloud` mod local URL'si `http://127.0.0.1:4174` olarak duzeltilecek
- "uzaktan dogrulama icin onerilen mod" bilgisi eklenecek
- `Local` modun lokal tanilama amacli korundugu not edilecek

Gerekirse script sonu terminal ciktilari da ayni ayrimi tekrar edecektir.

---

## 10. Kapsam disi kalanlar

Bu tasarim asagidakileri bu iterasyona dahil etmez:

- `Local` mod icin build + preview + tek-host reverse proxy mimarisi
- ngrok uzerinde cift tunnel veya reserved domain standardizasyonu
- `restart-main-server` icine branch secimi veya coklu yayin profili eklenmesi
- Windows service / Task Scheduler tabanli kalici daemon yonetimi

Bu alanlar ancak `Local` modun da uzaktan prod-benzeri yayina donusturulmesi ihtiyaci netlesirse sonraki iterasyonda ele alinacaktir.

---

## 11. Nihai karar ozeti

Bu iterasyonda uygulanacak karar sunudur:

- `restart-main-server.bat` varsayilan `Cloud` akista web'i artik **Vite dev server ile degil, `build + vite preview` ile** acacak
- ngrok **5173** yerine **4174** preview portuna baglanacak
- script yari-hazir durumlara dusmeyecek, build/health basarisizsa fail edecek
- `Local` mod mevcut dev-web akisi ile korunacak, fakat uzaktan dogrulama icin onerilen yol olmayacak

Bu tasarim, `uzakpc`'yi "gelistirme sunucusunu disariya acan makine" olmaktan cikarip "tek tikla guncel ve prod-benzeri yayin yapan makine" haline getirir.

