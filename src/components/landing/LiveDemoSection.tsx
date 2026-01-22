"use client";

import { motion } from "framer-motion";
import { ArrowRight, Phone, MessageCircle, MapPin, Clock, ExternalLink } from "lucide-react";
import Link from "next/link";

export function LiveDemoSection() {
  const profiles = [
    {
      name: "Lezzet Durağı",
      category: "Restoran",
      initials: "LD",
      gradient: "from-orange-400 to-red-500",
      location: "Kadıköy, İstanbul",
      rating: 4.9,
      reviews: 128,
      status: "Açık",
      statusColor: "emerald",
      hours: "09:00 - 22:00",
      description: "Otantik Türk mutfağı ve modern tatlar.",
      links: ["Menü", "Sipariş", "Randevu"],
    },
    {
      name: "Nova Güzellik",
      category: "Güzellik Salonu",
      initials: "NG",
      gradient: "from-pink-400 to-purple-500",
      location: "Çankaya, Ankara",
      rating: 4.8,
      reviews: 96,
      status: "Açık",
      statusColor: "emerald",
      hours: "10:00 - 20:00",
      description: "Profesyonel cilt bakımı ve spa hizmetleri.",
      links: ["Randevu", "Hizmetler", "Galeri"],
    },
    {
      name: "Tech Hub",
      category: "Teknoloji",
      initials: "TH",
      gradient: "from-blue-400 to-indigo-500",
      location: "Levent, İstanbul",
      rating: 5.0,
      reviews: 84,
      status: "Açık",
      statusColor: "emerald",
      hours: "09:00 - 18:00",
      description: "Yazılım geliştirme ve danışmanlık.",
      links: ["Hakkımızda", "Projeler", "İletişim"],
    },
    {
      name: "Grand Hotel",
      category: "Otel",
      initials: "GH",
      gradient: "from-amber-400 to-yellow-500",
      location: "Lara, Antalya",
      rating: 4.7,
      reviews: 215,
      status: "Açık",
      statusColor: "emerald",
      hours: "24/7",
      description: "Lüks konaklama ve dünya mutfağı.",
      links: ["Odalar", "Rezervasyon", "Menü"],
    },
    {
      name: "Burger House",
      category: "Fast Food",
      initials: "BH",
      gradient: "from-red-400 to-orange-500",
      location: "Nilüfer, Bursa",
      rating: 4.6,
      reviews: 156,
      status: "Açık",
      statusColor: "emerald",
      hours: "11:00 - 23:00",
      description: "Ev yapımı burger ve lezzetli atıştırmalıklar.",
      links: ["Menü", "Sipariş", "Kampanyalar"],
    },
    {
      name: "Premium Gayrimenkul",
      category: "Emlak",
      initials: "PG",
      gradient: "from-emerald-400 to-teal-500",
      location: "Beşiktaş, İstanbul",
      rating: 4.9,
      reviews: 72,
      status: "Açık",
      statusColor: "emerald",
      hours: "09:00 - 19:00",
      description: "Lüks konut ve ticari portföy.",
      links: ["Portföy", "Danışmanlar", "İletişim"],
    },
  ];

  return (
    <section className="relative py-12 md:py-20 bg-transparent">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 mb-6">
            <ExternalLink className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-700">Canlı Örnekler</span>
          </div>

          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-slate-800">
            Gerçek İşletmeler, <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-blue-600">Gerçek Sonuçlar</span>
          </h2>

          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Tık Profil'i kullanan işletmelerin gerçek profillerini inceleyin. Sizin profiliniz nasıl görünecek?
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {profiles.map((profile, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -8 }}
              className="group relative p-6 rounded-3xl bg-white/40 backdrop-blur-xl border border-white/40 shadow-sm hover:shadow-xl hover:border-white/60 transition-all duration-500"
            >
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/40 to-white/10 pointer-events-none" />
              <div className="relative z-10">
              <div className="flex items-start gap-4 mb-4">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${profile.gradient} flex items-center justify-center text-white font-bold text-xl shadow-lg shrink-0`}>
                  {profile.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-lg font-bold text-slate-800 mb-1">{profile.name}</div>
                  <div className="text-sm text-slate-500">{profile.category}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <span key={i} className="text-amber-400 text-xs">★</span>
                      ))}
                    </div>
                    <span className="text-xs text-slate-400">{profile.rating} ({profile.reviews})</span>
                  </div>
                </div>
              </div>

              <p className="text-slate-600 text-sm mb-4 leading-relaxed">
                {profile.description}
              </p>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <MapPin className="w-4 h-4 text-blue-500" />
                  <span>{profile.location}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Clock className="w-4 h-4 text-blue-500" />
                  <span>{profile.hours}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {profile.links.map((link, i) => (
                  <span
                    key={i}
                    className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-600 group-hover:bg-blue-50 group-hover:border-blue-200 group-hover:text-blue-600 transition-colors"
                  >
                    {link}
                  </span>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-100 flex gap-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 h-10 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-medium flex items-center justify-center gap-1.5 shadow-lg shadow-blue-500/20"
                >
                  <Phone className="w-3.5 h-3.5" />
                  Ara
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 h-10 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-sm font-medium flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  WhatsApp
                </motion.button>
              </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16 text-center"
        >
          <Link href="/kayit-ol">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="h-14 px-8 rounded-xl font-semibold text-white text-lg inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/35 transition-all"
            >
              Kendi Profilinizi Oluşturun
              <ArrowRight className="w-5 h-5" />
            </motion.button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
