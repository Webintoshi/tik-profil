// AI Image Generation API - Production Version
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { getSessionSecretBytes } from '@/lib/env';
import { uploadBytesToR2 } from '@/lib/r2Storage';

const getJwtSecret = () => getSessionSecretBytes();

export async function POST(request: Request) {
    try {
        // Authentication
        const cookieStore = await cookies();
        const token = cookieStore.get("tikprofil_owner_session")?.value;
        if (!token) {
            return NextResponse.json({ success: false, error: 'Yetkilendirme hatası' }, { status: 401 });
        }

        const { payload } = await jwtVerify(token, getJwtSecret());
        const businessId = payload.businessId as string;
        if (!businessId) {
            return NextResponse.json({ success: false, error: 'İşletme bulunamadı' }, { status: 401 });
        }

        // Environment check
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return NextResponse.json({ success: false, error: 'Yapılandırma hatası' }, { status: 500 });
        }

        // Parse request body
        const body = await request.json();
        const { productTitle, productDescription, businessType, businessName, category } = body;

        if (!productTitle) {
            return NextResponse.json({ success: false, error: 'Ürün adı gerekli' }, { status: 400 });
        }

        // Premium food photography prompt
        const prompt = `Create a premium, photorealistic food product image for a professional menu app.

Product: "${productTitle}"
Description: ${productDescription || productTitle}
Category: ${category || 'Food'}
Business: ${businessName || 'Restaurant'} (${businessType || 'Fast Food'})

CRITICAL REQUIREMENTS:
- Pure white background (#FFFFFF), completely seamless and clean
- Professional commercial food photography style
- Soft, diffused studio lighting with no harsh shadows
- 85mm lens aesthetic with shallow depth of field
- Product positioned center frame, filling approximately 70-80% of composition
- Food must look appetizing, fresh, professionally styled and garnished
- Ultra high resolution, photorealistic quality
- Premium Apple-style minimal aesthetic
- Slight overhead angle (15-30 degrees) for optimal food presentation
- Rich, vibrant but natural colors

ABSOLUTELY DO NOT INCLUDE:
- Any text, labels, logos, or watermarks
- Hands, people, or body parts
- Props, utensils, or background elements
- Colored, textured, or patterned backgrounds
- Packaging or containers (unless part of the product)`;

        // Call Gemini API
        const geminiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';

        const geminiResponse = await fetch(`${geminiUrl}?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { responseModalities: ['TEXT', 'IMAGE'] }
            }),
        });

        if (!geminiResponse.ok) {
            console.error('[AI Generate] Gemini error:', geminiResponse.status);
            return NextResponse.json({ success: false, error: 'Görsel oluşturulamadı' }, { status: 500 });
        }

        const geminiData = await geminiResponse.json();

        // Extract image from response
        let base64Image: string | null = null;
        if (geminiData.candidates?.[0]?.content?.parts) {
            for (const part of geminiData.candidates[0].content.parts) {
                if (part.inlineData?.data) {
                    base64Image = part.inlineData.data;
                    break;
                }
            }
        }

        if (!base64Image) {
            return NextResponse.json({ success: false, error: 'Görsel oluşturulamadı' }, { status: 500 });
        }

        const imageBuffer = Buffer.from(base64Image, 'base64');
        const { url: imageUrl } = await uploadBytesToR2({
            bytes: imageBuffer,
            contentType: 'image/png',
            fileName: `ai_${Date.now()}.png`,
            moduleName: 'fastfood',
            businessId,
        });

        return NextResponse.json({
            success: true,
            imageUrl,
            message: 'Görsel başarıyla oluşturuldu!'
        });

    } catch (error) {
        console.error('[AI Generate] Error:', error);
        return NextResponse.json({ success: false, error: 'Bir hata oluştu' }, { status: 500 });
    }
}
