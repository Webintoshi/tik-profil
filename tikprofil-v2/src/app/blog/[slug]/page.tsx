import { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Calendar, Clock, Tag, Share2 } from "lucide-react";
import { type BlogPost } from "@/lib/blog-posts";
import { Navigation } from "@/components/landing/Navigation";
import { Footer } from "@/components/landing/Footer";
import { toR2ProxyUrl } from "@/lib/publicImage";
import { getCollectionREST } from "@/lib/documentStore";

function normalizePost(raw: any): BlogPost {
    const id = typeof raw?.id === "string" ? raw.id : "";
    const slug = typeof raw?.slug === "string" ? raw.slug : "";
    const title = typeof raw?.title === "string" ? raw.title : "";
    const excerpt = typeof raw?.excerpt === "string" ? raw.excerpt : "";
    const content = typeof raw?.content === "string" ? raw.content : "";
    const coverImage = typeof raw?.coverImage === "string" ? raw.coverImage : "";
    const date = typeof raw?.date === "string" ? raw.date : new Date().toISOString();
    const authorName = typeof raw?.author?.name === "string" ? raw.author.name : "TikProfil Ekibi";
    const authorImage = typeof raw?.author?.image === "string" ? raw.author.image : "/api/placeholder/40";
    const category = typeof raw?.category === "string" ? raw.category : "rehberler";
    const readTime = typeof raw?.readTime === "string" ? raw.readTime : "5 dk okuma";
    const tags = Array.isArray(raw?.tags) ? raw.tags.filter((t: any) => typeof t === "string") : [];
    const published = typeof raw?.published === "boolean" ? raw.published : true;

    return {
        id: id || slug || Date.now().toString(),
        slug,
        title,
        excerpt,
        content,
        coverImage,
        date,
        author: { name: authorName, image: authorImage },
        category,
        readTime,
        tags,
        published,
    };
}

async function getPostBySlug(slug: string): Promise<BlogPost | null> {
    try {
        const docs = await getCollectionREST("blog_posts");
        const found = docs.find((d: any) => d?.slug === slug);
        if (found) return normalizePost(found);
    } catch {
    }
    return null;
}

// Generate metadata for SEO
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const resolvedParams = await params;
    const post = await getPostBySlug(resolvedParams.slug);

    if (!post) {
        return {
            title: "Yazı Bulunamadı | TikProfil Blog",
        };
    }

    return {
        title: `${post.title} | TikProfil Blog`,
        description: post.excerpt,
        openGraph: {
            title: post.title,
            description: post.excerpt,
            images: [post.coverImage],
            type: "article",
            publishedTime: post.date,
            authors: [post.author.name],
        },
        twitter: {
            card: "summary_large_image",
            title: post.title,
            description: post.excerpt,
            images: [post.coverImage],
        },
    };
}

