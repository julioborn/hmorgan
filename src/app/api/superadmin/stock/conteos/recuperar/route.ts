import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { StockConteo } from "@/models/StockConteo";
import { Stock } from "@/models/Stock";
import jwt from "jsonwebtoken";

const SECRET = process.env.NEXTAUTH_SECRET!;

export async function POST(req: NextRequest) {
    const token = req.cookies.get("session")?.value;
    if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    let payload: any;
    try {
        payload = jwt.verify(token, SECRET) as any;
        if (!["superadmin", "admin"].includes(payload.role))
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    } catch { return NextResponse.json({ error: "No autorizado" }, { status: 401 }); }

    await connectMongoDB();

    const productos = await Stock.find({}).lean() as any[];
    const items = productos.map((p: any) => ({
        stockId: p._id,
        nombre: p.nombre,
        tipo: p.tipo,
        categoria: p.categoria,
        unidad: p.unidad,
        cantidad: p.stockActual ?? 0,
    }));

    const conteo = await StockConteo.create({
        items,
        notas: "Recuperado automáticamente del stock actual",
        userId: payload.sub,
    });

    return NextResponse.json(conteo, { status: 201 });
}
