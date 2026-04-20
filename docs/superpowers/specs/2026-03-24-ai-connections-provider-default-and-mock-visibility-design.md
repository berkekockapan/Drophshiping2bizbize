# AI Bağlantılarında Varsayılan Provider ve Mock Görünürlüğü Tasarımı

Tarih: 2026-03-24
Durum: Onaylandı
Kapsam: `apps/connector`, `apps/web`, `docs/runbooks`

## 1. Amaç

`AI Bağlantıları` ekranında yalnızca `Mock Workspace bağlı` görünmesi, gerçek ChatGPT bağlantısının kaybolmasından değil, connector servisinin varsayılan olarak `mock` provider ile açılmasından kaynaklanıyor. Bu tasarımın amacı iki davranışı birlikte düzeltmektir:

- Proje varsayılanını `chatgpt-web` yaparak yeni kurulumların yanlışlıkla `mock` moduna düşmesini engellemek.
- `mock` bilinçli olarak seçildiğinde bunu UI üzerinde açık, yanıltmayan ve aksiyon öneren bir durum olarak göstermek.

## 2. Mevcut durum

Bugünkü kod ve çalışma ortamı şu tabloyu oluşturuyor:

- `apps/connector/src/config.ts` içinde provider fallback davranışı `mock`.
- `apps/connector/.env.example` içinde önerilen değer `CONNECTOR_PROVIDER=mock`.
- `apps/web/src/features/connections/components/ConnectorStatusCard.tsx` aktif profili doğrudan "`<label> bağlı`" biçiminde gösteriyor.
- `mock` provider açıldığında otomatik olarak `Mock Workspace` oluşturuluyor.
- Sonuç olarak kullanıcı, test amaçlı local mock profilini gerçek AI bağlantısı gibi yorumlayabiliyor.

## 3. Onaylanan ürün kararları

- Varsayılan provider `chatgpt-web` olacak.
- `mock` provider sistemde kalacak, ancak yalnızca açık env ayarıyla seçilecek.
- `AI Bağlantıları` ekranı aktif provider bilgisini görünür şekilde sunacak.
- `mock` provider aktifken belirgin bir uyarı kartı gösterilecek.
- `mock` profiller gerçek hesap bağlanmış hissi vermeyecek; test/prototip olarak etiketlenecek.
- Mevcut `chatgpt-web` bağlanma, yeniden bağlanma ve kaldırma akışı korunacak.

## 4. Değerlendirilen yaklaşımlar

### Yaklaşım A: Varsayılanı `chatgpt-web` yap, `mock`u görünür uyarı ile sun

Bu yaklaşım yeni kurulumların gerçek entegrasyona yönelmesini sağlar, aynı zamanda `mock` ihtiyacını bozmadan onu bilinçli bir seçim haline getirir.

Artıları:

- Kullanıcı beklentisi ile ürün davranışı hizalanır.
- Hatalı kurulumlar ekrandan teşhis edilebilir hale gelir.
- Mevcut local geliştirme araçları korunur.

Eksileri:

- `mock` bekleyen mevcut yerel kurulumlar env değerini açıkça güncellemek zorundadır.

### Yaklaşım B: Provider zorunlu olsun, env yoksa servis açılmasın

Bu yaklaşım yanlış varsayılanı tamamen ortadan kaldırır.

Artıları:

- En sert doğruluk garantisini verir.

Eksileri:

- Geliştirici deneyimini gereksiz yere sertleştirir.
- Basit local denemelerde servis açılışını kırar.

### Yaklaşım C: Varsayılan `mock` kalsın, sadece UI uyarı versin

Bu yaklaşım geriye uyumluluğu yüksek tutar.

Artıları:

- Konfigürasyon davranışı değişmez.

Eksileri:

- Kullanıcının istediği ürün yönünü karşılamaz.
- Yeni kurulumlarda aynı yanılgı devam eder.

Seçilen yaklaşım: Yaklaşım A.

## 5. Tasarım

### 5.1 Connector konfigürasyonu

`apps/connector` içinde provider çözümleme davranışı değişecektir:

- `CONNECTOR_PROVIDER` verilmemişse fallback `chatgpt-web` olacak.
- Geçerli provider listesi yine `chatgpt-web | mock` ile sınırlı kalacak.
- `mock` provider yalnızca `CONNECTOR_PROVIDER=mock` ile seçildiğinde aktif olacak.

Bu değişiklik için iki nokta birlikte güncellenecek:

- `apps/connector/src/config.ts`
- `apps/connector/.env.example`

