# UI Tasarim Rehberi

Bu belge, `apps/web` icindeki mevcut arayuzun analizinden uretilmistir ve bundan sonraki UI gelistirmeleri icin ana referanstir.

## 1) Tasarim Kimligi (Mevcut Durum)

- Urun tipi: operasyon odakli dashboard.
- Ana his: temiz, kurumsal, gorev odakli.
- Temel ton: `slate` tabanli notr yuzeyler + turuncu aksiyon vurgusu.
- Yuzey dili: yuksek yuvarlatma (`rounded-2xl`, `rounded-3xl`, yer yer `rounded-[28px]`) ve yumusak golge (`shadow-sm`).

## 2) Gorsel Sistem

### 2.1 Renk paleti

- Arkaplan tabani: `#f8fafc` (genel sayfa zemini).
- Metin ana renk: `#0f172a`.
- Sidebar / koyu aksan: `#051125`.
- Birincil vurgu: `#F1641E` (buton, focus, link vurgu).
- Hata: `rose-600/700` tonlari.
- Uyari/inceleme: `amber` tonlari.
- Basari: `emerald` tonlari.

Not: Ayni turuncu vurgu icin birden fazla hover tonu geciyor (`#d95518`, `#d95716`). Yeni islerde tek bir hover tonu secilip tutarli kullanilmali.

### 2.2 Tipografi

- Global font stack: `Inter, Manrope, system-ui...`.
- Sayfa basliklari: genelde `text-3xl font-semibold`.
- Ikinci seviye basliklar: `text-xl` - `text-lg`, `font-semibold`.
- Yardimci metinler: `text-sm text-slate-500/600`.
- Etiket ust basliklari: `uppercase + tracking` desenleri (ornegin `tracking-[0.28em]`).

### 2.3 Sekil ve bosluk

- Kart/bolum kapsayicilarinda yuvarlatma yuksek: `rounded-2xl` / `rounded-3xl`.
- Form elemanlari: `rounded-xl` veya `rounded-2xl`.
- Dikey ritim: cogunlukla `space-y-6`.
- Ic bosluk: kartlarda `p-5/p-6`, form alanlarinda `px-3..4 py-2..3`.

## 3) Yerlesim ve Sayfa Iskeleti

- Ana kabuk: sol sabit sidebar + sag icerik (`lg:grid-cols-[260px_1fr]`).
- Sidebar: koyu zemin, acik metin, nav linklerinde hafif translucent aktif/pasif durumlar.
- Icerik alani: acik zemin, kart tabanli bloklar, mobilde tek kolon, buyuk ekranda grid yapilari.
- Sayfa baslangicinda buyuk "hero/header card" deseni tekrar ediyor.

## 4) Bilesen Desenleri

### 4.1 Kartlar

- Standart kart: `rounded-3xl border border-slate-200 bg-white shadow-sm`.
- Icerikte ustte baslik + altta metrik/aksiyon alani deseni yaygin.

### 4.2 Butonlar

- Primary eylem: turuncu dolu (`bg-[#F1641E] text-white`).
- Secondary koyu eylem: lacivert dolu (`bg-[#051125] text-white`).
- Notr eylem: acik zemin + ince border (`border-slate-200 bg-white`).
- Riskli eylem: rose tonlari (`border-rose-200 bg-rose-50 text-rose-700`).
- Uyari/favori: amber tonlari.

### 4.3 Form alanlari

- Input/select/textarea: ince notr border + turuncu focus (`focus:border-[#F1641E]`).
- Formlar kart icinde gruplanmis ve acik etiketleme kullaniyor.

### 4.4 Durum gostergeleri

- Renk kodlu badge yapisi var (`OK/ACTIVE/REVIEW_NEEDED/PARSE_ERROR` vb.).
- Yukleme/hata mesajlari metin tabanli ve sade.

### 4.5 Sekmeli gezinme