// Simple Markdown Parser with Table and Link Support
function MarkdownRenderer({ content }: { content: string }) {
    const lines = content.split('\n');
    const nodes: React.ReactNode[] = [];
    
    let currentList: React.ReactNode[] = [];
    let currentTable: string[][] = [];
    const inTable = false;

    // Helper for inline parsing (bold, code, link)
    const parseInline = (text: string) => {
        // First split by links [text](url)
        const parts = text.split(/(\[.*?\]\(.*?\))/g);
        return parts.map((part, i) => {
            // Check for link
            const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
            if (linkMatch) {
                return (
                    <Link key={i} href={linkMatch[2]} className="text-blue-600 hover:underline font-medium">
                        {linkMatch[1]}
                    </Link>
                );
            }

            // Split by bold and code
            const subParts = part.split(/(\*\*.*?\*\*|`.*?`)/g);
            return subParts.map((subPart, j) => {
                if (subPart.startsWith('**') && subPart.endsWith('**')) {
                    return <strong key={`${i}-${j}`} className="font-bold text-slate-900">{subPart.slice(2, -2)}</strong>;
                }
                if (subPart.startsWith('`') && subPart.endsWith('`')) {
                    return <code key={`${i}-${j}`} className="bg-slate-100 px-1.5 py-0.5 rounded text-sm font-mono text-blue-600">{subPart.slice(1, -1)}</code>;
                }
                return subPart;
            });
        });
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Handle List Items
        if (line.trim().startsWith('* ')) {
            currentList.push(
                <li key={`li-${i}`} className="ml-6 text-slate-700 mb-2 pl-2">
                    {parseInline(line.replace('* ', ''))}
                </li>
            );
            // If next line is NOT a list item, flush the list
            if (!lines[i + 1]?.trim().startsWith('* ')) {
                nodes.push(<ul key={`ul-${i}`} className="list-disc my-6 pl-4 space-y-2">{currentList}</ul>);
                currentList = [];
            }
            continue;
        }

        // Handle Tables
        if (line.trim().startsWith('|')) {
            const row = line.split('|').map(cell => cell.trim()).filter(cell => cell !== '');
            // Skip separator line (e.g. |---|---|)
            if (line.includes('---')) {
                continue;
            }
            currentTable.push(row);
            
            // If next line is NOT a table row, flush the table
            if (!lines[i + 1]?.trim().startsWith('|')) {
                const [header, ...rows] = currentTable;
                nodes.push(
                    <div key={`table-${i}`} className="overflow-x-auto my-8 border border-slate-200 rounded-xl">
                        <table className="w-full text-left text-sm md:text-base">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    {header.map((h, hi) => (
                                        <th key={hi} className="p-4 font-bold text-slate-900">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {rows.map((r, ri) => (
                                    <tr key={ri} className="hover:bg-slate-50/50">
                                        {r.map((c, ci) => (
                                            <td key={ci} className="p-4 text-slate-700">
                                                {parseInline(c)}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );
                currentTable = [];
            }
            continue;
        }

        // Standard Blocks
        if (line.startsWith('## ')) {
            nodes.push(<h2 key={i} className="text-3xl font-bold text-slate-900 mt-12 mb-6 tracking-tight">{line.replace('## ', '')}</h2>);
        } else if (line.startsWith('### ')) {
            nodes.push(<h3 key={i} className="text-2xl font-semibold text-slate-800 mt-8 mb-4 tracking-tight">{line.replace('### ', '')}</h3>);
        } else if (line.startsWith('#### ')) {
            nodes.push(<h4 key={i} className="text-xl font-semibold text-slate-800 mt-6 mb-3">{line.replace('#### ', '')}</h4>);
        } else if (line.startsWith('> ')) {
            nodes.push(
                <div key={i} className="border-l-4 border-blue-500 bg-blue-50 p-6 my-8 rounded-r-lg italic text-slate-700">
                    {parseInline(line.replace('> ', ''))}
                </div>
            );
        } else if (line.trim() === '---') {
            nodes.push(<hr key={i} className="my-12 border-slate-200" />);
        } else if (line.trim() !== '') {
            nodes.push(<p key={i} className="mb-4 leading-relaxed">{parseInline(line)}</p>);
        }
    }

    return <div className="space-y-2">{nodes}</div>;
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
    const resolvedParams = await params;
    const post = await getPostBySlug(resolvedParams.slug);

    if (!post || post.published !== true) {
        notFound();
    }

    return (
        <div className="min-h-screen bg-white">
            <Navigation />
            
            <main className="pt-32 pb-20">
                <article className="max-w-4xl mx-auto px-6">
                    {/* Breadcrumb & Back */}
                    <div className="mb-8">
                        <Link 
                            href="/blog" 
                            className="inline-flex items-center text-slate-500 hover:text-blue-600 transition-colors mb-6 group"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                            Blog'a Dön
                        </Link>
                        
                        <div className="flex flex-wrap gap-3 mb-6">
                            <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-medium">
                                {post.category}
                            </span>
                            {post.tags.map(tag => (
                                <span key={tag} className="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-sm">
                                    <Tag className="w-3 h-3 mr-1.5 opacity-50" />
                                    {tag}
                                </span>
                            ))}
                        </div>

                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 mb-8 leading-tight">
                            {post.title}
                        </h1>

                        <div className="flex items-center justify-between border-b border-slate-100 pb-8 mb-12">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-slate-200 overflow-hidden relative">
                                    {/* Placeholder for author image */}
                                    <div className="absolute inset-0 bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                                        {post.author.name[0]}
                                    </div>
                                </div>
                                <div>
                                    <div className="font-semibold text-slate-900">{post.author.name}</div>
                                    <div className="flex items-center text-sm text-slate-500 gap-4">
                                        <span className="flex items-center">
                                            <Calendar className="w-4 h-4 mr-1.5" />
                                            {post.date}
                                        </span>
                                        <span className="flex items-center">
                                            <Clock className="w-4 h-4 mr-1.5" />
                                            {post.readTime}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            <button className="p-3 rounded-full hover:bg-slate-50 text-slate-400 hover:text-blue-600 transition-colors">
                                <Share2 className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Featured Image */}
                    <div className="relative aspect-video rounded-2xl overflow-hidden mb-16 bg-slate-100 shadow-xl">
                        {post.coverImage ? (
                            <Image
                                src={toR2ProxyUrl(post.coverImage)}
                                alt={post.title}
                                fill
                                className="object-cover"
                                priority
                            />
                        ) : (
                            <div className="absolute inset-0 bg-gradient-to-br from-slate-100 to-slate-200" />
                        )}
                    </div>

                    {/* Content */}
                    <div className="prose prose-lg prose-slate max-w-none">
                        <MarkdownRenderer content={post.content} />
                    </div>
                </article>

                {/* CTA Section */}
                <div className="max-w-4xl mx-auto px-6 mt-20">
                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-12 text-center text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
                        
                        <h3 className="text-3xl font-bold mb-4 relative z-10">İşletmenizi Büyütmeye Hazır mısınız?</h3>
                        <p className="text-slate-300 mb-8 max-w-xl mx-auto relative z-10">
                            TikProfil ile profesyonel bir dijital kimlik oluşturun, QR menü ve rezervasyon sistemleriyle müşterilerinize modern bir deneyim sunun.
                        </p>
                        <Link 
                            href="/kayit-ol" 
                            className="inline-flex items-center px-8 py-4 bg-white text-slate-900 rounded-full font-bold hover:bg-blue-50 transition-colors relative z-10"
                        >
                            Ücretsiz Başlayın
                            <ArrowLeft className="w-5 h-5 ml-2 rotate-180" />
                        </Link>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
