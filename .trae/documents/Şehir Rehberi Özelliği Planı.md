# Onaylanan Plan: Şehir Rehberi ve Yönetim Sistemi

Onayınız üzerine, "hayal kırıklığına uğratmayacak" kalitede ve güvenlikte sistemi kurmaya başlıyorum.

## Adım 1: Güvenli Veri Altyapısı (Hemen Başlanıyor)
*   **Dosya:** `src/lib/data/cities.json` oluşturulacak.
*   **İçerik:** **Ordu** için özel olarak hazırlanmış, Boztepe ve Yason Burnu gibi yüksek kaliteli görseller içeren zengin bir veri seti ile başlatılacak.
*   **API:** `/api/cities` rotası ile bu verilerin güvenli okunması sağlanacak.

## Adım 2: Görsel Şölen (City Guide Bileşeni)
*   **Tasarım:** Apple Glass temasında, geniş kapak görselli, kaydırılabilir yer kartlarına sahip, animasyonlu bir bileşen kodlanacak.
*   **Konum:** Kullanıcının seçtiği şehre göre anlık ve akıcı (smooth) geçiş yapacak.

## Adım 3: Entegrasyon ve Test
*   `/kesfet` sayfasına bu bileşen eklenecek.
*   İstanbul -> Ordu geçişi test edilerek "flicker" (titreme) olmadığı doğrulanacak.

## Adım 4: Yönetim Paneli
*   Siz sonucu görüp beğendikten sonra, `/panel/cities` altında bu verileri yönetebileceğiniz ekranlar eklenecek.

Sisteminizde hiçbir bozulma yaratmadan, cerrahi bir titizlikle kodlamaya başlıyorum.