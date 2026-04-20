# Windows VPS Tek-Tik Sifirdan Kurulum ve Baslatma Tasarimi

**Tarih:** 2026-04-20  
**Durum:** Tasarim onaylandi, planlama oncesi kullanici review bekleniyor  
**Kapsam:** `scripts/windows`, launcher paket dosyalari, operasyon dokumantasyonu

---

## 1. Amac

Bu tasarimin amaci, Windows tabanli bir sanal sunucuda projenin:

- sifirdan kurulabilmesini,
- private GitHub repodan otomatik cekilebilmesini,
- gerekli araclar ve bagimliliklarin otomatik hazirlanabilmesini,
- tek tikla `connector + api + web + ngrok` olarak acilabilmesini,
- tek tikla durdurulup guncel kodla yeniden baslatilabilmesini

saglamaktir.

Hedef kullanici deneyimi sunlardir:

1. Sunucuda `install-and-start.bat` cift tiklanir.
2. Script gerekli eksikleri kurar ve sistemi ayaga kaldirir.
3. `ngrok` public URL loglanir.
4. Kullanici baska cihazdan internet uzerinden bu URL ile sisteme erisir.
5. Kod guncellendiginde once `stop-server.bat`, sonra tekrar `install-and-start.bat` calistirilir.

Bu degisiklik, proje kodunu degil; proje etrafinda calisan Windows VPS operasyon katmanini urunlestirmeyi hedefler.

---

## 2. Onaylanan urun ve operasyon kararlari

Kullanici tarafindan netlestirilen kararlar sunlardir:

- kurulum senaryosu sifirdan baslayacaktir
- sunucuda `Administrator` yetkisi bulunacaktir
- dis erisim icin kalici domain yerine ilk iterasyonda `ngrok` kullanilacaktir
- sistem sadece `web + api` degil, `connector + api + web` birlikte calisacak sekilde acilacaktir
- repo private GitHub repo olacak ve erisim bilgileri config dosyasindan okunacaktir
- script kullaniciya soru sormayacak; merkezi config ile calisacaktir
- kurulum ve baslatma tek tikla yapilacaktir
- durdurma icin ayri bir `bat` dosyasi bulunacaktir
- guncelleme akisi "durdur -> tekrar baslat -> guncel kodla ac" mantiginda isleyecektir

Kapsam disi kalanlar:

- kalici domain / reverse proxy / SSL kurgu tasarimi
- Linux servislesme veya systemd benzeri altyapi
- Docker tabanli ikinci bir calisma yolu
- uygulama icindeki islevsel buglari script ile otomatik "kod duzeltme"

---

## 3. Mevcut durum ve problem

Repoda bugun iki farkli Windows odakli baslatma mantigi vardir:

- `scripts/windows/start-dev.ps1`
- `scripts/windows/restart-main-server.ps1`

Bu scriptler belirli gelistirme ve uzak preview ihtiyaclarini karsilasa da, sifirdan bir Windows VPS makinesinde su beklentileri tek paket halinde karsilamaz:

- araclari otomatik kurma
- private repo erisimi
- merkezi config'ten `.env` uretme
- operasyonel hatalari toparlama
- tek tikla tam kurulum
- ayri bir "tek tikla durdur" akisi

Ek kritik tespit:

- `connector` Playwright tarayicisini `headless: false` ile acmaktadir
- bu nedenle klasik, tam arka planli Windows service mantigi yerine kullanici oturumunda kontrollu surec yonetimi daha uygundur
- yani hedef sistem "gorunmez servis" degil, "tek tikla guvenilir launcher" olmaktadir

Temel problem su sekilde ozetlenebilir:

Bugunku scriptler gelistirme ve kismi restart ihtiyaclarini karsiliyor, ancak sifirdan Windows VPS kurulumu ve tekrarli operasyon icin yeterince paketlenmis, kendi kendini toparlayan bir launcher sistemi sunmuyor.

---

## 4. Degerlendirilen yaklasimlar

### Yaklasim A - BAT + PowerShell tabanli launcher paketi (**secilen**)

Sunucuda repo disinda duran bir launcher klasoru olusturulur. `bat` dosyalari kullanici giris noktasi olur, asil operasyon mantigi PowerShell scriptlerinde toplanir.

**Artilari**

