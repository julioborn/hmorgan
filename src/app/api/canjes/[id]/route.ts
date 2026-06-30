import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { Canje } from "@/models/Canje";
import { User } from "@/models/User";
import { sendPushAndCollectInvalid } from "@/lib/push-server";
import { enviarNotificacionFCM, isFCMTokenInvalid } from "@/lib/firebase-admin";
import jwt from "jsonwebtoken";

export const dynamic = "force-dynamic";

const SECRET = process.env.NEXTAUTH_SECRET!;

export async function PATCH(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const token = req.cookies.get("session")?.value;
    if (!token) return NextResponse.json({ message: "No autorizado" }, { status: 401 });

    let payload: any;
    try { payload = jwt.verify(token, SECRET) as any; } catch {
        return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }
    if (!["cajero", "admin", "superadmin"].includes(payload.role))
        return NextResponse.json({ message: "Sin permiso" }, { status: 403 });

    const { accion } = await req.json();
    if (!["aceptar", "rechazar"].includes(accion))
        return NextResponse.json({ message: "Acción inválida" }, { status: 400 });

    await connectMongoDB();

    const canje = await Canje.findById(params.id).populate("rewardId", "titulo puntos");
    if (!canje) return NextResponse.json({ message: "Canje no encontrado" }, { status: 404 });
    if (canje.estado !== "pendiente") return NextResponse.json({ message: "El canje ya fue procesado" }, { status: 400 });

    if (accion === "rechazar") {
        canje.estado = "rechazado";
        await canje.save();

        // Notificar al cliente del rechazo
        const cliente = await User.findById(canje.userId);
        if (cliente) {
            const reward = canje.rewardId as any;
            const msg = `Tu solicitud de canje "${reward?.titulo ?? "premio"}" fue rechazada.`;
            if (Array.isArray(cliente.pushSubscriptions) && cliente.pushSubscriptions.length) {
                const invalid = await sendPushAndCollectInvalid(cliente.pushSubscriptions, {
                    title: "Canje rechazado",
                    body: msg,
                    url: "/cliente/canjes",
                });
                if (invalid.length) await User.updateOne({ _id: cliente._id }, { $pull: { pushSubscriptions: { endpoint: { $in: invalid } } } });
            }
            const fcmTokens = new Set<string>([...(cliente.fcmTokens ?? []), ...(cliente.tokenFCM ? [cliente.tokenFCM] : [])]);
            for (const fcmToken of fcmTokens) {
                try { await enviarNotificacionFCM(fcmToken, "Canje rechazado", msg, "/cliente/canjes"); }
                catch (err) { if (isFCMTokenInvalid(err)) await User.updateOne({ _id: cliente._id }, { $pull: { fcmTokens: fcmToken } }); }
            }
        }
        return NextResponse.json({ ok: true, estado: "rechazado" });
    }

    // accion === "aceptar"
    const cliente = await User.findById(canje.userId);
    if (!cliente) return NextResponse.json({ message: "Cliente no encontrado" }, { status: 404 });

    if ((cliente.puntos ?? 0) < canje.puntosGastados)
        return NextResponse.json({ message: "El cliente ya no tiene puntos suficientes" }, { status: 400 });

    cliente.puntos = (cliente.puntos ?? 0) - canje.puntosGastados;
    await cliente.save();

    canje.estado = "completado";
    await canje.save();

    // Notificar al cliente de la aceptación
    const reward = canje.rewardId as any;
    const titulo = reward?.titulo ?? "premio";
    const pushMsg = `¡Tu canje de "${titulo}" fue aceptado! Mostrá la pantalla para recibirlo.`;

    if (Array.isArray(cliente.pushSubscriptions) && cliente.pushSubscriptions.length) {
        const invalid = await sendPushAndCollectInvalid(cliente.pushSubscriptions, {
            title: "¡Canje aceptado! 🎁",
            body: pushMsg,
            url: "/cliente/canjes",
        });
        if (invalid.length) await User.updateOne({ _id: cliente._id }, { $pull: { pushSubscriptions: { endpoint: { $in: invalid } } } });
    }
    const fcmTokens = new Set<string>([...(cliente.fcmTokens ?? []), ...(cliente.tokenFCM ? [cliente.tokenFCM] : [])]);
    for (const fcmToken of fcmTokens) {
        try { await enviarNotificacionFCM(fcmToken, "¡Canje aceptado! 🎁", pushMsg, "/cliente/canjes"); }
        catch (err) { if (isFCMTokenInvalid(err)) await User.updateOne({ _id: cliente._id }, { $pull: { fcmTokens: fcmToken } }); }
    }

    return NextResponse.json({ ok: true, estado: "completado" });
}
