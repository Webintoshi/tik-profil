import { NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

function assertEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}

let client: S3Client | undefined;

function getClient(): S3Client {
    if (client) return client;
    const accountId = assertEnv('CLOUDFLARE_R2_ACCOUNT_ID');
    client = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: assertEnv('CLOUDFLARE_R2_ACCESS_KEY_ID'),
            secretAccessKey: assertEnv('CLOUDFLARE_R2_SECRET_ACCESS_KEY'),
        },
    });
    return client;
}

export async function GET(_: Request, ctx: { params: Promise<{ key: string[] }> }) {
    try {
        const { key: parts } = await ctx.params;
        const key = (parts || []).join('/');
        if (!key) {
            return NextResponse.json({ error: 'Missing key' }, { status: 400 });
        }

        const bucket = assertEnv('CLOUDFLARE_R2_BUCKET_NAME');
        const res = await getClient().send(new GetObjectCommand({ Bucket: bucket, Key: key }));

        const body = res.Body as any;
        const headers = new Headers();
        if (res.ContentType) headers.set('Content-Type', res.ContentType);
        headers.set('Cache-Control', 'public, max-age=31536000, immutable');

        return new NextResponse(body, { status: 200, headers });
    } catch (error: any) {
        const status = error?.$metadata?.httpStatusCode;
        if (status === 404) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }
        return NextResponse.json({ error: 'Failed to fetch object' }, { status: 500 });
    }
}

