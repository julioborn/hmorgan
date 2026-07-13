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

    // Run both aggregations in parallel
    const [agg, deliveryAgg] = await Promise.all([
        // Main: totals grouped by sesion + tipo + metodoPago
        CajaMovement.aggregate([
            { $match: { sesionId: { $in: sesionIds } } },
            {
                $group: {
                    _id: { sesionId: "$sesionId", tipo: "$tipo", metodoPago: "$metodoPago" },
                    total: { $sum: "$monto" },
                    excedente: { $sum: { $ifNull: ["$excedente", 0] } },
                    count: { $sum: 1 },
                },
            },
        ]),
        // Delivery count: join Pedido to check tipoEntrega — reliable regardless of concepto format
        CajaMovement.aggregate([
            { $match: { sesionId: { $in: sesionIds }, tipo: "ingreso", pedidoId: { $ne: null, $exists: true } } },
            {
                $lookup: {
                    from: "pedidos",
                    localField: "pedidoId",
                    foreignField: "_id",
                    as: "pedido",
                    pipeline: [{ $project: { tipoEntrega: 1 } }],
                },
            },
            { $unwind: { path: "$pedido", preserveNullAndEmptyArrays: false } },
            { $match: { "pedido.tipoEntrega": "envio" } },
            { $group: { _id: "$sesionId", cantDelivery: { $sum: 1 } } },
        ]),
    ]);

    // Build delivery map: sesionId → count
    const deliveryBySesion: Record<string, number> = {};
    for (const row of deliveryAgg) {
        deliveryBySesion[String(row._id)] = row.cantDelivery;
    }

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
            cantDelivery: deliveryBySesion[key] ?? 0,
        };
    });

    return NextResponse.json(result);
}
