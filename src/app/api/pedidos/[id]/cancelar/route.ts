import { NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { Pedido } from "@/models/Pedido";
import { User } from "@/models/User";
import { sendPushToSubscriptions } from "@/lib/push-server";
import { enviarNotificacionFCM } from "@/lib/firebase-admin";

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

    // 🔥 Notificación FCM al admin
    if (admin?.tokenFCM) {
        await enviarNotificacionFCM(
            admin.tokenFCM,
            "Pedido cancelado ❌",
            `El cliente canceló el pedido #${pedido._id.toString().slice(-4)}`,
            "/admin/pedidos"
        );
    }

    return NextResponse.json({ ok: true, message: "Pedido cancelado correctamente" });
}
