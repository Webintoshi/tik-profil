import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { AppError } from "@/lib/errors";
import { assertPlatformAdmin, publicReadOnly } from "@/server/auth/guards";

const dataFilePath = path.join(process.cwd(), "src/lib/data/cities.json");

export async function GET(request: Request) {
    try {
        publicReadOnly();

        const { searchParams } = new URL(request.url);
        const name = searchParams.get("name");
        const fileContents = await fs.readFile(dataFilePath, "utf8");
        const cities = JSON.parse(fileContents);

        if (name) {
            const city = cities.find((item: any) => item.name.toLowerCase() === name.toLowerCase());
            return NextResponse.json(city || null);
        }

        return NextResponse.json(cities);
    } catch (error) {
        console.error("City API Error:", error);
        return NextResponse.json({ error: "Failed to load city data" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        await assertPlatformAdmin();

        const body = await request.json();
        const fileContents = await fs.readFile(dataFilePath, "utf8");
        const cities = JSON.parse(fileContents);
        const index = cities.findIndex((city: any) => city.id === body.id);

        if (index !== -1) {
            cities[index] = { ...cities[index], ...body };
        } else {
            cities.push(body);
        }

        await fs.writeFile(dataFilePath, JSON.stringify(cities, null, 2));

        return NextResponse.json({ success: true });
    } catch (error) {
        if (error instanceof AppError) {
            return error.toResponse();
        }

        console.error("City API Error:", error);
        return NextResponse.json({ error: "Failed to save city data" }, { status: 500 });
    }
}
