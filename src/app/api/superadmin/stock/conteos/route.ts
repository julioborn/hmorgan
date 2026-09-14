import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { StockConteo } from "@/models/StockConteo";
import { Stock } from "@/models/Stock";
import jwt from "jsonwebtoken";

const SECRET = process.env.NEXTAUTH_SECRET!;

function auth(req: NextRequest) {
    const token = req.cookies.get("session")?.value;
    if (!token) return null;
    try {
        const p = jwt.verify(token, SECRET) as any;
        if (!["superadmin", "admin"].includes(p.role)) return null;
        return p;
    } catch { return null; }
}

export async function GET(req: NextRequest) {
    const payload = auth(req);
    if (!payload) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    await connectMongoDB();
    const conteos = await StockConteo.find({})
        .sort({ createdAt: -1 })
        .limit(20)
        .select("createdAt notas items")
        .lean();
    return NextResponse.json(conteos);
}

export async function POST(req: NextRequest) {
    const payload = auth(req);
    if (!payload) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    await connectMongoDB();
    const { items, notas } = await req.json();
    if (!items?.length) return NextResponse.json({ error: "Sin items" }, { status: 400 });
    const totalValorizacion = items.reduce((sum: number, i: any) =>
        sum + (Number(i.precioUnitario ?? 0) * Number(i.cantidad)), 0);
    const conteo = await StockConteo.create({
        items, notas, userId: payload.sub,
        totalValorizacion: totalValorizacion > 0 ? totalValorizacion : undefined,
    });

    // Sincronizar stockActual en cada producto
    await Promise.all(items.map((i: any) =>
        Stock.findByIdAndUpdate(i.stockId, { stockActual: Number(i.cantidad) })
    ));

    return NextResponse.json(conteo, { status: 201 });
}
