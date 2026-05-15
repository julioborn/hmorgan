import { NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { Pedido } from "@/models/Pedido";
import { User } from "@/models/User";
import Mensaje from "@/models/Mensaje";
import { sendPushToSubscriptions } from "@/lib/push-server";
import { enviarNotificacionFCM, isFCMTokenInvalid } from "@/lib/firebase-admin";

const TRES_DIAS_MS = 3 * 24 * 60 * 60 * 1000;

export async function PUT(req: Request, { params }: { params: { id: string } }) {
    await connectMongoDB();
    const pedido = await Pedido.findById(params.id);

    if (!pedido) {
        return NextResponse.json({ message: "Pedido no encontrado" }, { status: 404 });
    }

    if (pedido.estado !== "pendiente") {
        return NextResponse.json({ message: "Ya no se puede cancelar este pedido" }, { status: 400 });
    }

    if (pedido.cancelableUntil && new Date() > new Date(pedido.cancelableUntil)) {
        return NextResponse.json({ message: "El tiempo de cancelación expiró" }, { status: 400 });
    }

    pedido.estado = "cancelado";
    await pedido.save();

    await Mensaje.updateMany(
        { pedidoId: params.id, deleteAt: null },
        { deleteAt: new Date(Date.now() + TRES_DIAS_MS) }
    );

    // 🔔 Notificación push opcional al admin
    const admin = await User.findOne({ role: "admin" });
    if (admin?.pushSubscriptions?.length) {
        await sendPushToSubscriptions(admin.pushSubscriptions, {
            title: "Pedido cancelado ❌",
            body: `El cliente canceló el pedido #${pedido._id.toString().slice(-4)}`,
            url: "/admin/pedidos",
            icon: "/icon-192.png",
        });
    }

    // 🔥 FCM — todos los tokens del admin
    if (admin) {
        const fcmTokens = new Set<string>(admin.fcmTokens ?? []);
        if (admin.tokenFCM) fcmTokens.add(admin.tokenFCM);
        for (const token of fcmTokens) {
            try {
                await enviarNotificacionFCM(token, "Pedido cancelado ❌", `El cliente canceló el pedido #${pedido._id.toString().slice(-4)}`, "/admin/pedidos");
            } catch (err) {
                if (isFCMTokenInvalid(err)) await User.updateOne({ _id: admin._id }, { $pull: { fcmTokens: token } });
            }
        }
    }

    return NextResponse.json({ ok: true, message: "Pedido cancelado correctamente" });
}
