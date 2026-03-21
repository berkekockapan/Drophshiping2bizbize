# Mac'te Ajana Verilecek Tek Parça Kurulum Promptu

## Amaç
Bu dosya, Mac bilgisayarda bir ajana/Codex'e tek seferde yapıştırılacak promptu içerir. Promptun hedefi, projeyi mümkün olduğunca sıfır müdahale ile kurmak, gerekli araçları indirmek, launcher dosyalarını oluşturmak, sistemi çalıştırmak ve sonucu raporlamaktır.

## Kullanım
Mac'te terminal ve dosya erişimi olan ajana aşağıdaki promptu aynen yapıştır.

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
- Tüm shell komutlarını Mac'e uygun çalıştır.
- Repo yolu olarak varsayılan hedef: ~/Projects/dropshiping-win
- GitHub repo URL'si: https://github.com/berkekockapan/dropshiping-win.git
- Repo içindeki rehber dosyasını referans al: docs/runbooks/mac-local-dev.md

Yapılacak işler:

1) Ön kontrol
- macOS sürümünü, aktif shell'i, mevcut kullanıcıyı ve mevcut çalışma dizinini tespit et.
- `xcode-select -p`, `git --version`, `brew --version`, `node --version`, `corepack --version` ve `pnpm --version` komutlarını kontrol et.

2) Gerekli araçları kur
- Xcode Command Line Tools yüklü değilse yüklemeyi başlat.
- Homebrew yoksa resmi yöntemle kur.
- Git yoksa Homebrew ile kur.
- Node.js 22 yoksa kur. Homebrew veya nvm kullanabilirsin ama sonuçta `node -v` komutu v22.x vermeli.
- `corepack enable` çalıştır.
- Gerekirse `corepack prepare pnpm@10.32.1 --activate` çalıştır.
- Son durumda `pnpm --version` çalışıyor olmalı.

3) Repo hazırlığı
- `~/Projects` yoksa oluştur.
- Eğer `~/Projects/dropshiping-win/.git` varsa:
  - o klasöre gir
  - `git remote -v` kontrol et
  - remote yanlışsa `origin` adresini `https://github.com/berkekockapan/dropshiping-win.git` yap
  - `git fetch origin`
  - `git checkout main`
  - `git pull --ff-only origin main`
- Eğer repo yoksa:
  - `~/Projects` altına klonla
  - sonra repo klasörüne gir

4) Bağımlılıklar
- Repo kökünde `pnpm install` çalıştır.
- Hata olursa eksik araç veya PATH sorununu çöz ve tekrar dene.

5) Connector env hazırlığı
- `apps/connector/.env` dosyası yoksa `apps/connector/.env.example` dosyasından oluştur.
- Dosya içeriğini kontrol et. En az şu değerler olmalı:
  - `CONNECTOR_HOST=127.0.0.1`
  - `CONNECTOR_PORT=4317`
  - `CONNECTOR_PROVIDER=mock`
  - `CONNECTOR_STATE_DIR=.state`

6) Browser bağımlılığı
- Playwright Chromium eksikse kur:
  - `pnpm --filter @trendyol-etsy/connector exec playwright install chromium`

7) Launcher oluşturma
- Repo kökünde şu komutu çalıştır:
  - `bash scripts/macos/create-desktop-launchers.sh`
- Ardından aşağıdaki dosyaların oluştuğunu doğrula:
  - `~/Desktop/dropshiping-win-start.command`
  - `~/Desktop/dropshiping-win-stop.command`
- Gerekirse executable izinlerini ver.

8) Sistemi başlat
- Repo kökünde `bash scripts/macos/start-dev.sh` çalıştır.
- Ayrı Terminal sekmelerinde API, Connector ve Web süreçlerinin açıldığını doğrula.
- Tarayıcıda `http://127.0.0.1:5173` adresini aç.

9) Sağlık kontrolleri
- Gerekirse servislerin açılması için kısa bekleme ve retry uygula.
- Şu kontrolleri yap:
  - `curl http://127.0.0.1:8787/health`
  - `curl http://127.0.0.1:4317/health`
- Ayrıca web için şu adresin açıldığını doğrula:
  - `http://127.0.0.1:5173`

10) Sorun olursa
- Önce log dosyalarını incele:
  - `.state/macos-dev/logs/api.log`
  - `.state/macos-dev/logs/connector.log`
  - `.state/macos-dev/logs/web.log`
- Gerekirse port kontrolü yap:
  - 5173
  - 8787
  - 4317
- Çözebileceğin sorunları kendin çöz.
- Sadece bloke eden ve insan müdahalesi gerektiren noktada dur.

11) Final çıktı formatı
İş bitince bana şu başlıklarla kısa bir özet ver:
- Durum: başarılı / kısmi / blokeli
- Repo yolu
- Node sürümü
- pnpm sürümü
- Oluşturulan masaüstü dosyaları
- Açık servisler ve adresleri
- Health check sonuçları
- Varsa benden istenen tek sonraki aksiyon

12) Başarı kriterleri
İş ancak şu koşullar sağlanınca tamam sayılacak:
- Repo `~/Projects/dropshiping-win` altında hazır
- `pnpm install` başarıyla tamamlanmış
- `apps/connector/.env` hazır
- Masaüstünde start/stop `.command` dosyaları var
- API health başarılı
- Connector health başarılı
- Web `http://127.0.0.1:5173` üzerinde açılmış

Şimdi işe başla ve zorunlu olmadıkça soru sorma.
```
