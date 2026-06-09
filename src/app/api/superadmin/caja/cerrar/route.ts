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

    const { montoCierre, notas } = await req.json();
    const movimientos = await CajaMovement.find({ sesionId: sesion._id }).lean();

    // Calcular totales
    const resumen = movimientos.reduce((acc: any, m: any) => {
        const key = m.metodoPago;
        if (!acc[key]) acc[key] = { ingreso: 0, egreso: 0 };
        acc[key][m.tipo] += m.monto;
        return acc;
    }, {});

    sesion.estado = "cerrada";
    sesion.montoCierre = Number(montoCierre) || 0;
    sesion.cerradaPor = payload.sub;
    sesion.fechaCierre = new Date();
    if (notas) sesion.notas = notas;
    await sesion.save();

    return NextResponse.json({ ok: true, resumen, sesion });
}
