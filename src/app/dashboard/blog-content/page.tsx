"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Edit2, Trash2, Search, Filter, BookOpen, Target, Lightbulb, TrendingUp, BarChart3, Award, HelpCircle, Eye, Clock, Calendar, Save, X, CheckCircle, AlertCircle } from "lucide-react";
import { blogPosts, blogCategories, BlogPost, BlogCategory } from "@/lib/blog-posts";
import { useRouter } from "next/navigation";

const iconMap: Record<string, any> = {
    BookOpen,
    Target,
    Lightbulb,
    TrendingUp,
    BarChart3,
    Award,
    HelpCircle
};

export default function BlogContentPage() {
    const router = useRouter();
    const [posts, setPosts] = useState<BlogPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [categories] = useState<BlogCategory[]>(blogCategories);

    useEffect(() => {
        fetchPosts();
    }, []);

    const fetchPosts = async () => {
        try {
            const response = await fetch('/api/blog-posts?all=1');
            const data = await response.json();
            if (data.success) {
                setPosts(data.posts);
            } else if (response.status === 401) {
                router.push('/webintoshi');
            }
        } catch (error) {
            console.error('Failed to fetch posts:', error);
        } finally {
            setLoading(false);
        }
    };

    const checkAuth = async () => {
        try {
            const response = await fetch('/api/auth/session');
            if (response.status === 401) {
                router.push('/webintoshi');
            }
        } catch (error) {
            console.error('Auth check failed:', error);
        }
    };
    const [selectedCategory, setSelectedCategory] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
    const [deleteModal, setDeleteModal] = useState<BlogPost | null>(null);
    const [formData, setFormData] = useState({
        id: "",
        slug: "",
        title: "",
        excerpt: "",
        content: "",
        coverImage: "",
        category: "rehberler",
        readTime: "5 dk",
        tags: [] as string[],
        published: true
    });
    const [tagInput, setTagInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

    const filteredPosts = posts.filter(post => {
        const matchesCategory = selectedCategory === "all" || post.category === selectedCategory;
        const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           post.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const showNotification = (type: "success" | "error", message: string) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 3000);
    };

    const handleSavePost = async () => {
        setIsLoading(true);
        
        try {
            const response = await fetch('/api/blog-posts', {
                method: editingPost ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editingPost ? { ...formData, id: editingPost.id } : formData),
            });
            const data = await response.json();

            if (data.success) {
                if (editingPost) {
                    setPosts(posts.map(p => p.id === editingPost.id ? { ...data.post, author: editingPost.author, date: editingPost.date } as BlogPost : p));
                    showNotification("success", "İçerik başarıyla güncellendi");
                } else {
                    const newPost: BlogPost = {
                        ...data.post,
                        author: {
                            name: "TikProfil Ekibi",
                            image: "/api/placeholder/40"
                        }
                    };
                    setPosts([...posts, newPost]);
                    showNotification("success", "İçerik başarıyla eklendi");
                }
                
                setIsModalOpen(false);
                setEditingPost(null);
                resetForm();
            } else {
                showNotification("error", data.error || "Bir hata oluştu");
            }
        } catch (error) {
            console.error('Save post error:', error);
            showNotification("error", "Bir hata oluştu");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeletePost = (post: BlogPost) => {
        setDeleteModal(post);
    };

    const confirmDelete = async () => {
        if (deleteModal) {
            try {
                const response = await fetch('/api/blog-posts', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: deleteModal.id }),
                });
                const data = await response.json();

                if (data.success) {
                    setPosts(posts.filter(p => p.id !== deleteModal.id));
                    setDeleteModal(null);
                    showNotification("success", "İçerik başarıyla silindi");
                } else {
                    showNotification("error", data.error || "Silme işlemi başarısız");
                }
            } catch (error) {
                console.error('Delete post error:', error);
                showNotification("error", "Bir hata oluştu");
            }
        }
    };

    const handleEditPost = (post: BlogPost) => {
        setEditingPost(post);
        setFormData({
            id: post.id,
            slug: post.slug,
            title: post.title,
            excerpt: post.excerpt,
            content: post.content,
            coverImage: post.coverImage,
            category: post.category,
            readTime: post.readTime,
            tags: post.tags,
            published: post.published
        });
        setIsModalOpen(true);
    };

    const resetForm = () => {
        setFormData({
            id: "",
            slug: "",
            title: "",
            excerpt: "",
            content: "",
            coverImage: "",
            category: "rehberler",
            readTime: "5 dk",
            tags: [],
            published: true
        });
        setTagInput("");
    };

    const handleAddTag = () => {
        if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
            setFormData({ ...formData, tags: [...formData.tags, tagInput.trim()] });
            setTagInput("");
        }
    };

    const handleRemoveTag = (tagToRemove: string) => {
        setFormData({ ...formData, tags: formData.tags.filter(tag => tag !== tagToRemove) });
    };

    const getCategoryIcon = (categoryId: string) => {
        const category = categories.find(c => c.id === categoryId);
        if (!category) return BookOpen;
        return iconMap[category.icon] || BookOpen;
    };

    const getCategoryColor = (categoryId: string) => {
        const category = categories.find(c => c.id === categoryId);
        return category?.color || "from-gray-500 to-gray-600";
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Blog İçerikleri</h1>
                    <p className="text-gray-400 text-sm mt-1">Blog içeriklerini ve kategorileri yönetin</p>
                </div>
                <motion.button
                    onClick={() => {
                        resetForm();
                        setEditingPost(null);
                        setIsModalOpen(true);
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-medium shadow-lg shadow-blue-500/25"
                >
                    <Plus className="h-5 w-5" />
                    <span>Yeni İçerik</span>
                </motion.button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-1">
                    <div className="backdrop-blur-xl bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5 space-y-4">
                        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                            <Filter className="h-5 w-5 text-blue-400" />
                            Filtreler
                        </h2>

                        <div className="space-y-2">
                            <label className="text-sm text-gray-400">Kategori</label>
                            <div className="space-y-1">
                                <motion.button
                                    onClick={() => setSelectedCategory("all")}
                                    whileHover={{ x: 2 }}
                                    className={`w-full text-left px-4 py-2.5 rounded-xl transition-all ${
                                        selectedCategory === "all" 
                                            ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" 
                                            : "text-gray-400 hover:bg-white/[0.05] hover:text-white"
                                    }`}
                                >
                                    Tüm Kategoriler ({posts.length})
                                </motion.button>
                                {categories.map((category) => {
                                    const Icon = iconMap[category.icon];
                                    const postCount = posts.filter(p => p.category === category.id).length;
                                    return (
                                        <motion.button
                                            key={category.id}
                                            onClick={() => setSelectedCategory(category.id)}
                                            whileHover={{ x: 2 }}
                                            className={`w-full text-left px-4 py-2.5 rounded-xl transition-all flex items-center gap-3 ${
                                                selectedCategory === category.id 
                                                    ? "bg-gradient-to-r text-white border border-white/20" 
                                                    : "text-gray-400 hover:bg-white/[0.05] hover:text-white"
                                            }`}
                                            style={selectedCategory === category.id ? {
                                                background: category.color
                                            } : {}}
                                        >
                                            <Icon className="h-4 w-4" />
                                            <span className="flex-1">{category.name}</span>
                                            <span className="text-xs opacity-60">({postCount})</span>
                                        </motion.button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm text-gray-400">Arama</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                                <input
                                    type="text"
                                    placeholder="İçerik ara..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-all"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-3">
                    <div className="backdrop-blur-xl bg-white/[0.03] border border-white/[0.08] rounded-2xl overflow-hidden">
                        <div className="p-5 border-b border-white/[0.08]">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-semibold text-white">
                                    {selectedCategory === "all" ? "Tüm İçerikler" : categories.find(c => c.id === selectedCategory)?.name}
                                    <span className="text-gray-400 font-normal text-sm ml-2">({filteredPosts.length} içerik)</span>
                                </h2>
                            </div>
                        </div>

                        <div className="divide-y divide-white/[0.08]">
                            {filteredPosts.length === 0 ? (
                                <div className="p-12 text-center">
                                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.05] mb-4">
                                        <BookOpen className="h-8 w-8 text-gray-500" />
                                    </div>
                                    <h3 className="text-lg font-medium text-white mb-2">Henüz içerik yok</h3>
                                    <p className="text-gray-400 text-sm">İlk içeriği oluşturmak için "Yeni İçerik" butonuna tıklayın</p>
                                </div>
                            ) : (
                                filteredPosts.map((post, index) => {
                                    const Icon = getCategoryIcon(post.category);
                                    return (
                                        <motion.div
                                            key={post.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            className="p-5 hover:bg-white/[0.02] transition-colors"
                                        >
                                            <div className="flex gap-4">
                                                <div className={`flex-shrink-0 w-16 h-16 rounded-xl bg-gradient-to-br ${getCategoryColor(post.category)} flex items-center justify-center`}>
                                                    <Icon className="h-8 w-8 text-white" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <h3 className="text-white font-medium truncate">{post.title}</h3>
                                                                {!post.published && (
                                                                    <span className="px-2 py-0.5 text-xs bg-yellow-500/20 text-yellow-400 rounded-full border border-yellow-500/30">
                                                                        Taslak
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-gray-400 text-sm line-clamp-2">{post.excerpt}</p>
                                                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                                                <span className="flex items-center gap-1">
                                                                    <Calendar className="h-3 w-3" />
                                                                    {new Date(post.date).toLocaleDateString('tr-TR')}
                                                                </span>
                                                                <span className="flex items-center gap-1">
                                                                    <Clock className="h-3 w-3" />
                                                                    {post.readTime}
                                                                </span>
                                                                <span className="flex items-center gap-1">
                                                                    <Eye className="h-3 w-3" />
                                                                    {categories.find(c => c.id === post.category)?.name}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <motion.button
                                                                onClick={() => handleEditPost(post)}
                                                                whileHover={{ scale: 1.05 }}
                                                                whileTap={{ scale: 0.95 }}
                                                                className="p-2 rounded-lg hover:bg-blue-500/20 text-blue-400 transition-colors"
                                                            >
                                                                <Edit2 className="h-4 w-4" />
                                                            </motion.button>
                                                            <motion.button
                                                                onClick={() => handleDeletePost(post)}
                                                                whileHover={{ scale: 1.05 }}
                                                                whileTap={{ scale: 0.95 }}
                                                                className="p-2 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </motion.button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsModalOpen(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto backdrop-blur-xl bg-[#0a0a0f] border border-white/[0.08] rounded-2xl p-6"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-white">
                                    {editingPost ? "İçeriği Düzenle" : "Yeni İçerik Oluştur"}
                                </h2>
                                <motion.button
                                    onClick={() => setIsModalOpen(false)}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="p-2 rounded-lg hover:bg-white/[0.1] text-gray-400 transition-colors"
                                >
                                    <X className="h-5 w-5" />
                                </motion.button>
                            </div>

                            <div className="space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm text-gray-400">Başlık</label>
                                        <input
                                            type="text"
                                            value={formData.title}
                                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-all"
                                            placeholder="İçerik başlığı"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm text-gray-400">Slug</label>
                                        <input
                                            type="text"
                                            value={formData.slug}
                                            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-all"
                                            placeholder="icerik-slug"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm text-gray-400">Özet</label>
                                    <textarea
                                        value={formData.excerpt}
                                        onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                                        rows={2}
                                        className="w-full px-4 py-2.5 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-all resize-none"
                                        placeholder="İçerik özeti..."
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm text-gray-400">İçerik (Markdown)</label>
                                    <textarea
                                        value={formData.content}
                                        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                        rows={8}
                                        className="w-full px-4 py-2.5 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-all resize-none font-mono text-sm"
                                        placeholder="# Başlık&#10;&#10;İçerik buraya..."
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm text-gray-400">Kategori</label>
                                        <select
                                            value={formData.category}
                                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white focus:outline-none focus:border-blue-500/50 transition-all"
                                        >
                                            {categories.map(category => (
                                                <option key={category.id} value={category.id} className="bg-[#0a0a0f]">
                                                    {category.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm text-gray-400">Okuma Süresi</label>
                                        <input
                                            type="text"
                                            value={formData.readTime}
                                            onChange={(e) => setFormData({ ...formData, readTime: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-all"
                                            placeholder="5 dk"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm text-gray-400">Kapak Resmi URL</label>
                                        <input
                                            type="text"
                                            value={formData.coverImage}
                                            onChange={(e) => setFormData({ ...formData, coverImage: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-all"
                                            placeholder="https://..."
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm text-gray-400">Etiketler</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={tagInput}
                                            onChange={(e) => setTagInput(e.target.value)}
                                            onKeyPress={(e) => e.key === "Enter" && handleAddTag()}
                                            className="flex-1 px-4 py-2.5 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-all"
                                            placeholder="Etiket ekle..."
                                        />
                                        <motion.button
                                            onClick={handleAddTag}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            className="px-4 py-2.5 rounded-xl bg-blue-500 text-white font-medium"
                                        >
                                            Ekle
                                        </motion.button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {formData.tags.map((tag) => (
                                            <span
                                                key={tag}
                                                className="inline-flex items-center gap-1 px-3 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-sm border border-blue-500/30"
                                            >
                                                {tag}
                                                <button
                                                    onClick={() => handleRemoveTag(tag)}
                                                    className="hover:text-red-400 transition-colors"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        id="published"
                                        checked={formData.published}
                                        onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
                                        className="w-4 h-4 rounded bg-white/[0.05] border-white/[0.1] text-blue-500 focus:ring-blue-500/50"
                                    />
                                    <label htmlFor="published" className="text-sm text-gray-400">
                                        Yayınla
                                    </label>
                                </div>

                                <div className="flex justify-end gap-3 pt-4 border-t border-white/[0.08]">
                                    <motion.button
                                        onClick={() => setIsModalOpen(false)}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="px-5 py-2.5 rounded-xl bg-white/[0.05] text-gray-300 font-medium hover:bg-white/[0.1] transition-colors"
                                    >
                                        İptal
                                    </motion.button>
                                    <motion.button
                                        onClick={handleSavePost}
                                        disabled={isLoading}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-medium shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        {isLoading ? (
                                            <>
                                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                                Kaydediliyor...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="h-4 w-4" />
                                                Kaydet
                                            </>
                                        )}
                                    </motion.button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {deleteModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setDeleteModal(null)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-md backdrop-blur-xl bg-[#0a0a0f] border border-white/[0.08] rounded-2xl p-6"
                        >
                            <div className="text-center">
                                <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-red-500/20 mb-4">
                                    <AlertCircle className="h-7 w-7 text-red-400" />
                                </div>
                                <h3 className="text-lg font-bold text-white mb-2">İçeriği Sil</h3>
                                <p className="text-gray-400 text-sm mb-6">
                                    "{deleteModal.title}" içeriğini silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
                                </p>
                                <div className="flex gap-3">
                                    <motion.button
                                        onClick={() => setDeleteModal(null)}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="flex-1 px-4 py-2.5 rounded-xl bg-white/[0.05] text-gray-300 font-medium hover:bg-white/[0.1] transition-colors"
                                    >
                                        İptal
                                    </motion.button>
                                    <motion.button
                                        onClick={confirmDelete}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white font-medium shadow-lg shadow-red-500/25"
                                    >
                                        Sil
                                    </motion.button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {notification && (
                    <motion.div
                        initial={{ opacity: 0, y: -50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -50 }}
                        className="fixed top-6 right-6 z-50"
                    >
                        <div className={`flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg border ${
                            notification.type === "success" 
                                ? "bg-green-500/20 border-green-500/30 text-green-400" 
                                : "bg-red-500/20 border-red-500/30 text-red-400"
                        }`}>
                            {notification.type === "success" ? (
                                <CheckCircle className="h-5 w-5" />
                            ) : (
                                <AlertCircle className="h-5 w-5" />
                            )}
                            <span className="text-sm font-medium">{notification.message}</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
