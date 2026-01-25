# Firebase Storage -> R2 Migration: Neden Hata Alıyoruz?

## Kök Neden
- Script şu an `import 'dotenv/config'` kullanıyor; bu varsayılan olarak `.env` dosyasını okur.
- Bizde R2 anahtarları `.env.local` içinde. Bu yüzden `process.env.CLOUDFLARE_R2_*` alanları script çalışırken boş kalıyor.
- [r2Storage.ts](file:///c:/Users/webin/.gemini/antigravity/scratch/tikprofil-trae/tikprofil-v2/src/lib/r2Storage.ts#L10-L17) içinde S3Client import anında oluşturuluyor; env boşsa AWS SDK “Resolved credential object is not valid” hatası veriyor.
- CORS bununla ilgili değil: migration ve API route’lar server-to-server çalışıyor, CORS sadece tarayıcıdan direkt isteklerde önemlidir.

# Yapılacaklar

## 1) Script’in `.env.local` Okumasını Garantile
- `dotenv/config` yerine `dotenv` ile explicit path kullan:
  - `dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })`
- Bu çağrı, R2 modülleri import edilmeden önce çalışacak.

## 2) r2Storage.ts’te Client’i “Lazy” Yap ve Env Validasyonu Ekle
- S3Client’i dosya yüklenir yüklenmez yaratmak yerine fonksiyon içinde “ilk kullanımda” oluştur.
- Eksik env varsa anlaşılır hata ver (hangi değişken eksik).

## 3) Migration’ı Base64/Blob Yerine Buffer ile Yap (Daha Sağlam)
- Şu an akış: Firebase’den indir → Blob → base64 → tekrar Blob → upload.
- Node ortamında daha doğru akış:
  - Firebase’den indir → `ArrayBuffer`/`Buffer` → R2’ye `PutObjectCommand(Body: Buffer)`
- Bu sayede hem hız artar hem bellek kullanımı düşer.

## 4) “Dry Run / Limit / Resume” Modları Ekle
- İlk test için `--limit 5` gibi argümanla küçük çalıştırma.
- Hata alan ID’leri loglayıp tekrar denemek için `--only ff_products` / `--resume` benzeri seçenek.

## 5) Migration Çalıştırma
- Önce development’da `--limit` ile test.
- Sonra full run.

## 6) Doğrulama (Görsel Kaybı Olmasın Diye)
- Firestore’da hâlâ `firebasestorage` geçen alanları tarayan kontrol script’i.
- R2’de object sayısı / örnek URL’lerle doğrulama.

## 7) Firebase Bağlantılarını Temizleme
- Uygulama kodunda Firebase Storage’a giden upload kodları zaten R2’ye geçti.
- Migration tamamlandıktan sonra:
  - Firebase Storage’a dair kalan yardımcı dosyalar/ayarlar kaldırılacak.
  - Bir süre “silmeden” önce prod gözlem (gerekirse 1 hafta).

# Sonuç
- Tüm mevcut görseller R2’ye taşınacak.
- Firestore’daki URL’ler R2 (`https://cdn.tikprofil.com/...`) olacak.
- Ardından Firebase Storage bağımlılığını tamamen kaldırabileceğiz.