- Kategori veya durum bazli ust seviye gecislerde `rounded-2xl` sekme/buton grubu kullanilabilir.
- Varsayilan sekme: acik zemin + border (`border-slate-200 bg-slate-50 text-slate-700`).
- Birincil aktif sekme: turuncu dolu (`bg-[#F1641E] text-white`).
- Ikincil aktif sekme: koyu lacivert dolu (`bg-[#051125] text-white`).
- Ozel durum sekmeleri (ornegin `Kategorisiz`) amber tonlariyla vurgulanabilir.
- Sekme etiketlerinde adet gostergesi ayni satirda yer alabilir: `Kategori (12)`.

### 4.6 Acilir kapanir kartlar

- Detay yogun bolumlerde kart basligi ve kisa ozet varsayilan olarak gorunur tutulabilir.
- Detay acma/kapatma eylemi notr buton deseniyle verilmeli: `border-slate-200 bg-white text-slate-700`, hover durumunda turuncu vurgu.
- Acik/kapali durum `aria-expanded` ile erisilebilir olmali ve buton metni durumu acikca anlatmalidir (`Detaylari goster` / `Detaylari gizle`).
- Detay icerigi acildiginda mevcut kart ritmi korunarak `mt-4` ve `space-y-*` bosluklariyla yerlestirilmelidir.

### 4.7 Prompt kutuphanesi kartlari

- Prompt kartlari standart kart desenini kullanmali: `rounded-3xl border border-slate-200 bg-white shadow-sm`.
- Kartin gorsel bolumu `aspect-[4/3]` oraninda tutulmali; gorseller kirpilmadan `object-contain object-center` ile ortalanmali, gorsel yoksa acik slate placeholder kullanilmali.
- Kart/gorsel tiklama davranisi prompt kopyalama oldugundan, kart uzerinde kisa bir `Tikla kopyala` rozeti bulunmali.
- Master Prompt karti ayni kart sisteminde kalmali ancak turuncu vurgulu border/badge ile normal kartlardan ayrilmalidir.
- Markdown prompt editoru icin ham metin alani + sade onizleme blogu birlikte gosterilmeli; kopyalama ham markdown metnini kullanmalidir.
- Gorsel secme alani dosya secildiginde renkli durum ve dosya adi ile secimin basarili oldugunu belli etmelidir.

## 5) Tutarlilik Gozlemleri ve Teknik Borc

- Tasarim tokenlari merkezi degil; Tailwind theme `extend` su an bos.
- Hex renk tekrarlarina bagli daginiklik var (ozellikle turuncu hover/focus tonlari).
- Kart/form/button siniflari feature bazinda tekrarli; ortak UI primitive katmani guclendirilebilir.

Bu borclar kapatilirken mevcut gorsel dili bozmayacak, adimli bir gecis tercih edilmeli.

## 6) Uygulama Kurallari (Zorunlu)

UI tarafinda yapilacak her yeni gelistirme icin:

1. Bu dosyadaki renk, tipografi, yaricap, bosluk ve bilesen desenleri referans alinacak.
2. Yeni ekran/bilesen mevcut desenlerden biriyle eslesmiyorsa once en yakin desen secilecek, sonra gerekli fark en kucuk degisiklikle uygulanacak.
3. Tasarim diline yeni bir kural/patern ekleniyorsa ayni PR/degisiklikte bu dosya guncellenecek.
4. Mevcut tasarimla bilerek celisen bir karar alinacaksa gerekce kisa ve olculebilir sekilde yazilacak.

## 7) Hizli UI Kontrol Listesi

- Renk kullanimi bu belgedeki palete uyuyor mu?
- Kart/form yuvarlatma dili (`xl/2xl/3xl`) tutarli mi?
- Birincil aksiyonlar turuncu, riskli aksiyonlar rose tonlarinda mi?
- Yatay/dikey bosluklar benzer ekranlarla uyumlu mu?
- Mobil ve masaustu kiriliminda layout bozulmadan calisiyor mu?
