import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { MenuItem } from "@/models/MenuItem";

export async function GET(req: NextRequest) {
    await connectMongoDB();
    const { searchParams } = new URL(req.url);

    const roulette = searchParams.get("roulette");
    const activo = searchParams.get("activo");

    let query: any = {};

    // 🎯 filtro de ruleta (ya existente)
    if (roulette) {
        query = { categoria: "COCKTAILS", ruleta: true };
    }

    // 🟢 nuevo filtro: activo
    if (activo === "true") query.activo = true;
    if (activo === "false") query.activo = false;

    const items = await MenuItem.find(query).sort({ categoria: 1, nombre: 1 });
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
