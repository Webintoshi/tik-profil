// Consultant Logout API
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
    try {
        const cookieStore = await cookies();

        // Clear consultant session cookie
        cookieStore.set('tikprofil_consultant_session', '', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 0,
            path: '/',
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Consultant Logout] Error:', error);
        return NextResponse.json({
            success: false,
            error: 'Çıkış yapılamadı'
        }, { status: 500 });
    }
}
