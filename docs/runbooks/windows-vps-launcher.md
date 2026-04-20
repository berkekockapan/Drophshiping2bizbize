# Windows VPS Launcher Runbook

## Amac

Bu runbook, `scripts/windows/vps-launcher/` klasorunun bir Windows VPS'e nasil kopyalanacagini, `server-config.json` dosyasinin nasil hazirlanacagini ve `install-and-start.bat` / `stop-server.bat` ile nasil isletilecegini anlatir.

## Kapsam

- Bu akisin canonical giris noktasi: `scripts/windows/vps-launcher/install-and-start.bat`
- Durdurma icin canonical giris noktasi: `scripts/windows/vps-launcher/stop-server.bat`
- Bu runbook, sifirdan VPS kurulum + private repo bootstrap senaryosu icindir.

## Hazirlama

1. `scripts/windows/vps-launcher/` klasorunu VPS'te `C:\dropshiping-launcher` altina kopyala.
2. `C:\dropshiping-launcher\server-config.example.json` dosyasini `C:\dropshiping-launcher\server-config.json` olarak kopyala.
3. `server-config.json` icinde en az su alanlari doldur:
   - private repo erisimi icin GitHub PAT
   - repo URL ve branch
   - `NGROK_AUTHTOKEN`
4. Gerekirse Windows tarafinda `ExecutionPolicy` kisitlarini operator politikasina gore duzenle.

## Ilk Calistirma (Bootstrap + Start)

PowerShell veya CMD icinden:

```bat
cd /d C:\dropshiping-launcher
install-and-start.bat
```

Beklenen sonuc:

- bootstrap adimi repo clone/pull ve bagimlilik hazirligini tamamlar
- start adimi connector + api + web + ngrok sureclerini kaldirir
- public URL `C:\dropshiping-launcher\.state\runtime\latest-url.txt` dosyasina yazilir

## Durdurma

```bat
cd /d C:\dropshiping-launcher
stop-server.bat
```

Bu adim launcher tarafindan acilan surecleri kapatir ve stale PID/artik runtime durumunu temizlemeyi dener.

## Hizli Dogrulama

1. `C:\dropshiping-launcher\.state\runtime\latest-url.txt` dosyasini ac ve public URL'nin yazildigini dogrula.
2. `C:\dropshiping-launcher\.state\runtime\status.txt` dosyasi varsa commit + endpoint satirlarini kontrol et.
3. Sorun halinde `C:\dropshiping-launcher\.state\logs\` altindaki loglari incele.
