import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { CajaSession } from "@/models/CajaSession";
import { CajaMovement } from "@/models/CajaMovement";
import { Pedido } from "@/models/Pedido";
import { Evento } from "@/models/Evento";
import jwt from "jsonwebtoken";

const SECRET = process.env.NEXTAUTH_SECRET!;

export async function POST(req: NextRequest) {
    const token = req.cookies.get("session")?.value;
    if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    let payload: any;
    try { payload = jwt.verify(token, SECRET) as any; } catch {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    if (!["superadmin", "admin"].includes(payload.role))
        return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    await connectMongoDB();

    const { montoInicial, montoCierre, fechaDesde, fechaHasta } = await req.json();

    if (!fechaDesde || !fechaHasta)
        return NextResponse.json({ error: "fechaDesde y fechaHasta son requeridos" }, { status: 400 });

    const sesionAbierta = await CajaSession.findOne({ estado: "abierta" });
    if (sesionAbierta)
        return NextResponse.json({ error: "Hay una sesión abierta actualmente. Cerrala antes de reconstruir." }, { status: 400 });

    const desde = new Date(fechaDesde);
    const hasta = new Date(fechaHasta);

    // Pedidos cobrados en el rango
    const pedidos = await Pedido.find({
        estado: "cerrado",
        updatedAt: { $gte: desde, $lt: hasta },
    }).populate("userId", "nombre apellido").lean() as any[];

    if (pedidos.length === 0)
        return NextResponse.json({ error: "No se encontraron pedidos en ese rango de fechas" }, { status: 400 });

    // Fecha de cierre = updatedAt del último pedido cobrado
    const fechaCierre = new Date(Math.max(...pedidos.map((p: any) => new Date(p.updatedAt).getTime())));

    // Crear la sesión reconstruida
    const sesion = await CajaSession.create({
        estado: "cerrada",
        montoInicial: Number(montoInicial) || 0,
        montoCierre: Number(montoCierre) || 0,
        abiertaPor: payload.sub,
        cerradaPor: payload.sub,
        fechaApertura: desde,
        fechaCierre,
        notas: "Sesión reconstruida manualmente",
    });

    const movimientos: any[] = [];

    // Movimiento por cada pedido cobrado
    for (const p of pedidos) {
        const esEmpleado = p.fuente === "empleado";
        const loc = p.mesa ? `Mesa ${p.mesa}` : (p.nombreComanda || "Sin mesa");
        const user = p.userId as any;
        const nombreUser = user?.nombre ? `${user.nombre} ${user.apellido || ""}`.trim() : null;
        const concepto = esEmpleado
            ? `Cobro · ${loc}${nombreUser ? ` · Mozo: ${nombreUser}` : ""}`
            : `Cobro · App${nombreUser ? ` · ${nombreUser}` : ""}`;

        movimientos.push({
            sesionId: sesion._id,
            tipo: "ingreso",
            concepto,
            monto: p.total || 0,
            metodoPago: p.metodoPago || "efectivo",
            pedidoId: p._id,
            userId: payload.sub,
        });
    }

    // Ventas directas de eventos cerrados en el rango
    const eventos = await Evento.find({
        estado: "cerrado",
        updatedAt: { $gte: desde, $lt: hasta },
    }).lean() as any[];

    for (const ev of eventos) {
        for (const venta of (ev.ventas || [])) {
            const hasPagos = Array.isArray(venta.pagos) && venta.pagos.filter((pg: any) => pg.monto > 0).length > 0;
            if (hasPagos) {
                for (const pago of venta.pagos.filter((pg: any) => pg.monto > 0)) {
                    movimientos.push({
                        sesionId: sesion._id,
                        tipo: "ingreso",
                        concepto: `Venta directa evento: ${ev.nombre}`,
                        monto: pago.monto,
                        metodoPago: pago.metodoPago,
                        userId: payload.sub,
                    });
                }
            } else {
                movimientos.push({
                    sesionId: sesion._id,
                    tipo: "ingreso",
                    concepto: `Venta directa evento: ${ev.nombre}`,
                    monto: venta.total,
                    metodoPago: venta.metodoPago || "efectivo",
                    userId: payload.sub,
                });
            }
        }
    }

    await CajaMovement.insertMany(movimientos);

    const totalReconstruido = movimientos.reduce((s, m) => s + m.monto, 0);

    return NextResponse.json({
        ok: true,
        sesionId: sesion._id,
        pedidosReconstruidos: pedidos.length,
        eventosReconstruidos: eventos.length,
        movimientosCreados: movimientos.length,
        totalReconstruido,
    });
}
