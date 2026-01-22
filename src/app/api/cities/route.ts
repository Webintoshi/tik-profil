import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// JSON dosyasının yolu
const dataFilePath = path.join(process.cwd(), 'src/lib/data/cities.json');

export async function GET(request: Request) {
    try {
        // URL parametrelerini al
        const { searchParams } = new URL(request.url);
        const name = searchParams.get('name');

        // Dosyayı oku
        const fileContents = await fs.readFile(dataFilePath, 'utf8');
        const cities = JSON.parse(fileContents);

        if (name) {
            // İsim parametresi varsa o şehri bul (case-insensitive)
            const city = cities.find((c: any) => c.name.toLowerCase() === name.toLowerCase());
            
            if (city) {
                return NextResponse.json(city);
            } else {
                // Şehir bulunamazsa 404 yerine null dön (frontend'de gracefully handle etmek için)
                return NextResponse.json(null);
            }
        }

        // Parametre yoksa tüm şehirleri dön
        return NextResponse.json(cities);
    } catch (error) {
        console.error('City API Error:', error);
        return NextResponse.json({ error: 'Failed to load city data' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const fileContents = await fs.readFile(dataFilePath, 'utf8');
        const cities = JSON.parse(fileContents);

        // Mevcut şehri güncelle veya yeni ekle
        const index = cities.findIndex((c: any) => c.id === body.id);
        
        if (index !== -1) {
            cities[index] = { ...cities[index], ...body };
        } else {
            cities.push(body);
        }

        // Dosyayı kaydet
        await fs.writeFile(dataFilePath, JSON.stringify(cities, null, 2));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('City API Error:', error);
        return NextResponse.json({ error: 'Failed to save city data' }, { status: 500 });
    }
}