- mevcut Windows script yapisiyla uyumludur
- tek tik deneyimi saglamak icin yeterince esnektir
- loglama, retry, health check ve pid takibi icin uygun zemindir
- proje kodundan operasyon katmanini kismen ayirir

**Eksileri**

- tam Windows service duzeni kadar gorunmez degildir
- pencere ve surec mantigi kontrollu sekilde yonetilmelidir

### Yaklasim B - NSSM / PM2 ile servislesme

`connector`, `api`, `web` surecleri bir servis yoneticisi uzerinden ayakta tutulur.

**Artilari**

- teorik olarak servis yonetimi daha merkezi olur
- yeniden baslatma politikasi servis katmanina tasinabilir

**Eksileri**

- `connector` tarafinin gorunur tarayici ihtiyaci nedeniyle risklidir
- Windows service oturumu ile kullanici oturumu ayrimi sorun cikarabilir
- ilk iterasyon icin gereksiz operasyon karmasikligi getirir

### Yaklasim C - Docker tabanli VPS paketi

Tum yigin konteynerlestirilir ve launcher sadece Docker orkestrasyonu yapar.

**Artilari**

- bagimlilik izolasyonu gucludur
- uzun vadede dagitim standardizasyonu saglayabilir

**Eksileri**

- Windows VPS ve gorunur Playwright tarayicisi kombinasyonunda maliyetlidir
- ilk kurulum ve hata ayiklama daha karmasik olur
- mevcut proje dogrudan bu modele hazir degildir

Secilen yaklasim: **Yaklasim A**.

---

## 5. Secilen tasarim

### 5.1 Genel yapi

Sistem iki katmana ayrilacaktir:

1. `Launcher` katmani
   Windows VPS uzerinde repo disinda duran `bat` ve `ps1` dosyalari. Kurulum, guncelleme, loglama, env uretimi, process temizligi ve health check burada toplanir.

2. `App runtime` katmani
   Private repodan cekilen uygulama kodu ve bunun calistirdigi `connector`, `api`, `web`, `ngrok` surecleri.

Bu ayrim, operasyon kodunu uygulama kodundan kontrollu sekilde ayirir ve repo guncellense bile launcher mantiginin ayri korunmasini saglar.

### 5.2 Onerilen dosya yapisi

Launcher klasoru icin onerilen duzen:

- `C:\dropshiping-launcher\install-and-start.bat`
- `C:\dropshiping-launcher\stop-server.bat`
- `C:\dropshiping-launcher\server-config.json`
- `C:\dropshiping-launcher\scripts\bootstrap-vps.ps1`
- `C:\dropshiping-launcher\scripts\start-vps.ps1`
- `C:\dropshiping-launcher\scripts\stop-vps.ps1`
- `C:\dropshiping-launcher\scripts\shared.ps1`
- `C:\dropshiping-launcher\.state\logs\`
- `C:\dropshiping-launcher\.state\pids\`
- `C:\dropshiping-launcher\.state\runtime\`

Repo varsayilan olarak ayri bir klasore cekilecektir:

- `C:\dropshiping-app\`

Repo yolu config ile degistirilebilir olacaktir.

### 5.3 Giris noktalari

#### `install-and-start.bat`

Tek ana giris noktasi budur. Su zinciri baslatir:

1. PowerShell icin uygun policy ile `bootstrap-vps.ps1` cagirir
2. gerekli araclarin varligini dogrular, eksikleri kurar
3. repo clone veya guncelleme yapar
4. env dosyalarini uretir
5. bagimlilik kurulumunu yapar
6. eski surecleri kapatir
7. `connector + api + web + ngrok` baslatir
8. health check ve public URL loglar

#### `stop-server.bat`

Tek durdurma giris noktasi budur. Su isleri yapar:

1. kayitli PID dosyalarini okur
2. ilgili surecleri kapatir
3. pencere basliklariyla eslesen surecleri ek olarak temizler
4. `ngrok` ve iliskili `node` sureclerini guvenli sekilde sonlandirir
5. pid kayitlarini siler

---

## 6. Merkezi config tasarimi

### 6.1 Neden merkezi config

Kullanici akisi "tek tikla, soru sormadan" calismalidir. Bu nedenle tum degiskenler merkezi bir config dosyasinda tutulacaktir. Script eksik bir degisken icin interaktif soru sormayacak; config'e bakacak ve eksikse hatayi net loglayacaktir.

### 6.2 Onerilen config alanlari

`server-config.json` icin onerilen yuksek seviye alanlar:

- `repo.url`
- `repo.branch`
- `repo.githubUsername`
- `repo.githubToken`
- `paths.installRoot`
- `paths.repoDir`
- `paths.ngrokDir`
- `ngrok.authToken`
- `startup.autoOpenBrowser`
- `startup.retryCount`
- `startup.healthTimeoutSeconds`
- `app.connectorEnv`
- `app.apiEnv`
- `app.webEnv`

### 6.3 Config'ten uretilen dosyalar

Launcher, config degerlerinden uygulama tarafinda gerekli runtime dosyalarini uretecektir:

- `apps/connector/.env`
- gerekiyorsa `apps/web/.env.local`
- gerekiyorsa oturum seviyesi environment variable atamalari

Uretim mantigi idempotent olacaktir; yani script tekrar calistiginda dosyalar tutarli sekilde yeniden yazilabilecek veya kontrollu guncellenecektir.

### 6.4 Gizli bilgi yonetimi

Bu iterasyonda gizli bilgiler Windows secret store yerine config dosyasinda saklanacaktir. Bunun operasyon sonucu acikca kabul edilmis bir trade-off oldugu belgelenmelidir.

Kurallar:

- config dosyasi launcher klasorunde tutulur
- repo icine yazilmaz
- dosya izinleri olabildigince sinirlandirilir
- loglara token veya secret duz metin olarak yazdirilmaz

---

## 7. Baslatma akisi

### 7.1 Sifirdan kurulum akisi

`install-and-start.bat` ilk defa calistiginda hedef akis sunlardir:

1. launcher klasorleri hazirlanir
2. `git` kontrol edilir, eksikse kurulur
3. `node` kontrol edilir, eksikse kurulur
4. `corepack/pnpm` hazirlanir
5. `ngrok` kontrol edilir, eksikse kurulur
6. `ngrok auth token` tanimlanir
7. repo klasoru kontrol edilir
8. repo yoksa private GitHub repo klonlanir
9. `.env` dosyalari merkezi config'ten uretilir
10. `pnpm install` calistirilir
11. Playwright browser bagimliliklari dogrulanir, eksikse kurulur
12. `connector`, `api`, `web` sirayla baslatilir
13. son olarak `ngrok` acilir
14. local URL, health URL ve public URL loglanir

### 7.2 Guncelleme ile yeniden baslatma akisi

Kullanici operasyon akisi sunlardir:

1. `stop-server.bat`
2. `install-and-start.bat`

Bu ikinci calistirmada launcher su sekilde davranir:

- repo zaten varsa temiz guncelleme yapar
- eksik bagimliliklari yeniden kontrol eder
- env dosyalarini config'e gore tekrar yazar
- eski surecleri temizler
- guncel commit ile sistemi tekrar ayaga kaldirir

### 7.3 Surec baslatma sirasi

Calisma sirasinin kontrollu olmasi gerekir:

1. `connector`
2. `api`
3. `web`
4. `ngrok`

Her adimda ilgili health kontrolu gecilmeden sonraki surece gecilmez. Bu, yari-calisan ve disariya acik ama bozuk bir sistem olusmasini engeller.

---

## 8. Durdurma ve yeniden baslatma tasarimi

### 8.1 PID ve pencere kaydi

Launcher her actigi surecin PID bilgisini `.state\pids` altina yazar. Ayrica pencere basliklari belirlenmis sabit adlar kullanir.

Bu cift yontem sunlari saglar:

- pid dosyasi varsa dogrudan hedefli kapatma
- pid bozulmussa pencere veya process adi ile ek toparlama

### 8.2 Durdurma kurallari

`stop-server.bat` su surecleri hedefler:

- `connector`
- `api`
- `web`
- `ngrok`

Ek olarak gerekirse iliskili `node` surecleri de temizler, ancak kullaniciya ait ilgisiz surecleri oldurmeyecek kadar dar esitlestirme yapilmalidir.

### 8.3 Yeniden baslatma davranisi

`install-and-start.bat` baslamadan once de stale PID ve stale process temizligi yapacaktir. Boylece kullanici `stop-server.bat` calistirmayi unutsa bile launcher belirli olcude kendini toparlayabilir.

---

## 9. Hata toparlama stratejisi

Bu launcher'in degeri, sadece baslatmasi degil; yaygin operasyonel sorunlari toparlayabilmesidir.

### 9.1 Otomatik toparlanacak hatalar

Asagidaki durumlarda script otomatik cozum deneyecektir:

- `git` eksik
- `node` eksik
- `pnpm` eksik
- `ngrok` eksik
- repo klasoru eksik
- `node_modules` eksik
- Playwright browser kurulumu eksik
- stale PID dosyalari
- stale `ngrok` sureci
- onceki yarim kalmis baslatma durumu

### 9.2 Fail-fast duruslar

Asagidaki durumlarda script acik hata verip durmalidir:

- config dosyasi yok veya parse edilemiyor
- private repo kimlik bilgileri gecersiz
- `pnpm install` basarisiz
- `connector` health gecmiyor
- `api` health gecmiyor
- `web` health gecmiyor
- `ngrok` public URL olusmuyor
- uygulama icindeki gercek runtime hata nedeniyle surec surekli cikiyor

Bu durumlarda loglar kullaniciya net sekilde gosterilecek, fakat script sahte basari uretmeyecektir.

### 9.3 Hata kapsami siniri

Bu tasarim, operasyonel ve ortam kaynakli sorunlari hedefler. Uygulama kodundaki islevsel buglar launcher tarafindan otomatik "duzeltilmeye" calisilmayacaktir.

Bu bilincli bir sinirdir; aksi davranis operasyon scriptini kontrolsuz kod degistiren bir yapiya donusturur.

---

## 10. Loglama ve gozlemlenebilirlik

### 10.1 Log klasorleri

Tum ciktilar launcher state klasoru altinda tutulacaktir:

- `.state\logs\bootstrap.log`
- `.state\logs\startup.log`
- `.state\logs\connector.log`
- `.state\logs\api.log`
- `.state\logs\web.log`
- `.state\logs\ngrok.log`

### 10.2 Kisa durum dosyalari

Iki yardimci dosya da uretilecektir:

- `.state\runtime\latest-url.txt`
- `.state\runtime\status.txt`

`latest-url.txt` son olusan `ngrok` linkini tek satirda tutar.  
`status.txt` son commit, baslatma zamani, temel portlar ve servis health ozetini tutar.

### 10.3 Basari ozeti

Basarili acilista asagidaki bilgiler net sekilde yazdirilmalidir:

- aktif commit
- repo branch
- connector health URL
- api health URL
- web local URL
- ngrok public URL

---

## 11. Guvenlik ve operasyon trade-off'lari

Bu tasarim bilincli olarak hizli operasyon kolayligini onceliklendirir.

Trade-off'lar:

- GitHub token config dosyasinda tutulur
- ngrok token config dosyasinda tutulur
- launcher makinaya bagimli bir Windows kurulum modeline dayanir
- `connector` gorunur tarayici gereksinimi nedeniyle tam service izolasyonu hedeflenmez

Buna karsilik kazanilanlar:

- sifirdan kurulum kolayligi
- tek tikla yeniden ayağa kaldirma
- dusuk operasyon karmasikligi
- kullanicinin talep ettigi "sadece cift tikla calissin" davranisina uyum

---

## 12. Test ve dogrulama stratejisi

Implementasyon sonrasi en az su senaryolar dogrulanmalidir:

1. Bos bir Windows VPS'te ilk calistirma
2. Repo zaten varken guncelleme ile yeniden baslatma
3. `ngrok` kurulu degilken otomatik kurulum
4. `node_modules` silinmisken otomatik toparlama
5. Stale PID varken temiz acilis
6. Gecersiz GitHub token ile net hata
7. `connector` acilamazsa fail-fast durus
8. Public URL olustugunda dis cihazdan web erisimi

---

## 13. Uygulama sinirlari ve sonraki adimlar

Bu tasarim ilk iterasyonda su hedefe odaklanir:

- Windows VPS uzerinde sifirdan kurulum
- tek tikla baslatma
- tek tikla durdurma
- guncel kodla yeniden acma
- internetten `ngrok` uzerinden erisim

Ileride ayri iterasyon konusu olabilecek gelisimler:

- kalici domain ve reverse proxy
- gizli bilgileri Windows Credential Manager veya baska bir secret store'a tasima
- otomatik Windows giris / scheduled task entegrasyonu
- servis durumunu gosteren daha gelismis dashboard

Bu spec onaylandiktan sonra siradaki adim, launcher dosya yapisini ve script sorumluluklarini parca parca uygulama planina donusturmaktir.
