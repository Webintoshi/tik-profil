# Akıllı Rota Keşfet Tasarımı

## Amaç

Tık Profil mobil uygulamasındaki Keşfet ve şehir rehberi ekranlarını, düz metin ve renkli kutu ağırlıklı yapıdan çıkarıp fotoğraf, rota ve yerel işletme bağlantılarıyla çalışan bir şehir keşif deneyimine dönüştürmek.

Başarı ölçütleri:

- Keşfet ekranının ilk görünümünde Ordu'yu temsil eden güçlü bir görsel ve en az bir uygulanabilir rota görünür.
- Rehber kartlarının tamamında yönetim panelinden gelen görsel bulunur.
- Kullanıcı bir rota durağından bağlı Tık Profil işletmesine veya cihazın harita uygulamasına geçebilir.
- Rehber detayları tek tip paragraf yığını olarak görünmez; kapak, rota özeti, duraklar ve editoryal bölümler ayrı görsel bloklardır.
- Gündüz ve gece temaları aynı bilgi hiyerarşisini ve erişilebilir kontrastı korur.

## Tasarım Yönü

Seçilen yön **Akıllı Rota**dır. Deneyim bir seyahat yazısını okunacak metinden, uygulanabilecek şehir rotasına dönüştürür.

Ana görsel karakter:

- Sıcak, doğal ve yerel fotoğraflar.
- Amber yalnızca vurgu, sıra numarası ve birincil eylemlerde kullanılır.
- Açık temada kırık beyaz yüzeyler; koyu temada kömür tonlu yüzeyler kullanılır.
- Harita alanı dekoratif bir kart değildir. Rota konumlarını ve sırasını anlatan tam genişlikte bir yön bulma yüzeyidir.
- Kartlarda tek başına ikon kullanılmaz; gerçek görsel varsa görsel, yoksa kontrollü yükleme/boş durum yüzeyi gösterilir.

## Keşfet Ana Ekranı

### Üst Alan

- Başlık: `Bugün Ordu'da` ve `Rotanı seç`.
- Sağda arama yerine kaydedilen rotalara/favorilere erişim bulunur.
- Şehir kimliği uygulamanın pilot bölge bilgisinden gelir.

### Rota Vitrini

- Yönetim panelinde öne çıkarılmış ilk yayın, büyük rota yüzeyi olarak gösterilir.
- Yüzeyde numaralı durak işaretleri, toplam süre, rota başlığı ve kısa açıklama bulunur.
- Durak yerleşimi koordinatlardan normalize edilir. Koordinat yoksa yönetim panelindeki sıra kullanılarak kararlı bir editoryal yerleşim üretilir.
- Rota yüzeyine dokunmak rehber detayını uygulama içinde açar.

### Rota Kartları

- Her kartta kapak görseli, kategori, okuma/rota süresi, başlık ve durak sayısı bulunur.
- Yatay sayfalandırma yerine doğal yatay kaydırma kullanılır.
- Görseli olmayan yayınlar son kullanıcıya yayınlanmış rota olarak gösterilmez; admin panelinde eksik medya uyarısı alır.

### Yakındaki İşletmeler

- Rota duraklarında `businessSlug` ile bağlanan işletmeler ayrı kopya içerik üretmeden mevcut işletme profillerinden alınır.
- Bu bölüm rehberle ilişkili profilleri kompakt, fotoğraflı satırlar olarak gösterir.
- Favori butonu korunur; ek arama butonu eklenmez.

## Rehber Detay Ekranı

### Kapak ve Özet

- Üstte tam genişlikte kapak görseli bulunur.
- Geri butonu görselin üzerinde küçük, erişilebilir bir yüzeydir.
- Başlık, kategori, süre ve kısa özet görselin hemen altında yer alır.

### Rota Özeti

- Toplam süre, durak sayısı ve rota türü tek satırda gösterilir.
- Rota ön izlemesi durakların sırasını görselleştirir.
- Bu yüzey gerçek bir harita motoru gibi davranmaz; hızlı ve çevrimdışı uyumlu rota özeti sağlar.

### Durak Akışı

- Duraklar numaralı, fotoğraflı ve dikey bir zaman çizgisi olarak listelenir.
- Her durakta ad, ilçe, önerilen süre, kısa editör notu ve isteğe bağlı bağlı işletme bulunur.
- Koordinat varsa `Yol tarifi` cihazın harita uygulamasını açar.
- Bağlı işletme varsa `Profili aç` mevcut native işletme profiline gider.

