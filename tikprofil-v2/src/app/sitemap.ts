import { MetadataRoute } from 'next';
import { getCollectionREST } from '@/lib/documentStore';

interface SitemapEntry {
  url: string;
  lastModified: string | Date;
  changeFrequency?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | never;
  priority?: number;
}

async function getBlogPosts(): Promise<SitemapEntry[]> {
  try {
    const posts = await getCollectionREST('blog_posts');
    const baseUrl = 'https://tikprofil.com';
    
    return posts
      .filter((post: any) => post?.published === true && post?.slug)
      .map((post: any) => ({
        url: `${baseUrl}/blog/${post.slug}`,
        lastModified: post.date ? new Date(post.date) : new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }));
  } catch {
    return [];
  }
}

async function getPublicListings(): Promise<SitemapEntry[]> {
  try {
    const listings = await getCollectionREST('listings');
    const baseUrl = 'https://tikprofil.com';
    
    return listings
      .filter((listing: any) => listing?.published === true && listing?.slug)
      .map((listing: any) => ({
        url: `${baseUrl}/${listing.slug}/emlak/${listing.id}`,
        lastModified: listing.updated_at ? new Date(listing.updated_at) : new Date(),
        changeFrequency: 'daily' as const,
        priority: 0.6,
      }));
  } catch {
    return [];
  }
}

async function getPublicProfiles(): Promise<SitemapEntry[]> {
  try {
    const profiles = await getCollectionREST('business_profiles');
    const baseUrl = 'https://tikprofil.com';
    
    return profiles
      .filter((profile: any) => profile?.published === true && profile?.slug)
      .map((profile: any) => ({
        url: `${baseUrl}/${profile.slug}`,
        lastModified: profile.updated_at ? new Date(profile.updated_at) : new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      }));
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://tikprofil.com';
  
  const [blogPosts, publicListings, publicProfiles] = await Promise.all([
    getBlogPosts(),
    getPublicListings(),
    getPublicProfiles(),
  ]);

  const staticPages: SitemapEntry[] = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/restoran`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/otel`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/fast-food`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/e-ticaret`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/emlak`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/guzellik-merkezi`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/hakkimizda`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/iletisim`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/kesfet`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.7,
    },
  ];

  return [...staticPages, ...blogPosts, ...publicListings, ...publicProfiles];
}
