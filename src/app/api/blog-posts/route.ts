import { NextResponse } from 'next/server';
import { getCollectionREST, createDocumentREST, updateDocumentREST, deleteDocumentREST, getDocumentREST } from '@/lib/documentStore';
import { requireAuth } from '@/lib/apiAuth';
import { z } from 'zod';

const blogPostSchema = z.object({
    id: z.string().optional(),
    slug: z.string().min(1),
    title: z.string().min(1),
    excerpt: z.string().min(1),
    content: z.string().min(1),
    coverImage: z.union([z.string().url(), z.literal('')]).optional(),
    category: z.string().min(1),
    readTime: z.string().min(1),
    tags: z.array(z.string()).default([]),
    published: z.boolean().default(true),
});

function normalizePost(raw: any) {
    const id = typeof raw?.id === 'string' ? raw.id : '';
    const slug = typeof raw?.slug === 'string' ? raw.slug : '';
    const title = typeof raw?.title === 'string' ? raw.title : '';
    const excerpt = typeof raw?.excerpt === 'string' ? raw.excerpt : '';
    const content = typeof raw?.content === 'string' ? raw.content : '';
    const coverImage = typeof raw?.coverImage === 'string' ? raw.coverImage : '';
    const category = typeof raw?.category === 'string' ? raw.category : 'rehberler';
    const readTime = typeof raw?.readTime === 'string' ? raw.readTime : '5 dk okuma';
    const tags = Array.isArray(raw?.tags) ? raw.tags.filter((t: any) => typeof t === 'string') : [];
    const published = typeof raw?.published === 'boolean' ? raw.published : true;
    const date = typeof raw?.date === 'string' ? raw.date : new Date().toISOString();
    const authorName = typeof raw?.author?.name === 'string' ? raw.author.name : 'TikProfil Ekibi';
    const authorImage = typeof raw?.author?.image === 'string' ? raw.author.image : '/api/placeholder/40';

    return {
        id: id || slug || Date.now().toString(),
        slug,
        title,
        excerpt,
        content,
        coverImage,
        category,
        readTime,
        tags,
        published,
        date,
        author: { name: authorName, image: authorImage },
    };
}

export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const includeAll = url.searchParams.get('all') === '1' || url.searchParams.get('all') === 'true';
        const requestedSlug = url.searchParams.get('slug')?.trim();

        if (includeAll) {
            const auth = await requireAuth();
            if (!auth.authorized) {
                return NextResponse.json({ success: false, error: auth.error }, { status: 401 });
            }
        }

        const storedPosts = await getCollectionREST('blog_posts');
        let posts = storedPosts.map(normalizePost);
        if (!includeAll) posts = posts.filter((p) => p.published === true);

        if (requestedSlug) {
            const found = posts.find((p) => p.slug === requestedSlug);
            if (!found) {
                return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
            }
            return NextResponse.json({ success: true, post: found });
        }

        posts.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

        return NextResponse.json({
            success: true,
            posts,
        });
    } catch (error) {
        console.error('[BlogPosts] GET error:', error);
        
        return NextResponse.json({
            success: true,
            posts: [],
        });
    }
}

export async function POST(request: Request) {
    try {
        const auth = await requireAuth();
        if (!auth.authorized) {
            return NextResponse.json({
                success: false,
                error: auth.error,
            }, { status: 401 });
        }

        const body = await request.json();
        const validated = blogPostSchema.parse(body);

        const newPost = await createDocumentREST('blog_posts', {
            slug: validated.slug,
            title: validated.title,
            excerpt: validated.excerpt,
            content: validated.content,
            coverImage: validated.coverImage || '',
            category: validated.category,
            readTime: validated.readTime,
            tags: validated.tags,
            published: validated.published,
            author: {
                name: 'TikProfil Ekibi',
                image: '/api/placeholder/40'
            },
            date: new Date().toISOString(),
        }, validated.id || Date.now().toString());

        return NextResponse.json({
            success: true,
            post: newPost,
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({
                success: false,
                error: 'Validation error',
                details: error.issues,
            }, { status: 400 });
        }

        console.error('[BlogPosts] POST error:', error);
        return NextResponse.json({
            success: false,
            error: 'Server error',
        }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const auth = await requireAuth();
        if (!auth.authorized) {
            return NextResponse.json({
                success: false,
                error: auth.error,
            }, { status: 401 });
        }

        const body = await request.json();
        const { id, ...updateData } = body;

        if (!id) {
            return NextResponse.json({
                success: false,
                error: 'ID is required',
            }, { status: 400 });
        }

        const validated = blogPostSchema.parse(updateData);

        const updatedPost = await updateDocumentREST('blog_posts', id, {
            slug: validated.slug,
            title: validated.title,
            excerpt: validated.excerpt,
            content: validated.content,
            coverImage: validated.coverImage || '',
            category: validated.category,
            readTime: validated.readTime,
            tags: validated.tags,
            published: validated.published,
        });

        return NextResponse.json({
            success: true,
            post: updatedPost,
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({
                success: false,
                error: 'Validation error',
                details: error.issues,
            }, { status: 400 });
        }

        console.error('[BlogPosts] PUT error:', error);
        return NextResponse.json({
            success: false,
            error: 'Server error',
        }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const auth = await requireAuth();
        if (!auth.authorized) {
            return NextResponse.json({
                success: false,
                error: auth.error,
            }, { status: 401 });
        }

        const body = await request.json();
        const { id } = body;

        if (!id) {
            return NextResponse.json({
                success: false,
                error: 'ID is required',
            }, { status: 400 });
        }

        await deleteDocumentREST('blog_posts', id);

        return NextResponse.json({
            success: true,
        });
    } catch (error) {
        console.error('[BlogPosts] DELETE error:', error);
        return NextResponse.json({
            success: false,
            error: 'Server error',
        }, { status: 500 });
    }
}
