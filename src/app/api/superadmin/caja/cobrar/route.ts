import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { Pedido } from "@/models/Pedido";
import { CajaSession } from "@/models/CajaSession";
import { CajaMovement } from "@/models/CajaMovement";
import { User } from "@/models/User";
import { PointTransaction } from "@/models/PointTransaction";
import { Evento } from "@/models/Evento";
import { getPointsRatio } from "@/lib/getPointsRatio";
import { sendPushAndCollectInvalid } from "@/lib/push-server";
import { enviarNotificacionFCM, isFCMTokenInvalid } from "@/lib/firebase-admin";
import jwt from "jsonwebtoken";

const SECRET = process.env.NEXTAUTH_SECRET!;

export async function POST(req: NextRequest) {
    const token = req.cookies.get("session")?.value;
    if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    let payload: any;
    try { payload = jwt.verify(token, SECRET) as any; } catch {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    if (!["superadmin", "admin", "cajero"].includes(payload.role)) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    try {
    await connectMongoDB();

    const { pedidoId, metodoPago, montoPagado, descuento, pagos, notas } = await req.json();
    if (!pedidoId || !metodoPago) return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });

    const pedido = await Pedido.findById(pedidoId)
        .populate("items.menuItemId", "nombre precio categoria");
    if (!pedido) return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
    if (pedido.estado === "cerrado") return NextResponse.json({ error: "Ya cerrado" }, { status: 400 });

    const descuentoNum = Math.max(0, Number(descuento) || 0);
    const totalConDescuento = Math.max(0, (pedido.total || 0) - descuentoNum);

    // Cerrar el pedido
    pedido.estado = "cerrado";
    pedido.metodoPago = metodoPago;
    pedido.montoPagado = Number(montoPagado) || totalConDescuento || 0;
    await pedido.save();

    // Si el pedido pertenece a un evento, registrarlo también en Evento.ventas
    const eventoId = (pedido as any).eventoId;
    if (eventoId) {
        const evento = await Evento.findById(eventoId);
        if (evento) {
            const ventaItems = (pedido.items as any[]).map(it => ({
                menuItemId: it.menuItemId?._id ?? it.menuItemId,
                nombre:    it.menuItemId?.nombre    ?? "Ítem",
                precio:    it.menuItemId?.precio    ?? 0,
                categoria: it.menuItemId?.categoria ?? "",
                cantidad:  it.cantidad,
            }));
            evento.ventas.push({
                items: ventaItems,
                total: pedido.total ?? 0,
                metodoPago,
                nota: (pedido as any).notaEmpleado || undefined,
                comensalesIds: (pedido as any).comensalesIds ?? [],
            });
            await evento.save();
        }
    }

    // Registrar ingreso(s) en caja — un movimiento por método de pago
    const sesion = await CajaSession.findOne({ estado: "abierta" });
    if (sesion) {
        const concepto = `Cobro Mesa ${pedido.mesa || "—"} (Pedido #${pedido._id.toString().slice(-6)})`;
        const pagosArr: { metodo: string; monto: number }[] = Array.isArray(pagos) && pagos.length > 0
            ? pagos
            : [{ metodo: metodoPago, monto: totalConDescuento }];
        const totalPagadoArr = pagosArr.reduce((a: number, p: any) => a + (Number(p.monto) || 0), 0);
        const hayEfectivoArr = pagosArr.some((p: any) => p.metodo === "efectivo");
        const vueltoArr = hayEfectivoArr && totalPagadoArr > totalConDescuento ? totalPagadoArr - totalConDescuento : 0;
        const excedenteTotal = !hayEfectivoArr && totalPagadoArr > totalConDescuento
            ? totalPagadoArr - totalConDescuento
            : 0;
        let descuentoGuardado = false;
        for (const pago of pagosArr) {
            const montoNet = pago.metodo === "efectivo"
                ? Math.max(0, (Number(pago.monto) || 0) - vueltoArr)
                : (Number(pago.monto) || 0);
            if (montoNet <= 0) continue;
            const excedentePago = excedenteTotal > 0 && pagosArr.length === 1 ? excedenteTotal : 0;
            await CajaMovement.create({
                sesionId: sesion._id,
                tipo: "ingreso",
                concepto,
                monto: montoNet,
                excedente: excedentePago,
                descuento: !descuentoGuardado ? descuentoNum : 0,
                metodoPago: pago.metodo,
                pedidoId: pedido._id,
                userId: payload.sub,
            });
            descuentoGuardado = true;
        }
    }

    // Acreditar puntos (una sola vez, sobre el total con descuento)
    if (!pedido.puntosAcreditados && totalConDescuento > 0) {
        const ratio = await getPointsRatio();
        const puntos = Math.floor(totalConDescuento * ratio);
        const comensalesIds: string[] = (pedido as any).comensalesIds ?? [];
        const mozoId = pedido.fuente === "empleado" ? String((pedido as any).userId || "") : undefined;

        if (comensalesIds.length > 0 && puntos > 0) {
            // Acreditar y notificar a cada comensal identificado
            for (const uid of comensalesIds) {
                const cliente = await User.findById(uid);
                if (cliente && cliente.role === "cliente") {
                    await PointTransaction.create({
                        userId: cliente._id, source: "consumo", amount: puntos,
                        notes: `Cobrado en caja (comensal)`,
                        meta: { pedidoId: pedido._id, consumoARS: pedido.total, ...(mozoId ? { mozoId } : {}) }, pendingReview: true,
                    });
                    cliente.puntos = (cliente.puntos || 0) + puntos;
                    cliente.needsReview = true;
                    await cliente.save();
                    // Notificación push al comensal
                    if (Array.isArray(cliente.pushSubscriptions) && cliente.pushSubscriptions.length) {
                        const invalid = await sendPushAndCollectInvalid(cliente.pushSubscriptions, {
                            title: "¡Puntos sumados!",
                            body: `Se acreditaron ${puntos} puntos por tu consumo en H. Morgan 🎉`,
                            url: "/cliente/qr",
                        });
                        if (invalid.length) await User.updateOne({ _id: cliente._id }, { $pull: { pushSubscriptions: { endpoint: { $in: invalid } } } });
                    }
                    const fcmTokens = new Set<string>([...(cliente.fcmTokens ?? []), ...(cliente.tokenFCM ? [cliente.tokenFCM] : [])]);
                    for (const fcmToken of fcmTokens) {
                        try {
                            await enviarNotificacionFCM(fcmToken, "¡Puntos sumados!", `Se acreditaron ${puntos} puntos por tu consumo en H. Morgan 🎉`, "/cliente/qr");
                        } catch (err) {
                            if (isFCMTokenInvalid(err)) await User.updateOne({ _id: cliente._id }, { $pull: { fcmTokens: fcmToken } });
                        }
                    }
                }
            }
            await Pedido.findByIdAndUpdate(pedidoId, { puntosAcreditados: true });
        } else {
            // Fallback: clienteId único o pedido de la app
            const clienteRef = (pedido as any).clienteId
                ? (pedido as any).clienteId
                : pedido.fuente === "cliente" ? pedido.userId : null;
            if (clienteRef && puntos > 0) {
                const clienteDoc = await User.findById(clienteRef);
                if (clienteDoc && clienteDoc.role === "cliente") {
                    await PointTransaction.create({
                        userId: clienteDoc._id, source: "consumo", amount: puntos,
                        notes: `Cobrado en caja${pedido.fuente === "empleado" ? " (comanda)" : " (pedido app)"}`,
                        meta: { pedidoId: pedido._id, consumoARS: pedido.total, ...(mozoId ? { mozoId } : {}) }, pendingReview: true,
                    });
                    clienteDoc.puntos = (clienteDoc.puntos || 0) + puntos;
                    clienteDoc.needsReview = true;
                    await clienteDoc.save();
                    await Pedido.findByIdAndUpdate(pedidoId, { puntosAcreditados: true });
                    // Notificación push al cliente
                    if (Array.isArray(clienteDoc.pushSubscriptions) && clienteDoc.pushSubscriptions.length) {
                        const invalid = await sendPushAndCollectInvalid(clienteDoc.pushSubscriptions, {
                            title: "¡Puntos sumados!",
                            body: `Se acreditaron ${puntos} puntos por tu consumo en H. Morgan 🎉`,
                            url: "/cliente/qr",
                        });
                        if (invalid.length) await User.updateOne({ _id: clienteDoc._id }, { $pull: { pushSubscriptions: { endpoint: { $in: invalid } } } });
                    }
                    const fcmTokens = new Set<string>([...(clienteDoc.fcmTokens ?? []), ...(clienteDoc.tokenFCM ? [clienteDoc.tokenFCM] : [])]);
                    for (const fcmToken of fcmTokens) {
                        try {
                            await enviarNotificacionFCM(fcmToken, "¡Puntos sumados!", `Se acreditaron ${puntos} puntos por tu consumo en H. Morgan 🎉`, "/cliente/qr");
                        } catch (err) {
                            if (isFCMTokenInvalid(err)) await User.updateOne({ _id: clienteDoc._id }, { $pull: { fcmTokens: fcmToken } });
                        }
                    }
                }
            }
        }
    }

    return NextResponse.json({ ok: true, pedido });
    } catch (e) {
        console.error("[POST /api/superadmin/caja/cobrar]", e);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
