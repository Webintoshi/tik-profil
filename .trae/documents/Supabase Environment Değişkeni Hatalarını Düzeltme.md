## Supabase Environment Değişkeni Hataları Düzeltme

### Sorun
Konsol log'larında `Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY` hataları var. Bu hataların sebebi:

1. **documentStore.ts**: `getDocumentREST` fonksiyonunda client-side kontrol eksik
2. **businessStore.ts**: `getBusiness` fonksiyonu client-side'da da `getDocumentREST` çağırıyor, bu da `getSupabaseAdmin()` çağırıyor

### Çözüm
1. **documentStore.ts**: `getDocumentREST` fonksiyonuna client-side guard ekle (tarayıcıda boş array dön)
2. **businessStore.ts**: `getBusiness` fonksiyonunu güncelle (client-side'da API endpoint kullan)