import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { CajaSession } from "@/models/CajaSession";
import { CajaMovement } from "@/models/CajaMovement";
import jwt from "jsonwebtoken";

const SECRET = process.env.NEXTAUTH_SECRET!;

export async function GET(req: NextRequest) {
    const token = req.cookies.get("session")?.value;
    if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    try {
        const p = jwt.verify(token, SECRET) as any;
        if (!["superadmin", "admin", "cajero"].includes(p.role))
            return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    } catch { return NextResponse.json({ error: "No autorizado" }, { status: 401 }); }

    await connectMongoDB();

    const sesiones = await CajaSession.find()
        .sort({ fechaApertura: -1 })
        .populate("abiertaPor", "nombre apellido")
        .populate("cerradaPor", "nombre apellido")
        .lean<any[]>();

    const sesionIds = sesiones.map(s => s._id);
    const movimientos = await CajaMovement.find({ sesionId: { $in: sesionIds } }).lean<any[]>();

    const movPorSesion: Record<string, any[]> = {};
    for (const m of movimientos) {
        const key = String(m.sesionId);
        if (!movPorSesion[key]) movPorSesion[key] = [];
        movPorSesion[key].push(m);
    }

    const result = sesiones.map(s => {
        const movs = movPorSesion[String(s._id)] || [];
        const totales = movs.reduce((acc: Record<string, { ingreso: number; egreso: number }>, m: any) => {
            if (!acc[m.metodoPago]) acc[m.metodoPago] = { ingreso: 0, egreso: 0 };
            acc[m.metodoPago][m.tipo as "ingreso" | "egreso"] += m.monto;
            return acc;
        }, {});
        const totalIngreso = movs.filter((m: any) => m.tipo === "ingreso").reduce((sum: number, m: any) => sum + m.monto, 0);
        const totalEgreso = movs.filter((m: any) => m.tipo === "egreso").reduce((sum: number, m: any) => sum + m.monto, 0);
        return {
            ...s,
            totales,
            totalIngreso,
            totalEgreso,
            neto: totalIngreso - totalEgreso,
            cantMovimientos: movs.length,
        };
    });

    return NextResponse.json(result);
}
