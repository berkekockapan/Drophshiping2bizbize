# AI Bağlantıları İçin Yeni Sekmede OpenAI OAuth Girişi Tasarımı

**Tarih:** 2026-03-25  
**Durum:** Tasarım onaylandı  
**Kapsam:** `apps/web`, `apps/api`

---

## 1. Amaç

Bu değişikliğin amacı, `http://127.0.0.1:5173/connections` ekranındaki OpenAI bağlantı deneyimini kullanıcının mevcut tarayıcı oturumu ile uyumlu hale getirmektir.

Hedef davranış şudur:

- kullanıcı `/connections` sayfasında `OpenAI ile giriş yap` butonunu görür
- butona tıklayınca OpenAI OAuth akışı **aynı açık tarayıcı penceresinde yeni sekme** olarak açılır
- kullanıcı zaten tarayıcıda giriş yaptığı Google hesabını bu sekmede kullanabilir
- OAuth callback sayfası başarıdan sonra sekmeyi **kendini kapatmaya çalışacak** şekilde davranır
- ana uygulama sekmesi **otomatik yenilenmez**
- kullanıcı ana sekmeye dönüp **manuel refresh** yaptığında bağlı durum görünür

Bu iterasyonun hedefi, masaüstü connector tabanlı ayrı browser açma davranışını kullanmadan, web tabanlı OAuth başlangıç deneyimini doğrudan iyileştirmektir.

---

## 2. Mevcut durum ve problem

Kod tabanı incelendiğinde ilgili parçalar şu durumu gösteriyor:

- `C:/Users/berke/Desktop/Projelerim/dropshiping-win/apps/web/src/features/connections/hooks/useAIConnections.ts` şu anda bağlantı başlangıcını local connector istemcisi üzerinden yapıyor.
- `C:/Users/berke/Desktop/Projelerim/dropshiping-win/apps/web/src/features/connections/lib/connectorApi.ts` içindeki `startOpenAiConnection()` yalnızca connector endpointine istek atıyor ve web tarafında yeni sekme açma mantığı taşımıyor.
- `C:/Users/berke/Desktop/Projelerim/dropshiping-win/apps/connector/src/routes/connections.ts` tarafındaki akış browser açmayı connector/provider sahipliğinde tutuyor; bu da “aynı açık tarayıcıda yeni sekme” beklentisine doğal olarak uymuyor.
- Buna karşılık `C:/Users/berke/Desktop/Projelerim/dropshiping-win/apps/api/src/routes/aiProfiles.ts` içinde `POST /ai-profiles/openai/start` endpointi zaten `authorizationUrl` dönebiliyor.
- Aynı `apps/api` router’ı, bağlantı durumu ve aktif profil bilgisi için `GET /ai-profiles/health`, deneme polling’i için `GET /ai-profiles/openai/attempts/:attemptId`, reconnect/delete için de ilgili profile endpointlerini sunuyor.
- `C:/Users/berke/Desktop/Projelerim/dropshiping-win/apps/api/src/modules/ai/openAiOAuth.ts` içinde callback HTML’i üretiliyor; ancak bu HTML şu anda yalnızca mesaj gösteriyor, sekmeyi kapatmayı denemiyor.

Bu nedenle eksik olan şey yeni bir OAuth altyapısı yazmak değil; `/connections` yüzünün aynı kaynak ailesi olan `apps/api /ai-profiles` akışına dönmesi ve callback HTML’inin kullanıcı beklentisine göre tamamlanmasıdır.

---

## 3. Onaylanan ürün kararları

Bu tasarım için aşağıdaki kararlar onaylandı:

- Ana CTA metni `OpenAI ile giriş yap` olmalıdır.
- OAuth akışı popup pencere olarak değil, **aynı tarayıcıda yeni sekme** olarak açılmalıdır.
- Yeni sekme frontend tarafından, kullanıcı click olayı içinde açılmalıdır.
- OAuth başarı ekranı sekmeyi kapatmayı denemelidir.
- Kapatma başarısız olursa kullanıcıya sade fallback mesajı gösterilmelidir.
- Ana `/connections` sekmesi otomatik senkronize edilmeyecek, kullanıcı manuel refresh yapacaktır.
- Bu iterasyon yalnızca bağlantı başlangıç deneyimine odaklanacaktır; diğer AI üretim akışlarını yeniden tasarlamayacaktır.