Yerel `.env` dosyaları kullanıcıya ait olduğundan otomatik göç yapılmayacak; dokümantasyon ve UI mesajı ile yönlendirme yapılacak.

### 5.2 Connector API yüzeyi

Yeni endpoint gerekmez. Mevcut veriler yeterlidir:

- `GET /health` zaten `provider` ve `activeProfile` dönebiliyor.
- `GET /profiles` mevcut profil listesini dönebiliyor.

Bu yüzden çözüm yeni backend sözleşmesi üretmek yerine mevcut health/profile verisini UI’de daha doğru yorumlamaya dayanır.

### 5.3 AI Bağlantıları ekranı

`apps/web/src/features/connections/routes/AIConnectionsPage.tsx` ve `apps/web/src/features/connections/components/ConnectorStatusCard.tsx` şu davranışları kazanacaktır:

- Aktif provider, durum kartında açıkça gösterilecek.
- `mock` aktifse üst bölümde dikkat çeken bir uyarı kartı gösterilecek.
- Uyarı kartı şu bilgileri verecek:
  - Bunun test amaçlı bir provider olduğu
  - Bu nedenle yalnızca `Mock Workspace` benzeri test profillerinin görüldüğü
  - Gerçek ChatGPT bağlantısı için `CONNECTOR_PROVIDER=chatgpt-web` ayarı ve connector yeniden başlatma gerekliliği
- Profil satırlarında `mock` profillere test/prototip etiketi eklenecek.
- Aktif `mock` profil için kullanılan ana metin, gerçek hesap bağlı hissini azaltacak biçimde ayrıştırılacak.

### 5.4 Metin ve durum dili

UI, `mock` ile `chatgpt-web` arasında net dil farkı kurmalıdır:

- `chatgpt-web`: hesap/bağlantı/aktif profil dili korunabilir.
- `mock`: test workspace / prototip / local demo dili kullanılmalıdır.

Bu ayrımın amacı sadece bilgilendirme değil, kullanıcıyı yanlış teşhis zincirinden çıkarmaktır.

## 6. Test stratejisi

### 6.1 Connector testleri

- `apps/connector/tests/unit/config.test.ts` varsayılan provider davranışını `chatgpt-web` lehine doğrulayacak şekilde genişletilecek veya güncellenecek.
- Gerekirse açık `CONNECTOR_PROVIDER=mock` senaryosu ayrı testle korunacak.

### 6.2 Web testleri

`apps/web/src/features/connections/routes/AIConnectionsPage.test.tsx` şu iki ana senaryoyu kapsayacak:

- `provider: "mock"` geldiğinde uyarı kartı, provider etiketi ve test/prototip dili görünmeli.
- `provider: "chatgpt-web"` geldiğinde mock uyarısı görünmemeli; mevcut hesap aktivasyon akışı çalışmaya devam etmeli.

### 6.3 Dokümantasyon doğrulaması

Runbook metni, temiz kurulum yapan geliştiriciyi `mock`a yönlendirmemeli. Doküman incelemesinde aşağıdaki net olmalıdır:

- Yeni varsayılan `chatgpt-web`
- `mock` kullanımının isteğe bağlı ve açık seçim olduğu
- `mock` seçilirse ekranda test modu uyarısı görüleceği

## 7. Başarı ölçütleri

- Yeni veya env değeri eksik bir kurulumda connector `mock` yerine `chatgpt-web` varsayılanı ile açılır.
- Kullanıcı `AI Bağlantıları` ekranında aktif provider’ı tek bakışta görür.
- `mock` modunda yalnızca `Mock Workspace bağlı` benzeri yanıltıcı bir görünüm kalmaz; test modu açıkça belirtilir.
- `chatgpt-web` akışındaki mevcut bağlantı yönetimi bozulmaz.

## 8. Kapsam dışı

- `mock` provider’ın sistemden kaldırılması
- Yeni connector endpointleri eklenmesi
- AI üretim akışının veya `EtsyPrepWorkspace` davranışının yeniden tasarlanması
- Kullanıcıya ait mevcut `.env` dosyalarının otomatik değiştirilmesi

## 9. Uygulama notları

- Bu değişiklik bir ürün yönü düzeltmesidir; yalnızca görsel rötuş olarak ele alınmamalıdır.
- Konfigürasyon ve UI birlikte değişmediği sürece sorun eksik çözülmüş olur.
- İlgili runbook güncellemesi uygulama ile aynı değişim setinde yapılmalıdır.
