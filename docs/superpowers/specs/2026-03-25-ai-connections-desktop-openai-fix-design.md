# AI Bağlantıları Desktop OpenAI Fix Tasarımı

**Tarih:** 2026-03-25  
**Durum:** Tasarım onaylandı  
**Kapsam:** `apps/web`, `apps/connector`, `apps/api`, `scripts/windows`, `C:\Users\berke\Desktop\Dropshipping-Baslat.bat`, `docs/runbooks`

---

## 1. Amaç

Bu değişikliğin amacı, uygulamadaki `AI Bağlantıları` deneyimini teknik bir ayar ekranı olmaktan çıkarıp masaüstü kullanımı için sade, otomatik ve güvenilir bir bağlantı merkezine dönüştürmektir.

Hedef ürün davranışı şudur:

- kullanıcı masaüstünde `C:\Users\berke\Desktop\Dropshipping-Baslat.bat` çalıştırır
- gerekli yerel servisler ve yardımcı süreçler otomatik hazırlanır
- uygulama açıldığında yerel bağlantı hedefi mümkün olduğunca otomatik keşfedilir
- geçerli bir OpenAI oturumu varsa `AI Bağlantıları` ekranı bunu otomatik bağlı gösterir
- bağlı hesap yoksa kullanıcı yalnızca sade bir `OpenAI ile Bağlan` ana aksiyonu görür
- kullanıcı isterse bağlantıyı kaldırabilir
- kaldırma yalnızca UI kaydını değil, ilgili yerel auth/session artıklarını da temizler
- teknik alanlar varsayılan yüzde görünmez, yalnızca `Gelişmiş Ayarlar` altında yer alır

Bu iterasyonun hedefi, kullanıcıdan `baseUrl`, `managementKey`, `apiKey`, auth-file adı veya connector iç ayrıntısı düşünmesini istemeyen bir ürün deneyimi kurmaktır.

---

## 2. Mevcut durum ve tespitler

Kod tabanı ve çalışma ortamı incelendiğinde aşağıdaki durum görülüyor:

- `apps/web/src/features/connections/routes/AIConnectionsPage.tsx` hâlen hedef konfigürasyon panelini doğrudan sayfada gösteriyor.
- `apps/web/src/features/connections/hooks/useAIConnections.ts` akışı hedef URL / key temelli ve `authFiles` listesi etrafında kurulmuş durumda.
- `apps/web/src/features/connections/components/ConnectorStatusCard.tsx` ürün yüzünde birden fazla auth kaydı ve `Aktif Yap` gibi çoklu hesap dili taşıyor.
- `apps/connector/src/store/profileStore.ts` profil tabanlı birden çok kayıt taşıyabilen bir yapı içeriyor.
- `C:\Users\berke\Desktop\Dropshipping-Baslat.bat`, `scripts/windows/start-dev.ps1` dosyasını çağırıyor; ancak repo ağacında bu Windows başlatma scripti görünmüyor.
- Buna karşın `.state\windows-dev\logs\startup.log` içindeki 2026-03-25 13:46:15–13:46:46 arası kayıtlar Windows başlangıç zincirinin yerelde gerçekten çalıştığını, `connector`, `api` ve `web` servislerini ayağa kaldırdığını gösteriyor.
- Aynı loglarda connector provider değerinin `mock` olduğu görülüyor; bu, gerçek OpenAI akışının ürün yüzünde yeterince net/sade olmadığına işaret ediyor.

Bu nedenle sorun yalnızca tek bir UI bileşeninde değil; startup, hedef çözümleme, bağlantı görünümü ve kaldırma davranışı birlikte ele alınmalıdır.

---

## 3. Onaylanan ürün kararları

Bu tasarım için aşağıdaki ürün kararları onaylandı:

- Varsayılan kullanıcı deneyimi teknik detay göstermemelidir.
- Teknik hedef alanları yalnızca `Gelişmiş Ayarlar` altında görünmelidir.
- Nihai ürün yüzünde tek aktif OpenAI hesabı yeterlidir.
- `Dropshipping-Baslat.bat`, bağlantı için gerekli yerel yardımcı servisleri de otomatik hazır hale getirmelidir.
- `Bağlantıyı Kaldır` aksiyonu ilgili yerel auth/session/cookie/storage artıklarını da temizlemelidir.
- Uygulama yeniden açıldığında, daha önce bağlanmış ve hâlâ geçerli olan oturum otomatik bağlı görünmelidir.
- Yerel masaüstü kullanımında hedef mümkün olduğunca otomatik keşfedilmeli; ancak gerekirse kullanıcı `Gelişmiş Ayarlar` ile manuel override yapabilmelidir.

