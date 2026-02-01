"use client";

import { motion } from "framer-motion";
import { Navigation } from "@/components/landing/Navigation";
import { Footer } from "@/components/landing/Footer";
import { MouseFollowerBackground } from "@/components/landing/MouseFollowerBackground";

export default function KVKKPage() {
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
                                KVKK Aydınlatma Metni
                            </h1>
                            <p className="text-xl text-slate-600">
                                Kişisel Verilerin Korunması Kanunu kapsamında bilgilendirme.
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
                                <h3>1. Veri Sorumlusu</h3>
                                <p>
                                    6698 sayılı Kişisel Verilerin Korunması Kanunu (“KVKK”) uyarınca, kişisel verileriniz; veri sorumlusu olarak Tık Profil Teknoloji A.Ş. (“Şirket”) tarafından aşağıda açıklanan kapsamda işlenebilecektir.
                                </p>

                                <h3>2. Kişisel Verilerin İşlenme Amacı</h3>
                                <p>
                                    Toplanan kişisel verileriniz, Şirketimiz tarafından sunulan ürün ve hizmetlerden sizleri faydalandırmak için gerekli çalışmaların iş birimlerimiz tarafından yapılması, Şirketimiz tarafından sunulan ürün ve hizmetlerin sizlerin beğeni, kullanım alışkanlıkları ve ihtiyaçlarına göre özelleştirilerek sizlere önerilmesi, Şirketimizin ve Şirketimizle iş ilişkisi içerisinde olan ilgili kişilerin hukuki ve ticari güvenliğinin temini amaçlarıyla işlenecektir.
                                </p>

                                <h3>3. İşlenen Kişisel Verilerin Kimlere ve Hangi Amaçla Aktarılabileceği</h3>
                                <p>
                                    Toplanan kişisel verileriniz; yukarıda belirtilen amaçların gerçekleştirilmesi doğrultusunda, iş ortaklarımıza, tedarikçilerimize, hissedarlarımıza, kanunen yetkili kamu kurumlarına ve özel kişilere, KVKK’nın 8. ve 9. maddelerinde belirtilen kişisel veri işleme şartları ve amaçları çerçevesinde aktarılabilecektir.
                                </p>

                                <h3>4. Kişisel Veri Toplamanın Yöntemi ve Hukuki Sebebi</h3>
                                <p>
                                    Kişisel verileriniz, Şirketimiz tarafından farklı kanallar ve farklı hukuki sebeplere dayanarak; ticari faaliyetlerimizi yürütmek amacıyla toplanmaktadır. Bu süreçte toplanan kişisel verileriniz; internet sitemiz, mobil uygulamamız, çağrı merkezimiz gibi kanallarla fiziki veya elektronik ortamda toplanmaktadır.
                                </p>

                                <h3>5. Kişisel Veri Sahibinin Hakları</h3>
                                <p>
                                    KVKK’nın 11. maddesi uyarınca kişisel veri sahipleri;
                                </p>
                                <ul>
                                    <li>Kişisel veri işlenip işlenmediğini öğrenme,</li>
                                    <li>Kişisel verileri işlenmişse buna ilişkin bilgi talep etme,</li>
                                    <li>Kişisel verilerin işlenme amacını ve bunların amacına uygun kullanılıp kullanılmadığını öğrenme,</li>
                                    <li>Yurt içinde veya yurt dışında kişisel verilerin aktarıldığı üçüncü kişileri bilme,</li>
                                    <li>Kişisel verilerin eksik veya yanlış işlenmiş olması hâlinde bunların düzeltilmesini isteme haklarına sahiptir.</li>
                                </ul>

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
