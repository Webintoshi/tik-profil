## Durum Tespiti

* Ekran görüntüsünde `tik-profil/` klasörünün içine girilmiş görünüyor; bu yüzden yalnızca `ecommerce/`, `emlak/`, `fastfood/` alt klasörlerini görmeniz normal olabilir.

* İlk adımda bucket’ın kök dizininde (bir üst seviye) başka prefix’ler (`logos/`, `covers/`, `hotel/` vb.) var mı kesinleştirilecek.

## Kanıtlı Doğrulama (Kök Prefix Listesi)

* Uygulamanın kullandığı `CLOUDFLARE_R2_BUCKET_NAME` ve `CLOUDFLARE_R2_PUBLIC_URL` ile, sizin panelde baktığınız bucket/prefix’in aynı olup olmadığı doğrulanacak.

* R2 üzerinden programatik olarak kök prefix listesi alınacak (delimiter ile): hangi klasörler gerçekten var net çıkacak.

## Firestore → R2 Kapsam Kontrolü

* Firestore’da görsel alanları (logo/kapak/ürün/ilan/galeri/personel vb.) tüm koleksiyonlarda taranacak.

* Bulunan URL’ler için:

  * Firebase Storage URL kaldı mı?

  * `cdn.tikprofil.com/...` URL’lerinin R2’de karşılığı var mı (HEAD)?

  * CDN gerçekten 200 dönüyor mu (HEAD)?

## Eksik Aktarım Varsa Tamamlama

* Eğer bazı görsellerin URL’i CDN’de var ama R2’de obje yoksa:

  * Orijinal kaynaktan (Firebase veya mevcut URL) indirilip aynı key ile R2’ye yüklenecek.

  * Firestore’daki alanlar yeni URL/key ile güncellenecek.

## Uygulama Kullanım Noktaları (UI)

* Kod tabanında kalan “ham URL ile img/Image render” noktaları tespit edilecek.

* Hepsi tek standarda çekilecek:

  * CDN kökten doğruysa CDN URL

  * Değilse `/api/r2/...` proxy fallback

## Son Doğrulama

* `build` ve temel sayfalar (profil/kapak, emlak ilan, fastfood ürün, e-ticaret ürün) smoke test.

* Rapor: kaç URL tarandı, kaç obje doğrulandı, eksik varsa hangileri (koleksiyon/doküman/alan).

## Not

* Eğer bucket kökünde gerçekten sadece bu 3 klasör varsa, bu “kandırma” değil, iki olasılık demek: (1) profil/kapak görselleri hiç migrate edilmemiş/hiç yüklenmemiş, (2) profil/kapak başka bucket’ta tutuluyor. Plan bunu kesin veriye bağlayarak ayıracak.

