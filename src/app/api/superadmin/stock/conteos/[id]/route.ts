import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { StockConteo } from "@/models/StockConteo";
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

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    const payload = auth(req);
    if (!payload) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    await connectMongoDB();
    const conteo = await StockConteo.findById(params.id).lean();
    if (!conteo) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    return NextResponse.json(conteo);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
    const payload = auth(req);
    if (!payload) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    await connectMongoDB();
    const { items } = await req.json();
    if (!items?.length) return NextResponse.json({ error: "Sin items" }, { status: 400 });

    const conteo = await StockConteo.findById(params.id);
    if (!conteo) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    for (const newItem of items) {
        const cant = Number(newItem.cantidad ?? 0);
        if (cant <= 0) continue;
        const idx = conteo.items.findIndex((i: any) => i.stockId.toString() === newItem.stockId);
        if (idx >= 0) {
            conteo.items[idx].cantidad += cant;
            if (newItem.precioUnitario) conteo.items[idx].precioUnitario = newItem.precioUnitario;
        } else {
            conteo.items.push({ ...newItem, cantidad: cant });
        }
    }

    const total = conteo.items.reduce((s: number, i: any) => s + (i.precioUnitario ?? 0) * i.cantidad, 0);
    conteo.totalValorizacion = total > 0 ? total : undefined;
    await conteo.save();
    return NextResponse.json(conteo);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    const payload = auth(req);
    if (!payload) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    await connectMongoDB();
    await StockConteo.findByIdAndDelete(params.id);
    return NextResponse.json({ ok: true });
}