---

## 4. Değerlendirilen yaklaşımlar

### Yaklaşım A — Sade ürün kabuğu düzeltmesi

Mevcut mimariyi koruyup öncelikle UI ve başlangıç deneyimini toparlamak.

**Artıları**
- Düşük risk
- Hızlı ilerleme
- Mevcut koda yüksek uyum

**Eksileri**
- İç dağınıklığın bir kısmı kalır
- Ürün hissi tam olarak hedeflenen seviyeye çıkmayabilir

### Yaklaşım B — Ürün akışı odaklı fix (**seçilen**)

Mevcut altyapıyı atmadan, bağlantı deneyimini tek aktif hesap + otomatik keşif + sade UI prensibiyle yeniden çerçevelemek.

**Artıları**
- Masaüstü kullanım beklentisine en iyi uyum
- Mevcut sistemi çöpe atmadan sadeleştirme sağlar
- Startup, web ve connector arasındaki ürün sözleşmesini netleştirir

**Eksileri**
- Basit UI rötuşundan daha büyüktür
- Birkaç katmanda birlikte çalışma gerektirir

### Yaklaşım C — Tam mimari sadeleştirme

Çoklu hesap ve mevcut hedef mantığını kökten refactor ederek sistemi sert biçimde tek hesap/tek hedef modeline indirmek.

**Artıları**
- En temiz nihai yapı

**Eksileri**
- Kapsam büyür
- Çalışan parçaları bozma riski artar

Seçilen yaklaşım: **Yaklaşım B**.

---

## 5. Hedef kullanıcı deneyimi

### 5.1 Ana masaüstü akışı

Kullanıcının tipik akışı aşağıdaki kadar basit olmalıdır:

1. `C:\Users\berke\Desktop\Dropshipping-Baslat.bat` çalıştırılır.
2. Gerekli yerel servisler ve yardımcı süreçler otomatik hazırlanır.
3. Uygulama açılır.
4. Yerel bağlantı hedefi otomatik keşfedilir.
5. Geçerli OpenAI oturumu varsa `AI Bağlantıları` ekranı otomatik bağlı görünür.
6. Oturum yoksa kullanıcı `OpenAI ile Bağlan` aksiyonunu kullanır.
7. Gerekirse kullanıcı bağlantıyı kaldırabilir ya da yeniden bağlanabilir.

### 5.2 Varsayılan yüzde görünmemesi gerekenler

Normal kullanıcı akışında aşağıdakiler görünmemelidir:

- raw `baseUrl`
- `managementKey`
- `apiKey`
- auth-file adları
- connector/CLIProxy gibi düşük seviye terimler

Bu bilgiler yalnızca `Gelişmiş Ayarlar` veya debug bağlamında görünür olmalıdır.

---

## 6. AI Bağlantıları sayfa durumu modeli

Sayfa üründe dört ana durum üzerinden çalışmalıdır:

### A. Hazır ve bağlı

Gösterilecekler:
- aktif hesap özeti (maskelenmiş)
- bağlı durumunun açık metni
- `Yeniden Bağlan`
- `Bağlantıyı Kaldır`

### B. Hazır ama bağlı değil

Gösterilecekler:
- sade boş durum açıklaması
- `OpenAI ile Bağlan` ana aksiyonu

### C. Bağlantı kuruluyor

Gösterilecekler:
- girişin tarayıcıda tamamlanmasının beklendiğine dair tek net mesaj
- gerekirse iptal veya tekrar dene aksiyonu

### D. Sorun var

Gösterilecekler:
- sade ürün diliyle hata mesajı
- duruma uygun ana aksiyonlar (`Tekrar Dene`, `Bağlan`, `Gelişmiş Ayarlar`)

Bu modelde web tarafı `authFiles` listesini ya da çoklu seçim mantığını ürün yüzüne taşımamalıdır.

---

## 7. Başlangıç sözleşmesi ve otomatik keşif

### 7.1 Başlatma zinciri

`Dropshipping-Baslat.bat` ve çağırdığı Windows başlangıç scripti ürünün resmi bir parçası olarak ele alınmalıdır.

