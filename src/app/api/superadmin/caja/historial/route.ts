import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { CajaSession } from "@/models/CajaSession";
import { CajaMovement } from "@/models/CajaMovement";
import jwt from "jsonwebtoken";

const SECRET = process.env.NEXTAUTH_SECRET!;

// Returns lightweight session list — no movement detail, just aggregated totals.
// Full movement detail is loaded on-demand via GET /api/superadmin/caja/sesion/[id].
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
        .limit(60)
        .populate("abiertaPor", "nombre apellido")
        .populate("cerradaPor", "nombre apellido")
        .lean<any[]>();

    const sesionIds = sesiones.map(s => s._id);

    // Single aggregation — no per-movement document loading
    const agg = await CajaMovement.aggregate([
        { $match: { sesionId: { $in: sesionIds } } },
        {
            $group: {
                _id: { sesionId: "$sesionId", tipo: "$tipo", metodoPago: "$metodoPago" },
                total: { $sum: "$monto" },
                excedente: { $sum: { $ifNull: ["$excedente", 0] } },
                count: { $sum: 1 },
            },
        },
    ]);

    const bySession: Record<string, {
        totales: Record<string, { ingreso: number; egreso: number; excedente: number }>;
        totalIngreso: number;
        totalEgreso: number;
        cantMovimientos: number;
    }> = {};

    for (const row of agg) {
        const key = String(row._id.sesionId);
        if (!bySession[key]) bySession[key] = { totales: {}, totalIngreso: 0, totalEgreso: 0, cantMovimientos: 0 };
        const entry = bySession[key];
        const { tipo, metodoPago } = row._id;
        if (!entry.totales[metodoPago]) entry.totales[metodoPago] = { ingreso: 0, egreso: 0, excedente: 0 };
        entry.totales[metodoPago][tipo as "ingreso" | "egreso"] += row.total;
        entry.totales[metodoPago].excedente += row.excedente;
        if (tipo === "ingreso") entry.totalIngreso += row.total;
        if (tipo === "egreso") entry.totalEgreso += row.total;
        entry.cantMovimientos += row.count;
    }

    const result = sesiones.map(s => {
        const key = String(s._id);
        const { totales = {}, totalIngreso = 0, totalEgreso = 0, cantMovimientos = 0 } = bySession[key] ?? {};
        return {
            ...s,
            totales,
            totalIngreso,
            totalEgreso,
            neto: totalIngreso - totalEgreso,
            cantMovimientos,
        };
    });

    return NextResponse.json(result);
}
