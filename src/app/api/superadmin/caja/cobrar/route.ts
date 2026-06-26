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

    await connectMongoDB();

    const { pedidoId, metodoPago, montoPagado, notas } = await req.json();
    if (!pedidoId || !metodoPago) return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });

    const pedido = await Pedido.findById(pedidoId)
        .populate("items.menuItemId", "nombre precio categoria");
    if (!pedido) return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
    if (pedido.estado === "cerrado") return NextResponse.json({ error: "Ya cerrado" }, { status: 400 });

    // Cerrar el pedido
    pedido.estado = "cerrado";
    pedido.metodoPago = metodoPago;
    pedido.montoPagado = Number(montoPagado) || pedido.total || 0;
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

    // Registrar ingreso en caja si hay sesión abierta
    const sesion = await CajaSession.findOne({ estado: "abierta" });
    if (sesion) {
        await CajaMovement.create({
            sesionId: sesion._id,
            tipo: "ingreso",
            concepto: `Cobro Mesa ${pedido.mesa || "—"} (Pedido #${pedido._id.toString().slice(-6)})`,
            monto: pedido.total || 0,
            metodoPago,
            pedidoId: pedido._id,
            userId: payload.sub,
        });
    }

    // Acreditar puntos (una sola vez)
    if (!pedido.puntosAcreditados && pedido.total > 0) {
        const ratio = await getPointsRatio();
        const puntos = Math.floor(pedido.total * ratio);
        const comensalesIds: string[] = (pedido as any).comensalesIds ?? [];

        if (comensalesIds.length > 0 && puntos > 0) {
            // Acreditar y notificar a cada comensal identificado
            for (const uid of comensalesIds) {
                const cliente = await User.findById(uid);
                if (cliente && cliente.role === "cliente") {
                    await PointTransaction.create({
                        userId: cliente._id, source: "consumo", amount: puntos,
                        notes: `Cobrado en caja (comensal)`,
                        meta: { pedidoId: pedido._id, consumoARS: pedido.total }, pendingReview: true,
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
                        meta: { pedidoId: pedido._id, consumoARS: pedido.total }, pendingReview: true,
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
}