---

## 4. Değerlendirilen yaklaşımlar

### Yaklaşım A — Web’den doğrudan OAuth sekmesi açmak (**seçilen**)

Frontend, backend’den `authorizationUrl` alır ve bunu `window.open(..., "_blank")` ile yeni sekmede açar. Callback HTML’i başarıdan sonra `window.close()` dener.

**Artıları**
- Kullanıcının istediği deneyime doğrudan uyar
- Mevcut `apps/api` OAuth zincirini yeniden kullanır
- Aynı tarayıcı oturumunda açılma ihtimalini en güçlü şekilde sağlar

**Eksileri**
- Tarayıcılar `window.close()` çağrısını her durumda kabul etmeyebilir

### Yaklaşım B — Connector akışını sekme davranışına zorlamak

Mevcut local connector akışı korunur, ancak yeni sekme hissi üretmeye çalışılır.

**Artıları**
- Mevcut connector sahipliği korunur

**Eksileri**
- Aynı tarayıcı penceresinde yeni sekme beklentisine zayıf uyum sağlar
- Ayrı browser instance açılması riski devam eder

### Yaklaşım C — Hibrit web + connector fallback

Önce web tabanlı sekme akışı denenir, olmazsa connector fallback olur.

**Artıları**
- Teorik esneklik sağlar

**Eksileri**
- UX ve hata yönetimini gereksiz yere karmaşıklaştırır
- Tek bir net ürün davranışı bırakmaz

Seçilen yaklaşım: **Yaklaşım A**.

---

## 5. Hedef kullanıcı akışı

### 5.1 Ana akış

1. Kullanıcı `/connections` sayfasını açar.
2. Ekranda `OpenAI ile giriş yap` butonunu görür.
3. Butona tıklar.
4. Frontend backend’den OAuth başlangıç bilgisini alır.
5. Dönen `authorizationUrl` aynı açık tarayıcı penceresinde yeni sekme olarak açılır.
6. Kullanıcı OpenAI / Google girişini bu yeni sekmede tamamlar.
7. Callback sayfası başarı mesajı gösterir ve sekmeyi kapatmayı dener.
8. Kullanıcı ana uygulama sekmesine döner.
9. Kullanıcı manuel refresh yapar ve güncel bağlantı durumunu görür.

### 5.2 Başarılı callback sekmesi davranışı

Başarılı callback sayfası şu sırayla davranmalıdır:

- “Hesap başarıyla bağlandı” benzeri kısa bir durum metni gösterir
- kısa süre sonra `window.close()` dener
- kapanma gerçekleşmezse “Bu sekmeyi kapatıp uygulamaya dönebilirsiniz” metni görünür kalır

### 5.3 Hata callback sekmesi davranışı

Başarısız callback sayfası:

- neden başarısız olduğunu ürün diliyle gösterir
- sekmeyi otomatik kapatmaya çalışmaz
- kullanıcıyı uygulamaya dönüp tekrar denemeye yönlendirir

---

## 6. Mimari ve sorumluluklar

### 6.1 `apps/web`

Sorumluluklar:

- `OpenAI ile giriş yap` butonunu render etmek
- bağlantı durumu, profil özeti, reconnect ve delete davranışını `apps/api /ai-profiles` endpointleri üzerinden okumak
- kullanıcı click’i sırasında OAuth başlangıç isteğini tetiklemek
- dönen `authorizationUrl` için yeni sekme açmak
- sekme açılamazsa kullanıcıya hata göstermek
- mevcut manuel refresh modelini korumak

### 6.2 `apps/api`

Sorumluluklar:

- OAuth başlangıç isteğinde `authorizationUrl` üretmek
- callback’te token değişimi ve profil kaydını tamamlamak
- callback HTML’ine başarı/hata sonucu ile uygun sekme davranışını eklemek

### 6.3 `apps/connector`

Bu değişikliğin kritik yolunda değildir.

Bu iterasyonda connector tabanlı browser açma davranışı `/connections` ekranının login başlangıç akışında kullanılmayacaktır.

---

## 7. Teknik tasarım

### 7.1 Bağlantı başlangıcının frontend sahipliği

Yeni sekmenin doğru browser oturumunda açılması için sekme açma kararı backend’de değil frontend’de olmalıdır.

