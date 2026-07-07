import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { CajaSession } from "@/models/CajaSession";
import { CajaMovement } from "@/models/CajaMovement";
import { Evento } from "@/models/Evento";
import jwt from "jsonwebtoken";
import { OWNER_USER_ID } from "@/lib/owner";

const SECRET = process.env.NEXTAUTH_SECRET!;

export async function GET(req: NextRequest) {
    const token = req.cookies.get("session")?.value;
    if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    try {
        const p = jwt.verify(token, SECRET) as any;
        if (!["superadmin", "admin", "cajero"].includes(p.role) && p.sub !== OWNER_USER_ID)
            return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    } catch { return NextResponse.json({ error: "No autorizado" }, { status: 401 }); }

    await connectMongoDB();

    const sesiones = await CajaSession.find()
        .sort({ fechaApertura: -1 })
        .populate("abiertaPor", "nombre apellido")
        .populate("cerradaPor", "nombre apellido")
        .lean<any[]>();

    const sesionIds = sesiones.map(s => s._id);

    const movimientos = await CajaMovement.find({ sesionId: { $in: sesionIds } })
        .populate("userId", "nombre apellido")
        .populate({
            path: "pedidoId",
            select: "mesa nombreComanda fuente items total eventoId userId clienteId",
            populate: [
                { path: "items.menuItemId", select: "nombre precio categoria" },
                { path: "userId",    select: "nombre apellido" },
                { path: "clienteId", select: "nombre apellido telefono" },
                { path: "eventoId",  select: "nombre" },
            ],
        })
        .sort({ createdAt: 1 })
        .lean<any[]>();

    const movPorSesion: Record<string, any[]> = {};
    for (const m of movimientos) {
        const key = String(m.sesionId);
        if (!movPorSesion[key]) movPorSesion[key] = [];
        movPorSesion[key].push(m);
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

        // Aggregate products from movements (avoids expensive full Pedido scan)
        const productosMap: Record<string, { nombre: string; categoria: string; cantidad: number; total: number }> = {};
        const pedidosContados = new Set<string>();
        for (const m of movs) {
            const pedido = m.pedidoId as any;
            const pid = pedido?._id ? String(pedido._id) : null;
            const isParcial = (m.concepto || "").toLowerCase().includes("parcial");

            if (pid && !isParcial && !pedidosContados.has(pid)) {
                // Cobro final: contar ítems del pedido una sola vez
                pedidosContados.add(pid);
                for (const it of (pedido.items ?? [])) {
                    const mi = it.menuItemId as any;
                    if (!mi) continue;
                    const k = String(mi._id);
                    if (!productosMap[k]) productosMap[k] = { nombre: mi.nombre || "Ítem", categoria: mi.categoria || "", cantidad: 0, total: 0 };
                    productosMap[k].cantidad += it.cantidad;
                    productosMap[k].total += (mi.precio || 0) * it.cantidad;
                }
            } else if (Array.isArray(m.items) && m.items.length > 0) {
                // Cobro parcial o venta directa: usar ítems del movimiento
                for (const it of m.items) {
                    const k = it.nombre;
                    if (!productosMap[k]) productosMap[k] = { nombre: it.nombre, categoria: it.categoria || "", cantidad: 0, total: 0 };
                    productosMap[k].cantidad += it.cantidad;
                    productosMap[k].total += (it.precio || 0) * it.cantidad;
                }
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
