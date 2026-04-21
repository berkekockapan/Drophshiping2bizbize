# Mac'te Ajana Verilecek Tek Parça Kurulum Promptu

## Amaç

Bu dosya, Mac bilgisayarda bir ajana/Codex'e tek seferde yapıştırılacak promptu içerir. Hedef repo artık `dropshiping2bizbize` kimliğiyle ayrıştığı için prompt da bu kimliği ve yeni port standardını baz alır.

## Kullanım

Mac'te terminal ve dosya erişimi olan ajana aşağıdaki promptu yapıştır.

## Prompt

```text
Bu repo için Mac üzerinde kurulum ve ilk çalıştırmayı uçtan uca sen yap.

Çalışma hedefin:
1. Gerekli araçları kur
2. Repoyu doğru yere klonla ya da varsa güncelle
3. Projeyi çalışır hale getir
4. Masaüstüne başlat/durdur dosyalarını oluştur
5. Sistemi başlat
6. Health check yap
7. Sonunda bana kısa ama net bir durum raporu ver

Kurallar:
- Mümkün olan her şeyi kendin yap; gereksiz onay isteme.
- Sadece macOS parola/sudo, GUI izni, Apple güvenlik izni veya login gibi insan müdahalesi zorunluysa benden kısa ve net şekilde bunu iste.
- Bir şey zaten kuruluysa yeniden kurma; eksikse kur.
- Her adımda idempotent ol: mevcut kurulum varsa bozma.
- Tüm shell komutlarını macOS'a uygun çalıştır.
- Repo yolu varsayılan hedef: ~/Projects/dropshiping2bizbize
- Repo remote'u `dropshiping2bizbize` reposunu göstermeli; URL emin değilsen mevcut `origin`i doğrula ve yanlış repo ile devam etme.
- Repo içindeki rehber dosyasını referans al: docs/runbooks/mac-local-dev.md
- Hedef port standardı: API 8788, web dev 5174, web preview 4175, connector 4318
- Eğer kod/config içinde bugün hâlâ eski scope veya eski portlar görürsen bunu sessizce normalleştirme; drift olarak raporla.

Yapılacak işler:

1) Ön kontrol
- macOS sürümünü, aktif shell'i, mevcut kullanıcıyı ve mevcut çalışma dizinini tespit et.
- `xcode-select -p`, `git --version`, `brew --version`, `node --version`, `corepack --version` ve `pnpm --version` komutlarını kontrol et.

2) Gerekli araçları kur
- Xcode Command Line Tools yüklü değilse yüklemeyi başlat.
- Homebrew yoksa resmi yöntemle kur.
- Git yoksa Homebrew ile kur.
- Node.js 22 yoksa kur.
- `corepack enable` çalıştır.
- Gerekirse `corepack prepare pnpm@10.32.1 --activate` çalıştır.
- Son durumda `pnpm --version` çalışıyor olmalı.

3) Repo hazırlığı
- `~/Projects` yoksa oluştur.
- Eğer `~/Projects/dropshiping2bizbize/.git` varsa:
  - o klasöre gir
  - `git remote -v` kontrol et
  - remote yanlış repoyu gösteriyorsa dur ve bana kısa bir uyarı ver
  - `git fetch origin`
  - `git checkout main`
  - `git pull --ff-only origin main`
- Repo yoksa doğru remote ile klonla ve repo klasörüne gir.

4) Bağımlılıklar
- Repo kökünde `pnpm install` çalıştır.
- Hata olursa eksik araç veya PATH sorununu çöz ve tekrar dene.

5) Connector env hazırlığı
- `apps/connector/.env` dosyası yoksa `apps/connector/.env.example` dosyasından oluştur.
- Hedef içerik en az şu değerleri taşımalı:
  - `CONNECTOR_HOST=127.0.0.1`
  - `CONNECTOR_PORT=4318`
  - `CONNECTOR_PROVIDER=mock`
  - `CONNECTOR_STATE_DIR=.state`
- Dosyada daha eski port görürsen bunu not et.

6) Browser bağımlılığı
- Playwright Chromium eksikse kur:
  - `pnpm --filter <connector-package> exec playwright install chromium`
- Scope eskiyse mevcut çalışan package adını kullan ama bunu rapora yaz.

7) Launcher oluşturma
- Repo kökünde `bash scripts/macos/create-desktop-launchers.sh` çalıştır.
- Hedef çıktı adları:
  - `~/Desktop/dropshiping2bizbize-start.command`
  - `~/Desktop/dropshiping2bizbize-stop.command`
- Script farklı isim üretirse bunu raporda drift olarak belirt.

8) Sistemi başlat
- Repo kökünde `bash scripts/macos/start-dev.sh` çalıştır.
- Ayrı Terminal sekmelerinde API, Connector ve Web süreçlerinin açıldığını doğrula.
- Tarayıcıda hedef web adresini aç: `http://127.0.0.1:5174`

9) Sağlık kontrolleri
- Gerekirse servislerin açılması için kısa bekleme ve retry uygula.
- Şu kontrolleri yap:
  - `curl http://127.0.0.1:8788/health`
  - `curl http://127.0.0.1:4318/health`
  - `http://127.0.0.1:5174`
- Eğer fiili config farklı port açıyorsa bunu düzeltme yetkin yoksa açıkça raporla.

10) Sorun olursa
- Önce log dosyalarını incele:
  - `.state/macos-dev/logs/api.log`
  - `.state/macos-dev/logs/connector.log`
  - `.state/macos-dev/logs/web.log`
- Çözebileceğin sorunları kendin çöz.
- Sadece bloke eden ve insan müdahalesi gerektiren noktada dur.

11) Final çıktı formatı
İş bitince bana şu başlıklarla kısa bir özet ver:
- Durum: başarılı / kısmi / blokeli
- Repo yolu
- Node sürümü
- pnpm sürümü
- Üretilen masaüstü dosyaları
- Açık servisler ve adresleri
- Health check sonuçları
- Tespit edilen ve d�zeltilen eski referanslar
- Varsa benden istenen tek sonraki aksiyon

12) Başarı kriterleri
İş ancak şu koşullar sağlanınca tamam sayılacak:
- Repo `~/Projects/dropshiping2bizbize` altında hazır
- `pnpm install` başarıyla tamamlanmış
- `apps/connector/.env` hazır
- Masaüstünde start/stop `.command` dosyaları var
- API health başarılı
- Connector health başarılı
- Web hedef adres üzerinde açılmış ya da drift sebebi açıkça raporlanmış

Şimdi işe başla ve zorunlu olmadıkça soru sorma.
```


