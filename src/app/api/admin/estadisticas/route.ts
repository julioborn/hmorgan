import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { Pedido } from "@/models/Pedido";
import { User } from "@/models/User";
import { Canje } from "@/models/Canje";
import jwt from "jsonwebtoken";

const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET!;

function startOfDay(d: Date) {
    const r = new Date(d);
    r.setHours(0, 0, 0, 0);
    return r;
}
function endOfDay(d: Date) {
    const r = new Date(d);
    r.setHours(23, 59, 59, 999);
    return r;
}

export async function GET(req: NextRequest) {
    try {
        const token = req.cookies.get("session")?.value;
        if (!token) return NextResponse.json({ message: "No autorizado" }, { status: 401 });

        const payload = jwt.verify(token, NEXTAUTH_SECRET) as any;
        if (payload.role !== "admin") return NextResponse.json({ message: "Acceso denegado" }, { status: 403 });

        await connectMongoDB();

        const url = new URL(req.url);
        const desdeStr = url.searchParams.get("desde");
        const hastaStr = url.searchParams.get("hasta");

        const desde = desdeStr ? startOfDay(new Date(desdeStr)) : (() => {
            const d = new Date();
            d.setDate(d.getDate() - 6);
            d.setHours(0, 0, 0, 0);
            return d;
        })();
        const hasta = hastaStr ? endOfDay(new Date(hastaStr)) : endOfDay(new Date());

        const pedidos = await Pedido.find({ createdAt: { $gte: desde, $lte: hasta } })
            .populate("items.menuItemId", "nombre precio categoria")
            .lean();

        const entregados = pedidos.filter((p: any) => p.estado === "entregado");
        const cancelados = pedidos.filter((p: any) => p.estado === "cancelado");

        const totalIngresos = entregados.reduce((acc: number, p: any) => acc + (p.total || 0), 0);
        const ticketPromedio = entregados.length > 0 ? Math.round(totalIngresos / entregados.length) : 0;
        const tasaCancelacion = pedidos.length > 0
            ? Math.round((cancelados.length / pedidos.length) * 100)
            : 0;

        const conteos = {
            pendiente: pedidos.filter((p: any) => p.estado === "pendiente").length,
            preparando: pedidos.filter((p: any) => p.estado === "preparando").length,
            listo: pedidos.filter((p: any) => p.estado === "listo").length,
            entregado: entregados.length,
            cancelado: cancelados.length,
        };

        // Items más pedidos en el período
        const itemsMap: Record<string, { nombre: string; cantidad: number; categoria: string }> = {};
        for (const pedido of pedidos) {
            for (const item of (pedido as any).items) {
                const id = item.menuItemId?._id?.toString();
                if (!id || !item.menuItemId?.nombre) continue;
                if (!itemsMap[id]) {
                    itemsMap[id] = { nombre: item.menuItemId.nombre, cantidad: 0, categoria: item.menuItemId.categoria };
                }
                itemsMap[id].cantidad += item.cantidad;
            }
        }
        const itemsPopulares = Object.values(itemsMap)
            .sort((a, b) => b.cantidad - a.cantidad)
            .slice(0, 8);

        // Pedidos e ingresos por día en el rango (max 31 días individuales, sino por semana)
        const diffDays = Math.ceil((hasta.getTime() - desde.getTime()) / 86_400_000);
        const pedidosPorDia: { fecha: string; cantidad: number }[] = [];
        const ingresosPorDia: { fecha: string; total: number }[] = [];

        if (diffDays <= 31) {
            for (let i = 0; i <= diffDays; i++) {
                const dia = new Date(desde);
                dia.setDate(dia.getDate() + i);
                const inicio = startOfDay(dia);
                const fin = endOfDay(dia);

                const del_dia = pedidos.filter((p: any) => {
                    const f = new Date(p.createdAt);
                    return f >= inicio && f <= fin;
                });
                const ingreso = del_dia
                    .filter((p: any) => p.estado === "entregado")
                    .reduce((acc: number, p: any) => acc + (p.total || 0), 0);

                const label = inicio.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
                pedidosPorDia.push({ fecha: label, cantidad: del_dia.length });
                ingresosPorDia.push({ fecha: label, total: ingreso });
            }
        } else {
            // Agrupar por semana
            let cursor = new Date(desde);
            while (cursor <= hasta) {
                const weekEnd = new Date(cursor);
                weekEnd.setDate(weekEnd.getDate() + 6);
                if (weekEnd > hasta) weekEnd.setTime(hasta.getTime());

                const del_periodo = pedidos.filter((p: any) => {
                    const f = new Date(p.createdAt);
                    return f >= cursor && f <= weekEnd;
                });
                const ingreso = del_periodo
                    .filter((p: any) => p.estado === "entregado")
                    .reduce((acc: number, p: any) => acc + (p.total || 0), 0);

                const label = cursor.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
                pedidosPorDia.push({ fecha: label, cantidad: del_periodo.length });
                ingresosPorDia.push({ fecha: label, total: ingreso });

                cursor.setDate(cursor.getDate() + 7);
            }
        }

        // Hora pico
        const horasCount: Record<number, number> = {};
        for (const p of pedidos) {
            const hora = new Date((p as any).createdAt).getHours();
            horasCount[hora] = (horasCount[hora] || 0) + 1;
        }
        const horaPicoEntry = Object.entries(horasCount).sort(([, a], [, b]) => b - a)[0];
        const horaPico = horaPicoEntry ? Number(horaPicoEntry[0]) : null;

        // Top 6 horas para el chart
        const horasPorHora = Array.from({ length: 24 }, (_, h) => ({
            hora: h,
            cantidad: horasCount[h] || 0,
        }));

        // Canjes en el período
        const canjesEnPeriodo = await Canje.find({ createdAt: { $gte: desde, $lte: hasta } }).lean();
        const canjesCount = canjesEnPeriodo.length;
        const puntosCanjeados = canjesEnPeriodo.reduce((acc, c) => acc + (c.puntosGastados || 0), 0);

        // Globales (no filtrados por fecha)
        const totalUsuarios = await User.countDocuments({ role: "cliente" });
        const nuevosUsuarios = await User.countDocuments({
            role: "cliente",
            createdAt: { $gte: desde, $lte: hasta },
        });
        const puntosAgg = await User.aggregate([
            { $match: { role: "cliente" } },
            { $group: { _id: null, total: { $sum: "$puntos" } } },
        ]);
        const totalPuntos = puntosAgg[0]?.total || 0;

        const pedidosEmpleado = pedidos.filter((p: any) => p.fuente === "empleado").length;
        const pedidosCliente = pedidos.length - pedidosEmpleado;

        return NextResponse.json({
            totalIngresos,
            totalPedidos: pedidos.length,
            ticketPromedio,
            tasaCancelacion,
            conteos,
            itemsPopulares,
            pedidosPorDia,
            ingresosPorDia,
            horaPico,
            horasPorHora,
            totalUsuarios,
            nuevosUsuarios,
            totalPuntos,
            canjesCount,
            puntosCanjeados,
            pedidosEmpleado,
            pedidosCliente,
        });
    } catch (error) {
        console.error("Error estadísticas:", error);
        return NextResponse.json({ message: "Error interno" }, { status: 500 });
    }
}