Bu katman şunları yapmalıdır:

- bağımlılık kontrolü
- gerekirse yerel hazırlık adımları
- `connector`, `api` ve `web` servislerini ayağa kaldırma
- health kontrollerini bekleme
- yerel hedefin hazır olduğunu web tarafından anlaşılır hale getirme
- ancak sistem hazır olduktan sonra uygulamayı açma

### 7.2 Hedef çözümleme sırası

Web tarafında hedef bilgi çözümleme sırası şu olmalıdır:

1. otomatik keşfedilen local hedef
2. kaydedilmiş `Gelişmiş Ayarlar` override bilgisi
3. hiçbiri yoksa `bağlantı hazır değil` durumu

Bu sayede normal kullanıcı teknik ayar girmeden ilerleyebilir; özel durumda override desteği korunur.

### 7.3 Repo görünürlüğü

Başlatma zinciri masaüstünde fiilen kullanıldığı halde repo içinde görünmediği için, ilgili Windows başlangıç scriptinin sürüm kontrolüne alınması veya eşdeğer şekilde repo görünürlüğüne kavuşturulması gerekir. Aksi halde ürün davranışı ile kaynak kod arasında görünürlük boşluğu oluşur.

---

## 8. Mimari ve sorumluluklar

### 8.1 `apps/web`

Sorumluluklar:
- yerel hedefi otomatik çözümleme
- onaylanmış durum modeline göre `AI Bağlantıları` UI'ını render etme
- `OpenAI ile Bağlan`, `Yeniden Bağlan`, `Bağlantıyı Kaldır` aksiyonlarını yürütme
- `Gelişmiş Ayarlar` override akışını yönetme
- kullanıcıya sade durum/hata dili sunma

### 8.2 `apps/connector`

Sorumluluklar:
- bağlantı denemesini başlatma ve izleme
- varsa önceki oturumu yeniden doğrulama
- aktif hesabın maskelenmiş özetini sağlama
- bağlantı kaldırıldığında ilgili yerel session/storage artıklarını temizleme
- web'e iç dosya yapısını değil, sade bağlantı özetini sunma

### 8.3 `apps/api`

Sorumluluklar:
- gerekiyorsa gelişmiş ayar override bilgisinin kalıcı kaynağı olma
- bağlantı deneyimini yönetmeye değil, uygulama ayarlarını tutmaya odaklanma

### 8.4 Başlatma katmanı

Sorumluluklar:
- servisleri ayağa kaldırma
- hazır ortamı üretme
- keşif için güvenilir bir başlangıç sözleşmesi sağlama

---

## 9. Tek aktif hesap modeli

Kullanıcı yüzünde tek aktif hesap modeli uygulanacaktır.

Bunun ürün anlamı şudur:

- aynı anda bir aktif OpenAI hesabı vardır
- ürün dili çoklu hesap odaklı değildir
- kullanıcı `Aktif Yap` gibi çoklu hesap terminolojisini normal akışta görmez
- içeride gerekirse eski store yapısı korunabilir, ancak public sözleşme tek hesap özeti üzerinden kurulmalıdır

Bu karar, hem UI sadeleşmesi hem de kaldırma/yeniden bağlanma davranışının netleşmesi için önemlidir.

---

## 10. Yeniden açılış ve doğrulama davranışı

Uygulama açıldığında connector şu mantıkla çalışmalıdır:

1. daha önceki local session/storage var mı diye bak
2. varsa hâlâ geçerli mi diye doğrula
3. geçerliyse aktif hesap olarak raporla
4. bozuksa iç tarafta `needs_reauth` benzeri duruma düşür, kullanıcıya sade hata göster

Bu sayede ürün davranışı şu olur:

- geçerli oturum varsa ekran otomatik bağlı açılır
- bozuk oturum varsa kullanıcı belirsiz bir durumda kalmaz; `Yeniden Bağlan` gibi net bir aksiyon görür

---

## 11. Kaldırma davranışı

`Bağlantıyı Kaldır` aksiyonu yalnızca UI kaydı silme değildir.

Bu akış:
- aktif bağlantı kaydını kaldırmalı
- ilgili auth/session/cookie/storage artıklarını temizlemeli
- UI'ı hemen `hazır ama bağlı değil` durumuna döndürmeli
- bir sonraki bağlanma denemesinin temiz başlamasını sağlamalıdır

