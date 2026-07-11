import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { CajaSession } from "@/models/CajaSession";
import { CajaMovement } from "@/models/CajaMovement";
import jwt from "jsonwebtoken";

const SECRET = process.env.NEXTAUTH_SECRET!;

export async function POST(req: NextRequest) {
    const token = req.cookies.get("session")?.value;
    if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    let payload: any;
    try { payload = jwt.verify(token, SECRET) as any; } catch { return NextResponse.json({ error: "No autorizado" }, { status: 401 }); }
    if (!["superadmin", "admin", "cajero"].includes(payload.role)) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    await connectMongoDB();
    const sesion = await CajaSession.findOne({ estado: "abierta" });
    if (!sesion) return NextResponse.json({ error: "No hay sesión abierta" }, { status: 400 });

    const { tipo, concepto, monto, metodoPago, pedidoId } = await req.json();
    if (!tipo || !concepto || !monto) return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });

    const mov = await CajaMovement.create({
        sesionId: sesion._id,
        tipo, concepto,
        monto: Number(monto),
        metodoPago: metodoPago || "efectivo",
        pedidoId: pedidoId || undefined,
        userId: payload.sub,
    });

    return NextResponse.json(mov, { status: 201 });
}
