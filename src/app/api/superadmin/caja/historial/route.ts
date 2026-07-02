import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { CajaSession } from "@/models/CajaSession";
import { CajaMovement } from "@/models/CajaMovement";
import { Pedido } from "@/models/Pedido";
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

    const [movimientos, pedidos] = await Promise.all([
        CajaMovement.find({ sesionId: { $in: sesionIds } })
            .populate("userId", "nombre apellido")
            .sort({ createdAt: 1 })
            .lean<any[]>(),
        Pedido.find({ estado: "cerrado" })
            .populate("items.menuItemId", "nombre precio categoria")
            .lean<any[]>(),
    ]);

    const movPorSesion: Record<string, any[]> = {};
    for (const m of movimientos) {
        const key = String(m.sesionId);
        if (!movPorSesion[key]) movPorSesion[key] = [];
        movPorSesion[key].push(m);
    }

    // Match each pedido to its session by updatedAt timestamp
    const pedidosPorSesion: Record<string, any[]> = {};
    for (const p of pedidos) {
        const ts = new Date(p.updatedAt).getTime();
        for (const s of sesiones) {
            const ini = new Date(s.fechaApertura).getTime();
            const fin = s.fechaCierre ? new Date(s.fechaCierre).getTime() : Date.now();
            if (ts >= ini && ts <= fin) {
                const key = String(s._id);
                if (!pedidosPorSesion[key]) pedidosPorSesion[key] = [];
                pedidosPorSesion[key].push(p);
                break;
            }
        }
    }

    const result = sesiones.map(s => {
        const movs = movPorSesion[String(s._id)] || [];

        const totales = movs.reduce((acc: Record<string, { ingreso: number; egreso: number; excedente: number }>, m: any) => {
            if (!acc[m.metodoPago]) acc[m.metodoPago] = { ingreso: 0, egreso: 0, excedente: 0 };
            acc[m.metodoPago][m.tipo as "ingreso" | "egreso"] += m.monto;
            if (m.excedente) acc[m.metodoPago].excedente += m.excedente;
            return acc;
        }, {});

        const totalIngreso = movs.filter((m: any) => m.tipo === "ingreso").reduce((sum: number, m: any) => sum + m.monto, 0);
        const totalEgreso  = movs.filter((m: any) => m.tipo === "egreso").reduce((sum: number, m: any) => sum + m.monto, 0);

        // Aggregate products from pedidos in this session
        const productosMap: Record<string, { nombre: string; categoria: string; cantidad: number; total: number }> = {};
        for (const p of pedidosPorSesion[String(s._id)] || []) {
            for (const it of p.items) {
                const mi = it.menuItemId as any;
                if (!mi) continue;
                const k = String(mi._id);
                if (!productosMap[k]) productosMap[k] = { nombre: mi.nombre || "Ítem", categoria: mi.categoria || "", cantidad: 0, total: 0 };
                productosMap[k].cantidad += it.cantidad;
                productosMap[k].total += (mi.precio || 0) * it.cantidad;
            }
        }

        return {
            ...s,
            totales,
            totalIngreso,
            totalEgreso,
            neto: totalIngreso - totalEgreso,
            cantMovimientos: movs.length,
            movimientos: movs,
            productos: productosMap,
        };
    });

    return NextResponse.json(result);
}
