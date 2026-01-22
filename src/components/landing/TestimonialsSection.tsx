"use client";

import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";

export function TestimonialsSection() {
  const testimonials = [
    {
      name: "Ahmet Yılmaz",
      role: "Restoran Sahibi",
      business: "Lezzet Durağı",
      image: "AY",
      rating: 5,
      text: "QR menü sistemimiz Tık Profil ile tamamen değişti. Müşterilerimiz masadan kolayca sipariş verebiliyor, siparişlerimiz %40 arttı.",
      location: "İstanbul",
    },
    {
      name: "Elif Kaya",
      role: "Güzellik Salonu Sahibi",
      business: "Nova Güzellik",
      image: "EK",
      rating: 5,
      text: "Randevu sistemimiz otomatikleşti. Müşterilerimiz 7/24 online rezervasyon yapabiliyor, biz de daha çok müşteriye hizmet verebiliyoruz.",
      location: "Ankara",
    },
    {
      name: "Mehmet Demir",
      role: "Otel Müdürü",
      business: "Grand Hotel",
      image: "MD",
      rating: 5,
      text: "Otomasyon sistemlerimiz Tık Profil ile entegre oldu. Odalar için QR kodlar, menüler ve talep sistemi tek platformda.",
      location: "Antalya",
    },
    {
      name: "Ayşe Çelik",
      role: "E-Ticaret Yöneticisi",
      business: "Moda Store",
      image: "AC",
      rating: 5,
      text: "Sosyal medya trafiğimizi tek profilde topladık. Instagram ve TikTok linklerimiz artık düzenli, dönüşüm oranımız %60 arttı.",
      location: "İzmir",
    },
    {
      name: "Can Öztürk",
      role: "Fast Food Sahibi",
      business: "Burger House",
      image: "CO",
      rating: 5,
      text: "Sipariş sistemimiz tamamen dijitalleşti. Müşterilerimiz mobil uygulama indirmeden kolayca sipariş verebiliyor.",
      location: "Bursa",
    },
    {
      name: "Zeynep Aksoy",
      role: "Emlak Danışmanı",
      business: "Premium Gayrimenkul",
      image: "ZA",
      rating: 5,
      text: "Portföyümüzü ve iletişim bilgilerimizi profesyonel bir profile taşıdık. Müşterilerimiz tüm bilgilerimize tek linkten erişiyor.",
      location: "İstanbul",
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
            <Star className="w-4 h-4 text-blue-600 fill-blue-600" />
            <span className="text-sm font-medium text-blue-700">Müşteri Yorumları</span>
          </div>

          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-slate-800">
            Binlerce İşletme Tarafından <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-blue-600">Güveniliyor</span>
          </h2>

          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Gerçek müşterilerimizin deneyimlerini okuyun. Tık Profil ile işletmenizi nasıl büyütebileceğinizi keşfedin.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -8 }}
              className="relative p-8 rounded-3xl bg-white/40 backdrop-blur-xl border border-white/40 shadow-sm hover:shadow-xl hover:border-white/60 transition-all duration-500 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/5 pointer-events-none" />
              <div className="relative z-10">
              <div className="absolute top-6 right-6 text-blue-200">
                <Quote className="w-8 h-8" />
              </div>

              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-amber-400 fill-amber-400" />
                ))}
              </div>

              <p className="text-slate-600 leading-relaxed mb-6">
                {testimonial.text}
              </p>

              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-500/30">
                  {testimonial.image}
                </div>
                <div>
                  <div className="font-semibold text-slate-800">{testimonial.name}</div>
                  <div className="text-sm text-slate-500">{testimonial.role}</div>
                  <div className="text-sm text-blue-600 font-medium">{testimonial.business}</div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2 text-sm text-slate-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>{testimonial.location}</span>
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
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 text-amber-400 fill-amber-400" />
              ))}
            </div>
            <span className="text-slate-600 font-medium">500+ işletmeden ortalama 4.9 puan</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