### Editoryal İçerik

- İçerik `sections` dizisinden başlık, metin ve isteğe bağlı görsel bloklarıyla render edilir.
- Eski Markdown içerik geriye dönük uyumluluk için okunur; yeni yayınlarda yapılandırılmış bölümler kullanılır.
- Uzun metinler tek bir çerçeveli kart içine alınmaz. Bölümler sayfa üzerinde doğal akışta yer alır.

## Veri Modeli

`BlogPost` aşağıdaki isteğe bağlı alanlarla genişletilir:

```ts
interface GuideSection {
  id: string;
  heading: string;
  body: string;
  imageUrl?: string;
}

interface RouteStop {
  id: string;
  order: number;
  name: string;
  district?: string;
  note: string;
  imageUrl: string;
  durationMinutes?: number;
  latitude?: number;
  longitude?: number;
  businessSlug?: string;
}

interface BlogPost {
  // mevcut alanlar
  featured?: boolean;
  routeDurationMinutes?: number;
  sections?: GuideSection[];
  routeStops?: RouteStop[];
}
```

API doğrulaması sıra numaralarının benzersiz, koordinatların geçerli aralıkta ve URL alanlarının güvenli HTTP(S) adresleri olmasını zorunlu tutar.

## Yönetim Paneli

- Kapak görseli için URL yazma zorunluluğu kaldırılır; R2 yükleme butonu eklenir.
- Bölüm ekleme, sıralama ve bölüm görseli yükleme alanı eklenir.
- Rota durağı ekleme, silme ve yeniden sıralama alanı eklenir.
- Durak görseli, ilçe, süre, koordinat ve bağlı işletme seçimi yönetilebilir.
- Yayınlamadan önce kapak ve her rota durağı için görsel doğrulaması yapılır.
- Mevcut iki Ordu rehberi yönetim panelindeki dinamik kayıtlarda yeni modele taşınır; mobil pakete statik içerik eklenmez.

## Görsel Varlıklar

- Mevcut boş `coverImage` alanları Ordu'ya özgü yeni kapak görselleriyle doldurulur.
- Görseller proje içine gömülmez; R2'ye yüklenir ve admin kayıtlarında URL olarak saklanır.
- Ağ hatasında son başarılı önbellek korunur. Görsel yüklenemezse sabit boyutlu skeleton kullanılır; düzen kaymaz.

## Tema ve Erişilebilirlik

- Tüm metin/zemin eşleşmeleri mevcut tema tokenları üzerinden gelir.
- Amber normal gövde metni olarak kullanılmaz; vurgu ve eylem rengidir.
- Görseller için anlamlı erişilebilirlik etiketleri bulunur.
- Dokunma alanları en az 44x44 noktadır.
- Azaltılmış hareket tercihinde giriş ve basma animasyonları kaldırılır.
- Yazı büyütmede başlıklar satır kırar; süre ve sıra numarası alanları sabit ölçüyle taşmayı önler.

## Hata ve Boş Durumlar

- Şehir rehberi alınamazsa son başarılı veri korunur.
- Kapaksız veya duraksız yayın vitrine çıkmaz; diğer yayınlar çalışmaya devam eder.
- Bağlı işletme silinmişse yalnızca profil eylemi gizlenir.
- Harita uygulaması açılamazsa kullanıcıya kısa hata mesajı gösterilir; ekran bozulmaz.
- Bozuk Türkçe karakterler veri katmanında normalize edilir; UI bileşenlerinde mojibake düzeltme zinciri tutulmaz.

## Test Stratejisi

- Veri modeli ve API doğrulaması için birim testleri.
- Admin formunda görsel, durak sırası, koordinat ve bağlı işletme testleri.
- Keşfet sunum durumları: dolu, kapaksız, duraksız, çevrimdışı ve kısmi API hatası.
- Rehber detayında Markdown geriye dönük uyumluluk ve yapılandırılmış bölüm testleri.
- Gündüz/gece, 360/390/430 genişlik, yüksek yazı ölçeği ve azaltılmış hareket görsel testleri.
- Android cihazda rota açma ve işletme profiline geçiş smoke testi.

## Kapsam Dışı

- Uygulama içine tam navigasyon veya dönüş bazlı yol tarifi eklenmeyecek.
- Kullanıcının kendi rotasını düzenlemesi bu sürümde yer almayacak.
- Yönetim paneli dışında statik şehir rehberi içeriği oluşturulmayacak.
