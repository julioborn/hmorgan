// src/app/api/menu/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { MenuItem } from "@/models/MenuItem";

export async function GET(req: NextRequest) {
    await connectMongoDB();
    const { searchParams } = new URL(req.url);

    const roulette = searchParams.get("roulette");

    let query: any = {};
    if (roulette) {
        query = { categoria: "COCKTAILS", ruleta: true }; // 👈 solo cocktails marcados
    }

    const items = await MenuItem.find(query);
    return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
    await connectMongoDB();
    const data = await req.json();

    // 👇 si la categoría es COCKTAILS, setear ruleta en true automáticamente
    if (data.categoria?.toUpperCase() === "COCKTAILS") {
        data.ruleta = true;
    }

    const item = await MenuItem.create(data);
    return NextResponse.json(item);
}
