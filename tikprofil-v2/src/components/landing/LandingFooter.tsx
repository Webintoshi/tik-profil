"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { TikLogo } from "@/components/TikLogo";
import { ArrowUpRight, Mail, Phone, MapPin } from "lucide-react";

const footerLinks = {
    product: [
        { name: "Özellikler", href: "#features" },
        { name: "Fiyatlandırma", href: "#pricing" },
        { name: "Demo", href: "/demo" },
        { name: "Entegrasyonlar", href: "/entegrasyonlar" },
    ],
    resources: [
        { name: "Blog", href: "/blog" },
        { name: "Destek", href: "/destek" },
        { name: "SSS", href: "/sss" },
        { name: "Dökümanlar", href: "/docs" },
    ],
    company: [
        { name: "Hakkımızda", href: "/hakkimizda" },
        { name: "İletişim", href: "/iletisim" },
        { name: "Kariyer", href: "/kariyer" },
        { name: "Basın Kiti", href: "/basin" },
    ],
    legal: [
        { name: "Gizlilik", href: "/gizlilik" },
        { name: "Kullanım Şartları", href: "/kullanim-sartlari" },
        { name: "KVKK", href: "/kvkk" },
    ],
};

export function LandingFooter() {
    return (
        <footer className="relative bg-[#030014] border-t border-white/5">
            {/* Background glow */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(139,92,246,0.05),transparent_60%)]" />

            <div className="relative z-10 max-w-7xl mx-auto px-6 py-20">
                {/* Top Section */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 mb-16">
                    {/* Brand */}
                    <div className="lg:col-span-2">
                        <Link href="/" className="flex items-center gap-3 mb-6">
                            <TikLogo className="w-10 h-10 rounded-xl" variant="dark" />
                            <span className="font-bold text-2xl text-white">TikProfil</span>
                        </Link>
                        <p className="text-gray-400 max-w-sm mb-8 leading-relaxed">
                            İşletmenizi dijitalleştirin. Tek platform, sonsuz olasılık.
                        </p>

                        {/* Contact */}
                        <div className="space-y-3">
                            <a href="mailto:destek@tikprofil.com" className="flex items-center gap-3 text-gray-400 hover:text-violet-400 transition-colors">
                                <Mail className="w-4 h-4" />
                                <span className="text-sm">destek@tikprofil.com</span>
                            </a>
                            <a href="tel:+908501234567" className="flex items-center gap-3 text-gray-400 hover:text-violet-400 transition-colors">
                                <Phone className="w-4 h-4" />
                                <span className="text-sm">0850 123 45 67</span>
                            </a>
                            <div className="flex items-center gap-3 text-gray-400">
                                <MapPin className="w-4 h-4" />
                                <span className="text-sm">İstanbul, Türkiye</span>
                            </div>
                        </div>
                    </div>

                    {/* Links */}
                    <div>
                        <h4 className="font-semibold text-white mb-4">Ürün</h4>
                        <ul className="space-y-3">
                            {footerLinks.product.map((link) => (
                                <li key={link.name}>
                                    <Link href={link.href} className="text-gray-400 hover:text-white transition-colors text-sm flex items-center gap-1 group">
                                        {link.name}
                                        <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-semibold text-white mb-4">Kaynaklar</h4>
                        <ul className="space-y-3">
                            {footerLinks.resources.map((link) => (
                                <li key={link.name}>
                                    <Link href={link.href} className="text-gray-400 hover:text-white transition-colors text-sm flex items-center gap-1 group">
                                        {link.name}
                                        <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-semibold text-white mb-4">Şirket</h4>
                        <ul className="space-y-3">
                            {footerLinks.company.map((link) => (
                                <li key={link.name}>
                                    <Link href={link.href} className="text-gray-400 hover:text-white transition-colors text-sm flex items-center gap-1 group">
                                        {link.name}
                                        <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Bottom Section */}
                <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-gray-500 text-sm">
                        © {new Date().getFullYear()} TikProfil. Tüm hakları saklıdır.
                    </p>

                    <div className="flex items-center gap-6">
                        {footerLinks.legal.map((link) => (
                            <Link key={link.name} href={link.href} className="text-gray-500 hover:text-gray-300 transition-colors text-sm">
                                {link.name}
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </footer>
    );
}
