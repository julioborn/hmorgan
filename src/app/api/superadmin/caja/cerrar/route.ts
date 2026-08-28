import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { CajaSession } from "@/models/CajaSession";
import { CajaMovement } from "@/models/CajaMovement";
import { Evento } from "@/models/Evento";
import { Pedido } from "@/models/Pedido";
import jwt from "jsonwebtoken";

const SECRET = process.env.NEXTAUTH_SECRET!;

export async function POST(req: NextRequest) {
    const token = req.cookies.get("session")?.value;
    if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    let payload: any;
    try { payload = jwt.verify(token, SECRET) as any; } catch { return NextResponse.json({ error: "No autorizado" }, { status: 401 }); }
    if (!["superadmin", "admin", "cajero"].includes(payload.role)) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    try {
    await connectMongoDB();
    const sesion = await CajaSession.findOne({ estado: "abierta" });
    if (!sesion) return NextResponse.json({ error: "No hay sesión abierta" }, { status: 400 });

    const { montoCierre, notas } = await req.json();
    const movimientos = await CajaMovement.find({ sesionId: sesion._id }).lean();

    // Calcular totales por método (incluye excedentes)
    const resumen = movimientos.reduce((acc: any, m: any) => {
        const key = m.metodoPago;
        if (!acc[key]) acc[key] = { ingreso: 0, egreso: 0, excedente: 0 };
        acc[key][m.tipo] += m.monto;
        if (m.excedente) acc[key].excedente += m.excedente;
        return acc;
    }, {});

    const montoInicial = sesion.montoInicial || 0;
    const montoCierreNum = Number(montoCierre) || 0;
    const efectivoIngreso = resumen.efectivo?.ingreso || 0;
    const efectivoEgreso  = resumen.efectivo?.egreso  || 0;
    const efectivoSistema = montoInicial + efectivoIngreso - efectivoEgreso;
    const diferencia      = montoCierreNum - efectivoSistema;

    // Contar pedidos delivery entregados durante esta sesión
    const pedidoIdsDelivery = await CajaMovement.distinct("pedidoId", {
        sesionId: sesion._id,
        tipo: "ingreso",
        pedidoId: { $exists: true, $ne: null },
    });
    const deliveryCount = pedidoIdsDelivery.length > 0
        ? await Pedido.countDocuments({ _id: { $in: pedidoIdsDelivery }, fuente: "cliente", tipoEntrega: "envio" })
        : 0;

    // Calcular desglose por evento a partir del campo concepto
    const movEvento = movimientos.filter((m: any) =>
        /^(Venta directa evento|Entradas evento):/.test(m.concepto)
    );
    const eventosMap: Record<string, { total: number; porMetodo: Record<string, number> }> = {};
    for (const m of movEvento as any[]) {
        const match = m.concepto.match(/^(?:Venta directa evento|Entradas evento): (.+?)(?:\s+\(\d+×\))?$/);
        const nombre = match?.[1] || "Evento";
        if (!eventosMap[nombre]) eventosMap[nombre] = { total: 0, porMetodo: {} };
        eventosMap[nombre].total += m.monto;
        eventosMap[nombre].porMetodo[m.metodoPago] = (eventosMap[nombre].porMetodo[m.metodoPago] || 0) + m.monto;
    }
    const eventosResumen = Object.entries(eventosMap).map(([nombre, data]) => ({ nombre, ...data }));

    // ── PASO 1: Cerrar eventos activos ANTES de grabar fechaCierre ──────────────
    // Así su updatedAt queda ANTES de sesion.fechaCierre y el historial los asocia
    // correctamente a esta sesión (no como "huérfanos").
    const eventosActivosAhora = await Evento.find({ estado: "activo" }).lean<any[]>();

    for (const ev of eventosActivosAhora) {
        const evId = ev._id;

        // Pedidos de este evento
        const pedidosEv = await Pedido.find({ eventoId: evId })
            .select("estado total metodoPago")
            .lean<any[]>();

        // IDs de pedidos de este evento
        const pedidoIds = pedidosEv.map((p: any) => p._id.toString());

        // Ventas directas (desde el documento del evento)
        const ventas: any[] = ev.ventas ?? [];
        const ventasEfectivo      = ventas.filter(v => v.metodoPago === "efectivo").reduce((a, v) => a + v.total, 0);
        const ventasTransferencia  = ventas.filter(v => v.metodoPago === "transferencia").reduce((a, v) => a + v.total, 0);
        const ventasTarjeta        = ventas.filter(v => v.metodoPago === "tarjeta").reduce((a, v) => a + v.total, 0);

        // Tarjetas de entrada
        const tarjetas: any[] = ev.tarjetas ?? [];
        const precioTarjeta   = ev.precioTarjeta ?? 0;
        const entradasCantidad = tarjetas.reduce((a: number, t: any) => a + t.cantidad, 0);
        const entradasTotal    = entradasCantidad * precioTarjeta;
        const entradasEfectivo      = tarjetas.filter(t => (t.metodoPago || "efectivo") === "efectivo").reduce((a, t) => a + t.cantidad * precioTarjeta, 0);
        const entradasTransferencia = tarjetas.filter(t => t.metodoPago === "transferencia").reduce((a, t) => a + t.cantidad * precioTarjeta, 0);
        const entradasTarjeta       = tarjetas.filter(t => t.metodoPago === "tarjeta").reduce((a, t) => a + t.cantidad * precioTarjeta, 0);

        // Comandas cobradas (cerradas con total > 0)
        const cobradas = pedidosEv.filter((p: any) => p.estado === "cerrado" && (p.total ?? 0) > 0);
        const sinCobrar = pedidosEv.filter((p: any) => p.estado !== "cerrado" && p.estado !== "cancelado" && (p.total ?? 0) > 0);
        const comandasEfectivo     = cobradas.filter((p: any) => p.metodoPago === "efectivo").reduce((a, p: any) => a + p.total, 0);
        const comandasTransferencia = cobradas.filter((p: any) => p.metodoPago === "transferencia").reduce((a, p: any) => a + p.total, 0);
        const comandasTarjeta      = cobradas.filter((p: any) => p.metodoPago === "tarjeta").reduce((a, p: any) => a + p.total, 0);
        const comandasSinCobrar    = sinCobrar.reduce((a, p: any) => a + p.total, 0);

        // Cobros parciales de comandas de este evento (desde CajaMovements de esta sesión)
        const parcialesEv = (movimientos as any[]).filter((m: any) =>
            m.concepto?.startsWith("Parcial") && pedidoIds.includes(m.pedidoId?.toString())
        );
        const parcialesEfectivo      = parcialesEv.filter(m => m.metodoPago === "efectivo").reduce((a, m) => a + m.monto, 0);
        const parcialesTransferencia  = parcialesEv.filter(m => m.metodoPago === "transferencia").reduce((a, m) => a + m.monto, 0);
        const parcialesTarjeta        = parcialesEv.filter(m => m.metodoPago === "tarjeta").reduce((a, m) => a + m.monto, 0);

        const totalEfectivo      = ventasEfectivo      + comandasEfectivo      + parcialesEfectivo      + entradasEfectivo;
        const totalTransferencia  = ventasTransferencia  + comandasTransferencia  + parcialesTransferencia  + entradasTransferencia;
        const totalTarjeta        = ventasTarjeta        + comandasTarjeta        + parcialesTarjeta        + entradasTarjeta;
        const totalGeneral        = totalEfectivo + totalTransferencia + totalTarjeta + comandasSinCobrar;

        await Evento.findByIdAndUpdate(evId, {
            $set: {
                estado: "cerrado",
                cierreData: {
                    fecha: new Date(),
                    ventasEfectivo,
                    ventasTransferencia,
                    ventasTarjeta,
                    entradasCantidad,
                    entradasPrecio: precioTarjeta,
                    entradasTotal,
                    entradasEfectivo,
                    entradasTransferencia,
                    entradasTarjeta,
                    comandasEfectivo,
                    comandasTransferencia,
                    comandasTarjeta,
                    comandasSinCobrar,
                    totalEfectivo,
                    totalTransferencia,
                    totalTarjeta,
                    totalGeneral,
                },
            },
        });
    }

    // ── PASO 2: Auto-cerrar comandas de evento vacías ──────────────────────────
    await Pedido.updateMany(
        { eventoId: { $exists: true, $ne: null }, estado: { $nin: ["cerrado", "cancelado"] }, total: 0 },
        { $set: { estado: "cerrado" } }
    );

    // ── PASO 3: Cerrar la sesión (DESPUÉS de eventos para que updatedAt < fechaCierre) ──
    sesion.estado = "cerrada";
    sesion.montoCierre = montoCierreNum;
    sesion.cerradaPor = payload.sub;
    sesion.fechaCierre = new Date();
    if (notas) sesion.notas = notas;
    await sesion.save();

    return NextResponse.json({ ok: true, resumen, eventosResumen, sesion, montoInicial, montoCierre: montoCierreNum, efectivoSistema, diferencia, deliveryCount });
    } catch (e) {
        console.error("[POST /api/superadmin/caja/cerrar]", e);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