Bu nedenle akış şu şekilde kurulacaktır:

- `/connections` ekranındaki bağlantı state’i `apps/api /ai-profiles` ailesinden okunur
- frontend `POST /ai-profiles/openai/start` çağrısını yapar
- response içinden `authorizationUrl` alınır
- aynı click zinciri içinde `window.open(authorizationUrl, "_blank", "noopener")` çağrılır

Buradaki temel amaç, OAuth oturumunu kullanıcının zaten açık olan Chrome oturumu içinde başlatmaktır.

### 7.2 Durum okuma sözleşmesi

Manuel refresh sonrası bağlı durumun doğru görünmesi için `/connections` ekranının state kaynağı da aynı OAuth zinciriyle hizalanmalıdır.

Bu yüzden sayfa kapsamı içinde aşağıdaki veri kaynağı değişimi yapılacaktır:

- health/durum özeti: `GET /ai-profiles/health`
- bağlantı denemesi polling’i: `GET /ai-profiles/openai/attempts/:attemptId`
- yeniden bağlanma: `POST /ai-profiles/:profileId/reconnect`
- silme: `DELETE /ai-profiles/:profileId`

Bu karar önemlidir; çünkü yalnızca yeni sekmede login başlatmak yeterli değildir. Manuel refresh sonrasında ekranda bağlı durumu gösterecek veri de aynı OAuth kaynağından gelmelidir.

### 7.3 UI sözleşmesi

Bağlantı başlatma CTA’sı ürün yüzünde şu metinle görünmelidir:

- `OpenAI ile giriş yap`

Mevcut disconnected state içindeki ürün kopyası, “bağlan” yerine daha net şekilde “giriş yap” merkezli güncellenebilir; ancak ana zorunlu değişiklik CTA metnidir.

### 7.4 Callback HTML davranışı

`renderCallbackHtml(...)` mantığı başarı durumunda aşağıdaki unsurları içermelidir:

- başarı başlığı
- kısa açıklama
- sekmeyi kapatmayı deneyen küçük bir script
- kapanma olmazsa görünür kalacak fallback açıklaması

Örnek davranış düzeyi:

- sayfa yüklenir
- kısa bir `setTimeout` ile `window.close()` denenir
- sekme açık kalırsa kullanıcı yönlendirme metni görür

Bu tasarım, `window.close()` başarısız olduğunda sahte başarı üretmeden kullanıcıyı belirsizlikte bırakmamalıdır.

### 7.5 Otomatik senkronun bilinçli olarak yapılmaması

Bu iterasyonda aşağıdakiler **özellikle yapılmayacaktır**:

- `window.opener.postMessage(...)`
- `BroadcastChannel`
- callback sekmesinden ana sekmeyi otomatik yenileme
- bağlantı sonrası background polling ile UI yenileme

Bunun nedeni, onaylanan ürün kararının manuel refresh istemesidir.

---

## 8. Etkilenecek dosya alanları

Beklenen değişiklikler en az şu alanlarda toplanmalıdır:

- `C:/Users/berke/Desktop/Projelerim/dropshiping-win/apps/web/src/features/connections/hooks/useAIConnections.ts`
  - bağlantı state kaynağını `apps/api /ai-profiles` endpoint ailesi ile hizalama
  - bağlantı başlatma akışını `apps/api` OAuth start cevabı ile hizalama
  - yeni sekme açma davranışını burada veya buna yakın bir UI orchestration katmanında yönetme

- `C:/Users/berke/Desktop/Projelerim/dropshiping-win/apps/web/src/features/connections/components/ConnectorStatusCard.tsx`
  - buton metnini `OpenAI ile giriş yap` olarak güncelleme

- `C:/Users/berke/Desktop/Projelerim/dropshiping-win/apps/web/src/features/connections/lib/connectorApi.ts`
  - `/connections` ekranı için artık gerekli olmayan connector-start sahipliğinin kaldırılması veya bu sayfa kapsamından çıkarılması

- `C:/Users/berke/Desktop/Projelerim/dropshiping-win/apps/web/src/features/connections/routes/AIConnectionsPage.test.tsx`
  - buton click’inin `window.open` ile yeni sekme açtığını test etme
  - sekme açılamazsa hata gösterimini test etme

