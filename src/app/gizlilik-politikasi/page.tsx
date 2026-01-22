"use client";

import { motion } from "framer-motion";
import { Navigation } from "@/components/landing/Navigation";
import { Footer } from "@/components/landing/Footer";
import { MouseFollowerBackground } from "@/components/landing/MouseFollowerBackground";

export default function PrivacyPolicyPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-white via-sky-50 to-blue-50 text-slate-700 selection:bg-blue-500/20 selection:text-blue-900 overflow-x-hidden relative">
            <MouseFollowerBackground />
            
            <div className="relative z-10 flex flex-col min-h-screen">
                <Navigation />
                
                <main className="flex-grow pt-32 pb-20 px-6">
                    <div className="max-w-4xl mx-auto">
                        {/* Header Section */}
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-center mb-16"
                        >
                            <h1 className="text-4xl md:text-5xl font-bold mb-6 text-slate-800">
                                Gizlilik Politikası
                            </h1>
                            <p className="text-xl text-slate-600">
                                Verilerinizin güvenliği ve gizliliği bizim için en önemli önceliktir.
                            </p>
                        </motion.div>

                        {/* Content Card */}
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="p-8 md:p-12 rounded-3xl bg-white/60 backdrop-blur-xl border border-white/50 shadow-sm"
                        >
                            <div className="prose prose-slate prose-lg max-w-none">
                                <h3>1. Veri Toplama ve Kullanımı</h3>
                                <p>
                                    Tık Profil olarak, hizmetlerimizi sunabilmek ve geliştirebilmek amacıyla bazı kişisel verilerinizi topluyoruz. Bu veriler, adınız, e-posta adresiniz ve profilinizde paylaşmayı seçtiğiniz içerikleri kapsayabilir. Toplanan veriler, yalnızca size daha iyi bir deneyim sunmak için kullanılır ve üçüncü taraflarla izniniz olmadan paylaşılmaz.
                                </p>

                                <h3>2. Çerezler (Cookies)</h3>
                                <p>
                                    Web sitemizdeki deneyiminizi kişiselleştirmek ve trafiği analiz etmek için çerezler kullanıyoruz. Çerezler, tarayıcınız tarafından cihazınıza kaydedilen küçük metin dosyalarıdır. Tarayıcı ayarlarınızdan çerez tercihlerinizi dilediğiniz zaman değiştirebilirsiniz.
                                </p>

                                <h3>3. Veri Güvenliği</h3>
                                <p>
                                    Kişisel verilerinizin güvenliğini sağlamak için endüstri standardı güvenlik önlemleri uyguluyoruz. Verileriniz, yetkisiz erişime, değişikliğe veya silinmeye karşı korunmaktadır. SSL şifreleme teknolojisi ile tüm veri transferleri güvence altına alınmıştır.
                                </p>

                                <h3>4. Üçüncü Taraf Hizmetler</h3>
                                <p>
                                    Hizmetlerimizi sunarken, analitik, ödeme işleme ve barındırma gibi konularda güvenilir üçüncü taraf sağlayıcılarla çalışabiliriz. Bu sağlayıcılar, verilerinizi yalnızca bizim adımıza ve talimatlarımız doğrultusunda işlemekle yükümlüdür.
                                </p>

                                <h3>5. Haklarınız</h3>
                                <p>
                                    KVKK ve ilgili yasalar kapsamında, kişisel verilerinize erişme, düzeltme, silme ve işlenmesini kısıtlama hakkına sahipsiniz. Bu haklarınızı kullanmak için <a href="/iletisim" className="text-blue-600 hover:underline">iletişim sayfamız</a> üzerinden bizimle irtibata geçebilirsiniz.
                                </p>

                                <h3>6. Değişiklikler</h3>
                                <p>
                                    Bu gizlilik politikasını zaman zaman güncelleyebiliriz. Önemli değişiklikler olması durumunda, kayıtlı e-posta adresiniz veya web sitemiz üzerinden sizi bilgilendireceğiz.
                                </p>

                                <div className="mt-8 pt-8 border-t border-slate-200 text-sm text-slate-500">
                                    Son güncelleme: 14 Ocak 2025
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </main>

                <Footer />
            </div>
        </div>
    );
}
