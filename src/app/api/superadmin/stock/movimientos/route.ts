import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { Stock } from "@/models/Stock";
import { StockMovement } from "@/models/StockMovement";
import jwt from "jsonwebtoken";

const SECRET = process.env.NEXTAUTH_SECRET!;

export async function POST(req: NextRequest) {
    const token = req.cookies.get("session")?.value;
    if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    let payload: any;
    try { payload = jwt.verify(token, SECRET) as any; } catch { return NextResponse.json({ error: "No autorizado" }, { status: 401 }); }
    if (!["superadmin", "admin"].includes(payload.role)) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    const { stockId, tipo, cantidad, motivo, precioUnitario, notas } = await req.json();
    if (!stockId || !tipo || !cantidad || !motivo) return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });

    await connectMongoDB();

    const item = await Stock.findById(stockId);
    if (!item) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });

    const delta = tipo === "entrada" ? Number(cantidad) : -Number(cantidad);
    item.stockActual = Math.max(0, item.stockActual + delta);
    await item.save();

    const mov = await StockMovement.create({
        stockId, tipo, cantidad: Number(cantidad),
        motivo, precioUnitario: precioUnitario || undefined,
        notas: notas || undefined,
        userId: payload.sub,
    });

    return NextResponse.json({ ok: true, stockActual: item.stockActual, movimiento: mov }, { status: 201 });
}
