"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, User, ArrowRight, Tag, Clock, BookOpen, Target, Lightbulb, TrendingUp, BarChart3, Award, HelpCircle } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { blogCategories, BlogCategory, BlogPost } from "@/lib/blog-posts";
import { Navigation } from "@/components/landing/Navigation";
import { Footer } from "@/components/landing/Footer";
import { MouseFollowerBackground } from "@/components/landing/MouseFollowerBackground";
import { toR2ProxyUrl } from "@/lib/publicImage";

const iconMap: Record<string, any> = {
    BookOpen,
    Target,
    Lightbulb,
    TrendingUp,
    BarChart3,
    Award,
    HelpCircle
};

export default function BlogPage() {
    const [posts, setPosts] = useState<BlogPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<string>("all");

    useEffect(() => {
        fetchPosts();
    }, []);

    const fetchPosts = async () => {
        try {
            const response = await fetch('/api/blog-posts');
            const data = await response.json();
            if (data.success) {
                setPosts(data.posts);
            } else {
                setPosts([]);
            }
        } catch (error) {
            setPosts([]);
        } finally {
            setLoading(false);
        }
    };

    const filteredPosts = posts.filter(post => {
        const isPublished = post.published === true;
        const matchesCategory = selectedCategory === "all" || post.category === selectedCategory;
        return isPublished && matchesCategory;
    });

    const getCategoryColor = (categoryId: string) => {
        const category = blogCategories.find(c => c.id === categoryId);
        return category?.color || "from-gray-500 to-gray-600";
    };

    const getCategoryIcon = (categoryId: string) => {
        const category = blogCategories.find(c => c.id === categoryId);
        if (!category) return BookOpen;
        return iconMap[category.icon] || BookOpen;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-white via-sky-50 to-blue-50 text-slate-700 selection:bg-blue-500/20 selection:text-blue-900 overflow-x-hidden relative">
            <MouseFollowerBackground />
            
            <div className="relative z-10 flex flex-col min-h-screen">
                <Navigation />
                
                <main className="flex-grow pt-32 pb-20 px-6">
                    <div className="max-w-7xl mx-auto">
                        {/* Header Section */}
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-center mb-16"
                        >
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/50 backdrop-blur-xl border border-white/40 mb-6">
                                <span className="text-sm font-medium text-blue-700">Tık Profil Blog</span>
                            </div>
                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-slate-800">
                                Dijital Dünyadan <br />
                                <span className="bg-clip-text text-transparent bg-gradient-to-r from-sky-500 to-blue-600">
                                    Haberler ve İpuçları
                                </span>
                            </h1>
                            <p className="text-xl text-slate-700/80 max-w-2xl mx-auto">
                                İşletmenizi büyütmek için en güncel stratejiler, rehberler ve başarı hikayeleri.
                            </p>
                        </motion.div>

                        {/* Category Filter Buttons */}
                        <div className="flex flex-wrap justify-center gap-3 mb-12">
                            <motion.button
                                onClick={() => setSelectedCategory("all")}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all ${
                                    selectedCategory === "all"
                                        ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/25"
                                        : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
                                }`}
                            >
                                Tümü
                            </motion.button>
                            {blogCategories.map((category) => {
                                const Icon = iconMap[category.icon];
                                return (
                                    <motion.button
                                        key={category.id}
                                        onClick={() => setSelectedCategory(category.id)}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all flex items-center gap-2 ${
                                            selectedCategory === category.id
                                                ? "bg-gradient-to-r text-white shadow-lg"
                                                : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
                                        }`}
                                        style={selectedCategory === category.id ? {
                                            background: category.color
                                        } : {}}
                                    >
                                        <Icon className="h-4 w-4" />
                                        {category.name}
                                    </motion.button>
                                );
                            })}
                        </div>

                        {/* Blog Grid */}
                        {loading ? (
                            <div className="flex items-center justify-center py-20">
                                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
                            </div>
                        ) : (
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {filteredPosts.map((post, index) => (
                                <motion.div
                                    key={post.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                >
                                    <Link 
                                        href={`/blog/${post.slug}`}
                                        className="group flex flex-col h-full bg-white rounded-2xl overflow-hidden border border-slate-200 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300"
                                    >
                                        <div className="relative h-56 overflow-hidden">
                                            {post.coverImage ? (
                                                <Image
                                                    src={toR2ProxyUrl(post.coverImage)}
                                                    alt={post.title}
                                                    fill
                                                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                                                />
                                            ) : (
                                                <div className="absolute inset-0 bg-gradient-to-br from-slate-100 to-slate-200" />
                                            )}
                                            <div className={`absolute top-4 left-4 bg-gradient-to-r text-white text-xs font-bold px-3 py-1 rounded-full backdrop-blur-sm ${getCategoryColor(post.category)}`}>
                                                {blogCategories.find(c => c.id === post.category)?.name || post.category}
                                            </div>
                                        </div>
                                        
                                        <div className="p-6 flex flex-col flex-grow">
                                            <div className="flex items-center text-xs text-slate-500 mb-4 gap-4">
                                                <span className="flex items-center">
                                                    <Calendar className="w-3 h-3 mr-1" />
                                                    {post.date}
                                                </span>
                                                <span className="flex items-center">
                                                    <Clock className="w-3 h-3 mr-1" />
                                                    {post.readTime}
                                                </span>
                                            </div>
                                            
                                            <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-blue-600 transition-colors line-clamp-2">
                                                {post.title}
                                            </h3>
                                            
                                            <p className="text-slate-600 text-sm mb-6 line-clamp-3 flex-grow">
                                                {post.excerpt}
                                            </p>
                                            
                                            <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                                                        {post.author.name[0]}
                                                    </div>
                                                    <span className="text-xs font-medium text-slate-600">
                                                        {post.author.name}
                                                    </span>
                                                </div>
                                                <span className="text-blue-600 text-sm font-medium flex items-center group-hover:translate-x-1 transition-transform">
                                                    Oku <ArrowRight className="w-4 h-4 ml-1" />
                                                </span>
                                            </div>
                                        </div>
                                    </Link>
                                </motion.div>
                            ))}
                        </div>
                        )}

                        {!loading && filteredPosts.length === 0 && (
                             <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex flex-col items-center justify-center py-20 text-center"
                            >
                                <div className="w-24 h-24 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center mb-6">
                                    <Tag className="w-10 h-10 text-blue-300" />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-800 mb-2">
                                    {selectedCategory === "all" ? "Henüz Yazı Eklenmedi" : "Bu kategoride yazı bulunamadı"}
                                </h3>
                                <p className="text-slate-600 max-w-md">
                                    {selectedCategory === "all"
                                        ? "Blog yazılarımız hazırlanıyor. Dijital pazarlama, QR kod teknolojileri ve işletme yönetimi üzerine harika içerikler için takipte kalın."
                                        : "Diğer kategorileri kontrol edebilir veya daha sonra tekrar deneyebilirsiniz."}
                                </p>
                            </motion.div>
                        )}
                    </div>
                </main>

                <Footer />
            </div>
        </div>
    );
}
