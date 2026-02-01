"use client";

import { motion } from "framer-motion";
import { Check, ArrowRight, Zap } from "lucide-react";
import Link from "next/link";

export function PricingSection() {
  const plans = [
    {
      name: "Ücretsiz",
      description: "Başlamak için ideal",
      price: "₺0",
      period: "/ay",
      popular: false,
      features: [
        "Temel profil oluşturma",
        "Logo ve kapak resmi",
        "İletişim bilgileri",
        "Sosyal medya linkleri (3 adet)",
        "Basit galeri (10 fotoğraf)",
        "QR kod oluşturma",
        "Temel analitik",
      ],
      cta: "Ücretsiz Başla",
      ctaLink: "/kayit-ol",
    },
    {
      name: "PRO",
      description: "Büyüyen işletmeler için",
      price: "₺149",
      period: "/ay",
      popular: true,
      features: [
        "Ücretsiz planın tüm özellikleri",
        "Özel domain (tikprofil.com/isletme-adi)",
        "Sınırsız sosyal link",
        "Sınırsız galeri",
        "QR menü sistemi",
        "Randevu sistemi",
        "Sipariş sistemi",
        "E-ticaret entegrasyonu",
        "Gelişmiş analitik dashboard",
        "7/24 destek",
        "Özel tema seçenekleri",
      ],
      cta: "PRO'ya Geç",
      ctaLink: "/kayit-ol",
    },
    {
      name: "Enterprise",
      description: "Kurumsal çözümler",
      price: "Özel",
      period: "",
      popular: false,
      features: [
        "PRO planın tüm özellikleri",
        "Beyaz etiket (white-label)",
        "Özel domain entegrasyonu",
        "API erişimi",
        "Özel geliştirme desteği",
        "Öncelikli 7/24 destek",
        "Dedike hesap yöneticisi",
        "Sınırsız kullanıcı",
        "SLA garantisi",
        "Eğitim ve danışmanlık",
        "Özel raporlama",
      ],
      cta: "İletişime Geç",
      ctaLink: "/iletisim",
    },
  ];

  return (
    <section className="relative py-32 bg-transparent">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 mb-6">
            <Zap className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-700">Fiyatlandırma</span>
          </div>

          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-slate-800">
            İşletmenize Uygun <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-blue-600">Planı Seçin</span>
          </h2>

          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Esnek fiyatlandırma seçenekleriyle işletmenizi büyütün. İstediğiniz zaman plan değiştirebilirsiniz.
          </p>

          <div className="mt-8 flex items-center justify-center gap-4 text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-500" />
              <span>14 gün ücretsiz deneme</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-500" />
              <span>İstediğiniz zaman iptal</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-500" />
              <span>Gizli ücret yok</span>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -8 }}
              className={`relative p-8 rounded-3xl border transition-all duration-500 overflow-hidden ${
                plan.popular
                  ? "bg-white/60 backdrop-blur-xl border-blue-200 shadow-xl shadow-blue-500/10 scale-105"
                  : "bg-white/40 backdrop-blur-xl border-white/40 shadow-sm hover:shadow-xl hover:border-blue-100"
              }`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br pointer-events-none ${
                  plan.popular ? "from-blue-50/50 to-white/20" : "from-white/40 to-white/5"
              }`} />
              
              <div className="relative z-10">
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-semibold px-6 py-2 rounded-full shadow-lg">
                    En Popüler
                  </div>
                </div>
              )}

              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-slate-800 mb-2">{plan.name}</h3>
                <p className="text-slate-500 text-sm mb-4">{plan.description}</p>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-5xl font-bold text-slate-800">{plan.price}</span>
                  {plan.period && <span className="text-slate-500">{plan.period}</span>}
                </div>
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="text-slate-600 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link href={plan.ctaLink}>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`w-full h-14 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
                    plan.popular
                      ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/35"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {plan.cta}
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              </Link>
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
          <p className="text-slate-600 text-lg">
            Kurumsal plan hakkında daha fazla bilgi mi almak istiyorsunuz?
            <Link href="/iletisim" className="text-blue-600 font-semibold hover:underline ml-2">
              Bizimle iletişime geçin
            </Link>
          </p>
        </motion.div>
      </div>
    </section>
  );
}
