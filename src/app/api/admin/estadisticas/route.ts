import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { Pedido } from "@/models/Pedido";
import { User } from "@/models/User";
import { Canje } from "@/models/Canje";
import { MenuItem } from "@/models/MenuItem";
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

        // Completados = cerrado (cobrado en caja) + entregado (delivery entregado)
        const completados = pedidos.filter((p: any) => p.estado === "cerrado" || p.estado === "entregado");
        const cancelados  = pedidos.filter((p: any) => p.estado === "cancelado");
        // No cancelados = todos menos cancelados (para gráficos de actividad)
        const noCancelados = pedidos.filter((p: any) => p.estado !== "cancelado");

        // Revenue: usar montoPagado si existe (refleja descuentos), si no usar total
        const ingresoReal = (p: any) => p.montoPagado ?? p.total ?? 0;

        const totalIngresos = completados.reduce((acc: number, p: any) => acc + ingresoReal(p), 0);
        const ticketPromedio = completados.length > 0 ? Math.round(totalIngresos / completados.length) : 0;
        const tasaCancelacion = pedidos.length > 0
            ? Math.round((cancelados.length / pedidos.length) * 100)
            : 0;

        const conteos = {
            pendiente:  pedidos.filter((p: any) => p.estado === "pendiente").length,
            preparando: pedidos.filter((p: any) => p.estado === "preparando").length,
            listo:      pedidos.filter((p: any) => p.estado === "listo").length,
            entregado:  pedidos.filter((p: any) => p.estado === "entregado").length,
            cerrado:    pedidos.filter((p: any) => p.estado === "cerrado").length,
            cancelado:  cancelados.length,
        };

        // Items más pedidos — solo de pedidos no cancelados
        const itemsMap: Record<string, { nombre: string; cantidad: number; categoria: string }> = {};
        for (const pedido of noCancelados) {
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

        // Pedidos e ingresos por período — pedidos no cancelados / ingresos de completados
        const diffDays = Math.ceil((hasta.getTime() - desde.getTime()) / 86_400_000);
        const pedidosPorDia: { fecha: string; cantidad: number }[] = [];
        const ingresosPorDia: { fecha: string; total: number }[] = [];

        if (diffDays <= 31) {
            for (let i = 0; i <= diffDays; i++) {
                const dia = new Date(desde);
                dia.setDate(dia.getDate() + i);
                const inicio = startOfDay(dia);
                const fin = endOfDay(dia);

                const del_dia = noCancelados.filter((p: any) => {
                    const f = new Date(p.createdAt);
                    return f >= inicio && f <= fin;
                });
                const ingreso = del_dia
                    .filter((p: any) => p.estado === "cerrado" || p.estado === "entregado")
                    .reduce((acc: number, p: any) => acc + ingresoReal(p), 0);

                const label = inicio.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
                pedidosPorDia.push({ fecha: label, cantidad: del_dia.length });
                ingresosPorDia.push({ fecha: label, total: ingreso });
            }
        } else {
            let cursor = new Date(desde);
            while (cursor <= hasta) {
                const weekEnd = new Date(cursor);
                weekEnd.setDate(weekEnd.getDate() + 6);
                if (weekEnd > hasta) weekEnd.setTime(hasta.getTime());

                const del_periodo = noCancelados.filter((p: any) => {
                    const f = new Date(p.createdAt);
                    return f >= cursor && f <= weekEnd;
                });
                const ingreso = del_periodo
                    .filter((p: any) => p.estado === "cerrado" || p.estado === "entregado")
                    .reduce((acc: number, p: any) => acc + ingresoReal(p), 0);

                const label = cursor.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
                pedidosPorDia.push({ fecha: label, cantidad: del_periodo.length });
                ingresosPorDia.push({ fecha: label, total: ingreso });

                cursor.setDate(cursor.getDate() + 7);
            }
        }

        // Hora pico — solo pedidos no cancelados
        const horasCount: Record<number, number> = {};
        for (const p of noCancelados) {
            const hora = new Date((p as any).createdAt).getHours();
            horasCount[hora] = (horasCount[hora] || 0) + 1;
        }
        const horaPicoEntry = Object.entries(horasCount).sort(([, a], [, b]) => b - a)[0];
        const horaPico = horaPicoEntry ? Number(horaPicoEntry[0]) : null;

        const horasPorHora = Array.from({ length: 24 }, (_, h) => ({
            hora: h,
            cantidad: horasCount[h] || 0,
        }));

        // Canjes en el período
        const canjesEnPeriodo = await Canje.find({ createdAt: { $gte: desde, $lte: hasta } }).lean();
        const canjesCount = canjesEnPeriodo.length;
        const puntosCanjeados = canjesEnPeriodo.reduce((acc, c) => acc + (c.puntosGastados || 0), 0);

        // Usuarios
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

        // Origen de pedidos — solo no cancelados
        const pedidosEmpleado     = noCancelados.filter((p: any) => p.fuente === "empleado").length;
        const pedidosCliente      = noCancelados.filter((p: any) => (p.fuente || "cliente") === "cliente").length;
        const pedidosAutoservicio = noCancelados.filter((p: any) => p.fuente === "autoservicio").length;

        // Tipo de entrega — solo no cancelados
        const tipoEntregaSplit: Record<string, number> = { retira: 0, envio: 0 };
        for (const p of noCancelados) {
            const tipo = (p as any).tipoEntrega || "retira";
            tipoEntregaSplit[tipo] = (tipoEntregaSplit[tipo] || 0) + 1;
        }

        // Método de pago — solo completados
        const metodoPagoSplit: Record<string, number> = {};
        for (const p of completados) {
            const metodo = (p as any).metodoPago;
            if (metodo) metodoPagoSplit[metodo] = (metodoPagoSplit[metodo] || 0) + 1;
        }

        // Ingresos por categoría — solo completados, usando ingresoReal
        const categoriasMap: Record<string, { total: number; cantidad: number }> = {};
        for (const pedido of completados) {
            const totalPed = ingresoReal(pedido);
            const totalBruto = (pedido as any).total || 0;
            // Factor de descuento proporcional si hay montoPagado < total
            const factor = totalBruto > 0 ? totalPed / totalBruto : 1;
            for (const item of (pedido as any).items) {
                const cat = item.menuItemId?.categoria || "Otros";
                const precio = item.menuItemId?.precio || 0;
                if (!categoriasMap[cat]) categoriasMap[cat] = { total: 0, cantidad: 0 };
                categoriasMap[cat].total += Math.round(precio * item.cantidad * factor);
                categoriasMap[cat].cantidad += item.cantidad;
            }
        }
        const ingresosPorCategoria = Object.entries(categoriasMap)
            .map(([categoria, data]) => ({ categoria, ...data }))
            .sort((a, b) => b.total - a.total);

        // Top clientes reales por gasto en el período
        const clientesAgg = await Pedido.aggregate([
            {
                $match: {
                    createdAt: { $gte: desde, $lte: hasta },
                    estado: { $in: ["cerrado", "entregado"] },
                    userId: { $exists: true, $ne: null },
                }
            },
            {
                $group: {
                    _id: "$userId",
                    totalGastado: { $sum: { $ifNull: ["$montoPagado", "$total"] } },
                    pedidos: { $sum: 1 },
                    ultimoPedido: { $max: "$createdAt" },
                }
            },
            { $sort: { totalGastado: -1 } },
            { $limit: 50 },
        ]);

        const clienteUserIds = clientesAgg.map((c: any) => c._id);
        const clienteUsers = await User.find({ _id: { $in: clienteUserIds } })
            .select("nombre apellido puntos")
            .lean();
        const clienteUsersMap = new Map((clienteUsers as any[]).map(u => [u._id.toString(), u]));

        const topClientes = clientesAgg
            .map((c: any) => {
                const u = clienteUsersMap.get(c._id.toString()) as any;
                if (!u) return null;
                return {
                    _id: c._id.toString(),
                    nombre: `${u.nombre || ""} ${u.apellido || ""}`.trim(),
                    totalGastado: c.totalGastado,
                    pedidos: c.pedidos,
                    puntos: u.puntos || 0,
                    ultimoPedido: c.ultimoPedido,
                };
            })
            .filter(Boolean);

        // Ventas por producto — todos los ítems activos del menú cruzados con ventas del período
        const allMenuItems = await MenuItem.find({ activo: true }).lean();
        const itemsVentasMap: Record<string, { cantidadVendida: number; ingresoTotal: number }> = {};
        for (const pedido of completados) {
            for (const item of (pedido as any).items) {
                const id = item.menuItemId?._id?.toString();
                if (!id) continue;
                const precio = item.menuItemId?.precio || 0;
                if (!itemsVentasMap[id]) itemsVentasMap[id] = { cantidadVendida: 0, ingresoTotal: 0 };
                itemsVentasMap[id].cantidadVendida += item.cantidad;
                itemsVentasMap[id].ingresoTotal += precio * item.cantidad;
            }
        }
        const ventasPorProducto = (allMenuItems as any[]).map((mi) => ({
            _id: mi._id.toString(),
            nombre: mi.nombre,
            categoria: mi.categoria,
            categoriasExtra: mi.categoriasExtra || [],
            precio: mi.precio,
            cantidadVendida: itemsVentasMap[mi._id.toString()]?.cantidadVendida || 0,
            ingresoTotal: itemsVentasMap[mi._id.toString()]?.ingresoTotal || 0,
        })).sort((a, b) => b.cantidadVendida - a.cantidadVendida);

        return NextResponse.json({
            totalIngresos,
            totalPedidos: pedidos.length,
            totalCompletados: completados.length,
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
            pedidosAutoservicio,
            tipoEntregaSplit,
            metodoPagoSplit,
            ingresosPorCategoria,
            ventasPorProducto,
            topClientes,
        });
    } catch (error) {
        console.error("Error estadísticas:", error);
        return NextResponse.json({ message: "Error interno" }, { status: 500 });
    }
}
