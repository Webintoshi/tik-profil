
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env vars
// Manuel olarak bilinen değerleri kullanalım çünkü .env parsing ile uğraşmayalım
const SUPABASE_URL = "https://qnyljwmtwxwdubykxovg.supabase.co";
// Anon key from previous steps
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFueWxqd210d3h3ZHVieWt4b3ZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1MDkxMzksImV4cCI6MjA4NDA4NTEzOX0.vvQZNJqDWtKjdgsZC8oh4ZXUS05k5h5mXEjn_NNd_Jw";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkGoogleAuth() {
  console.log("Checking Google Auth status...");
  
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'http://localhost:3000/auth/callback',
        skipBrowserRedirect: true 
      }
    });

    if (error) {
      console.error("❌ HATA: Google Auth başarısız oldu.");
      console.error("Hata Detayı:", error.message);
      if (error.message.includes('not enabled')) {
        console.log("🔴 SONUÇ: Google sağlayıcısı henüz AKTİF DEĞİL.");
      }
    } else if (data && data.url) {
      console.log("✅ BAŞARILI: Google Auth URL'i oluşturuldu.");
      console.log("URL:", data.url.substring(0, 50) + "...");
      console.log("🟢 SONUÇ: Google sağlayıcısı AKTİF ve çalışıyor.");
    } else {
      console.log("⚠️ BEKLENMEYEN DURUM:", data);
    }
  } catch (err) {
    console.error("Kompleks hata:", err);
  }
}

checkGoogleAuth();