- `C:/Users/berke/Desktop/Projelerim/dropshiping-win/apps/web/src/app/api.ts`
  - mevcut `fetchConnectorHealth`, `startOpenAiConnection`, `fetchConnectionAttempt`, `reconnectConnectorProfile`, `deleteConnectorProfile` yardımcılarının `/ai-profiles` tabanlı akışta kullanıldığını doğrulama

- `C:/Users/berke/Desktop/Projelerim/dropshiping-win/apps/api/src/modules/ai/openAiOAuth.ts`
  - callback HTML’ine otomatik kapatma denemesi ve fallback metni ekleme

Gerekirse `C:/Users/berke/Desktop/Projelerim/dropshiping-win/apps/api/src/routes/aiProfiles.ts` testleri de callback davranışını doğrulayacak şekilde genişletilebilir.

---

## 9. Hata yönetimi

### 9.1 Yeni sekme açılamazsa

Neden:

- popup/sekme açma çağrısı tarayıcı tarafından engellenir
- `window.open(...)` null döner

Görünüm:

- kullanıcıya sade bir hata gösterilir
- örnek ürün dili: `Giriş sekmesi açılamadı. Tarayıcı izinlerini kontrol edip tekrar deneyin.`

### 9.2 OAuth başlangıcı başarısızsa

Neden:

- backend OAuth config eksik
- start endpoint hata döner

Görünüm:

- mevcut hata mesajı ürün yüzünde gösterilir
- kullanıcı aynı sayfadan tekrar deneyebilir

### 9.3 Callback başarılı ama sekme kapanmazsa

Neden:

- tarayıcı güvenlik politikası `window.close()` çağrısını reddeder

Görünüm:

- başarı mesajı kalır
- fallback yönlendirmesi görünür olur
- kullanıcı sekmeyi elle kapatır

### 9.4 Callback başarısızsa

Görünüm:

- hata mesajı sekmede görünür
- kullanıcı ana uygulamaya dönüp tekrar deneyebilir

---

## 10. Test stratejisi

### 10.1 Web testleri

Doğrulanacaklar:

- `/connections` ekranında `OpenAI ile giriş yap` butonu render ediliyor mu
- buton click’i `POST /ai-profiles/openai/start` sonucundaki `authorizationUrl` ile `window.open` çağırıyor mu
- `window.open` başarısız olduğunda kullanıcı hatayı görüyor mu
- bağlantı sonrası otomatik refresh yapılmadığı için istenmeyen senkron mekanizması devreye girmiyor mu

### 10.2 API testleri

Doğrulanacaklar:

- callback başarı HTML’inde kapatma scripti var mı
- callback başarı HTML’inde fallback yönlendirmesi var mı
- callback hata HTML’i kapatma denemesine zorlamadan hata mesajı gösteriyor mu

---

## 11. Başarı ölçütleri

Bu tasarım başarılı sayılacaksa:

- kullanıcı `/connections` ekranından `OpenAI ile giriş yap` butonunu kullanarak OAuth akışını başlatabilmeli
- OAuth akışı aynı açık tarayıcıda yeni sekme olarak açılmalı
- başarı callback’i sekmeyi kapatmayı denemeli
- kapanma başarısızsa kullanıcı açık ve sade bir yönlendirme görmeli
- ana uygulama sekmesi otomatik yenilenmemeli
- kullanıcı manuel refresh ile bağlı durumu görebilmeli

---

## 12. Kapsam dışı

Bu iterasyonda hedef dışı kalanlar:

- Etsy Prep ve diğer AI üretim akışlarını yeniden yönlendirmek
- connector tabanlı tüm bağlantı mimarisini kaldırmak
- bağlantı sonrası otomatik UI senkronu eklemek
- popup yerine modal/drawer/gömülü OAuth deneyimi kurmak
- çoklu sağlayıcı veya farklı OAuth provider çalışmaları

---

## 13. Uygulama notları

- Bu değişiklik tam bir AI bağlantı mimarisi yeniden yazımı değildir; odak noktası yalnızca `/connections` üzerindeki giriş başlatma UX’idir.
- En kritik teknik karar, yeni sekmenin frontend tarafından kullanıcı etkileşimi içinde açılmasıdır.
- Callback sekmesini kapatma denemesi “best effort” yaklaşımıyla ele alınmalıdır; başarısızlık normalleştirilmiş fallback metni ile yönetilmelidir.