Kaldırma sırasında temizlik başarısız olursa bu durum sessizce gizlenmemeli; kullanıcıya sade hata ile yansıtılmalı ya da işlem atomik hale getirilmelidir.

---

## 12. Hata yönetimi ve kullanıcı mesajları

Kullanıcıya görünen mesajlar teknik değil, ürün diliyle kurulmalıdır.

Örnek mesajlar:
- `OpenAI bağlantısı hazır`
- `Henüz bağlı hesap yok`
- `Tarayıcıda girişinizi tamamlayın`
- `Bağlantı doğrulanamadı`
- `Yerel bağlantı servisi hazır değil`
- `Bağlantı kaldırıldı`

Ana sorun senaryoları:

### 12.1 Startup eksik
- neden: başlangıç zinciri gerekli servisleri hazırlayamadı
- görünüm: `Yerel bağlantı servisi hazır değil`
- aksiyon: `Tekrar Dene` + `Gelişmiş Ayarlar`

### 12.2 Giriş yarım kaldı
- neden: kullanıcı OAuth/giriş akışını tamamlamadı
- görünüm: `Tarayıcıda girişinizi tamamlayın`
- aksiyon: bekleme / iptal / yeniden dene

### 12.3 Eski oturum bozuldu
- neden: kayıt var ama doğrulama başarısız
- görünüm: `Bağlantı yeniden doğrulanmalı`
- aksiyon: `Yeniden Bağlan`

### 12.4 Kaldırma sonrası temizlik problemi
- neden: metadata silindi ama storage temizliği eksik kaldı
- görünüm: kullanıcıya sahte başarı gösterilmez
- aksiyon: açık hata veya atomik geri alma yaklaşımı

---

## 13. Test stratejisi

### 13.1 Web testleri

Doğrulanacaklar:
- dört ana bağlantı durumu doğru render ediliyor mu
- `Gelişmiş Ayarlar` varsayılan olarak kapalı mı
- ana aksiyonlar duruma uygun mu
- otomatik keşif çalıştığında teknik alan göstermeden doğru deneyim kuruluyor mu

### 13.2 Connector testleri

Doğrulanacaklar:
- geçerli oturum yeniden açılışta otomatik bağlı dönüyor mu
- kaldırma auth/session/storage artıklarını gerçekten siliyor mu
- tek aktif hesap görünüm sözleşmesi doğru mu
- bozuk oturum sade ürün durumuna çevrilebiliyor mu

### 13.3 Startup / entegrasyon testleri

Doğrulanacaklar:
- `Dropshipping-Baslat.bat` zinciri gereken servisleri ayağa kaldırıyor mu
- health bekleme mantığı güvenilir mi
- sistem hazır olmadan uygulama açılmıyor mu
- local hedef keşfi startup çıktısıyla uyumlu mu

---

## 14. Başarı ölçütleri

Bu tasarım başarılı sayılacaksa:

- kullanıcı normal akışta teknik ayar girmeden bağlanabilmeli
- uygulama yeniden açıldığında geçerli oturum otomatik bağlı görünmeli
- `Bağlantıyı Kaldır` temiz ve güvenilir çalışmalı
- ürün yüzü tek hesap mantığıyla sade görünmeli
- başlangıç scripti bağlantı deneyiminin güvenilir parçası haline gelmeli
- hata mesajları teknik dil değil, ürün dili kullanmalı

---

## 15. Kapsam dışı

Bu iterasyonda hedef dışı kalanlar:

- çoklu hesap ürün deneyimini korumak veya zenginleştirmek
- uzak/ağ üstü çok hedef orkestrasyonu
- kullanıcıya düşük seviye CLIProxy/connector yönetim ekranı açmak
- resmi OpenAI API key odaklı tamamen farklı bir ürün yönüne geçmek

---

## 16. Uygulama notları

- Bu değişiklik yalnızca bir UI makyajı değildir; startup, connector ve web arasında net ürün sözleşmesi gerektirir.
- İç veri modeli gerektiğinde eski yapıları kısmen koruyabilir; ancak public sözleşme tek aktif hesap ve sade durum modeli üzerine kurulmalıdır.
- Var olan Windows başlangıç akışı masaüstünde fiilen kullanıldığı için, bunun repo içinde görünür ve test edilebilir hale gelmesi değişikliğin önemli parçasıdır.
