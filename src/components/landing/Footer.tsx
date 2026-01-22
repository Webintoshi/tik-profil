"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Globe } from "lucide-react";
import { TikLogo } from "@/components/TikLogo";

export function Footer() {
    const socialLinks = [
        { name: "Instagram", icon: Globe },
        { name: "X", icon: Globe },
        { name: "LinkedIn", icon: Globe },
    ];

    return (
        <footer className="border-t border-white/30 bg-white/40 backdrop-blur-xl pt-20 pb-10">
            <div className="max-w-7xl mx-auto px-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
                    <div className="md:col-span-2">
                        <Link href="/" className="inline-block mb-6">
                            <TikLogo className="w-9 h-9" variant="light" />
                        </Link>
                        <p className="text-slate-700/80 max-w-md leading-relaxed mb-6">
                            İşletmeler için geliştirilmiş yeni nesil dijital kimlik ve yönetim platformu.
                            Tek link, sınırsız olasılık.
                        </p>
                        <div className="flex gap-4">
                            {socialLinks.map((social) => (
                                <motion.a
                                    key={social.name}
                                    href="#"
                                    whileHover={{ scale: 1.1, y: -2 }}
                                    className="w-10 h-10 rounded-xl bg-white/50 backdrop-blur-sm border border-white/40 hover:bg-white/60 hover:border-white/60 flex items-center justify-center text-slate-600 hover:text-blue-600 transition-all font-medium"
                                >
                                    <social.icon className="w-5 h-5" />
                                </motion.a>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h4 className="font-bold mb-5 text-slate-800/95">Platform</h4>
                        <ul className="space-y-3 text-slate-700/80">
                            {['Özellikler', 'Modüller', 'Fiyatlandırma', 'Entegrasyonlar'].map((link) => (
                                <li key={link}>
                                    <a href="#" className="hover:text-blue-600 transition-colors">{link}</a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-bold mb-5 text-slate-800/95">Şirket</h4>
                        <ul className="space-y-3 text-slate-700/80">
                            <li><a href="/hakkimizda" className="hover:text-blue-600 transition-colors">Hakkımızda</a></li>
                            <li><a href="/blog" className="hover:text-blue-600 transition-colors">Blog</a></li>
                            <li><a href="/kariyer" className="hover:text-blue-600 transition-colors">Kariyer</a></li>
                            <li><a href="/iletisim" className="hover:text-blue-600 transition-colors">İletişim</a></li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-white/30 pt-10 flex flex-col md:flex-row justify-between items-center gap-4 text-slate-700/70 text-sm">
                    <p>© 2025 Tık Profil. Tüm hakları saklıdır.</p>
                    <div className="flex gap-8">
                        <a href="/gizlilik-politikasi" className="hover:text-blue-600 transition-colors">Gizlilik Politikası</a>
                        <a href="/kullanim-sartlari" className="hover:text-blue-600 transition-colors">Kullanım Şartları</a>
                        <a href="/kvkk" className="hover:text-blue-600 transition-colors">KVKK</a>
                    </div>
                </div>
            </div>
        </footer>
    );
}
