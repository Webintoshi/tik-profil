"use client";

import { motion } from "framer-motion";
import { Navigation } from "@/components/landing/Navigation";
import { Footer } from "@/components/landing/Footer";
import { MouseFollowerBackground } from "@/components/landing/MouseFollowerBackground";

export default function TermsOfServicePage() {
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
                                Kullanım Şartları
                            </h1>
                            <p className="text-xl text-slate-600">
                                Hizmetlerimizi kullanırken uymanız gereken kurallar ve koşullar.
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
                                <h3>1. Hizmetin Kabulü</h3>
                                <p>
                                    Tık Profil web sitesini ve hizmetlerini kullanarak, bu Kullanım Şartları'nı ve ilgili tüm yasaları ve düzenlemeleri kabul etmiş sayılırsınız. Bu şartları kabul etmiyorsanız, hizmetlerimizi kullanamazsınız.
                                </p>

                                <h3>2. Hesap Güvenliği</h3>
                                <p>
                                    Platformumuzda oluşturduğunuz hesabın güvenliğinden siz sorumlusunuz. Şifrenizi gizli tutmalı ve hesabınızla yapılan tüm işlemlerin sorumluluğunu üstlenmelisiniz. Şüpheli bir durum fark ederseniz derhal bize bildirmelisiniz.
                                </p>

                                <h3>3. Yasaklanmış Faaliyetler</h3>
                                <p>
                                    Hizmetlerimizi kullanırken aşağıdaki faaliyetlerde bulunmanız yasaktır:
                                </p>
                                <ul>
                                    <li>Yasa dışı, zararlı veya tehdit edici içerik paylaşmak.</li>
                                    <li>Başkalarının fikri mülkiyet haklarını ihlal etmek.</li>
                                    <li>Sistemlerimize zarar verecek virüs veya kötü amaçlı yazılım yaymak.</li>
                                    <li>Diğer kullanıcıların hizmeti kullanmasını engellemek.</li>
                                </ul>

                                <h3>4. Fikri Mülkiyet</h3>
                                <p>
                                    Tık Profil platformu, logosu, tasarımı ve tüm içeriği (kullanıcılar tarafından oluşturulan içerikler hariç) şirketimizin mülkiyetindedir ve telif hakkı yasalarıyla korunmaktadır.
                                </p>

                                <h3>5. Hizmet Değişiklikleri ve Fesih</h3>
                                <p>
                                    Hizmetlerimizi herhangi bir zamanda önceden bildirimde bulunmaksızın değiştirme, askıya alma veya sonlandırma hakkını saklı tutarız. Ayrıca, bu şartları ihlal etmeniz durumunda hesabınızı askıya alabilir veya silebiliriz.
                                </p>

                                <h3>6. Sorumluluk Reddi</h3>
                                <p>
                                    Hizmetlerimiz "olduğu gibi" sunulmaktadır. Kesintisiz veya hatasız çalışacağını garanti etmeyiz. Platformun kullanımından doğabilecek doğrudan veya dolaylı zararlardan sorumlu tutulamayız.
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
