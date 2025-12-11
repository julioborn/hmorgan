import { NextRequest, NextResponse } from "next/server";
import Mensaje from "@/models/Mensaje";
import { connectMongoDB } from "@/lib/mongodb";
import { pusherServer } from "@/lib/pusherServer";
import { Pedido } from "@/models/Pedido";
import { User } from "@/models/User";
import { sendPushToSubscriptions } from "@/lib/push-server";
import { enviarNotificacionFCM } from "@/lib/firebase-admin";

interface Params {
    pedidoId: string;
}

export async function GET(req: NextRequest, { params }: { params: Params }) {
    await connectMongoDB();
    const mensajes = await Mensaje.find({ pedidoId: params.pedidoId }).sort({ createdAt: 1 });
    return NextResponse.json(mensajes);
}

export async function POST(req: NextRequest, { params }: { params: { pedidoId: string } }) {
    await connectMongoDB();

    const { remitente, texto } = await req.json();
    if (!texto)
        return NextResponse.json({ message: "Mensaje vacío" }, { status: 400 });

    const nuevo = await Mensaje.create({
        pedidoId: params.pedidoId,
        remitente,
        texto,
    });

    // 🔔 Tiempo real con Pusher (chat en vivo)
    await pusherServer.trigger(`pedido-${params.pedidoId}`, "mensaje-creado", nuevo);

    // 📦 Obtener pedido y usuarios
    const pedido = await Pedido.findById(params.pedidoId)
        .populate("userId", "nombre pushSubscriptions tokenFCM");
    if (!pedido) return NextResponse.json({ message: "Pedido no encontrado" }, { status: 404 });

    const admin = await User.findOne({ role: "admin" }).select("pushSubscriptions tokenFCM nombre");

    // 👤 Determinar destinatario
    const destinatario = remitente === "admin" ? pedido.userId : admin;
    console.log("📩 Destinatario:", destinatario?._id?.toString());
    console.log("📩 Destinatario tokenFCM:", destinatario?.tokenFCM);

    // 📲 Enviar push notification (aunque la app esté cerrada)
    if (destinatario?.pushSubscriptions?.length) {
        try {
            await sendPushToSubscriptions(destinatario.pushSubscriptions, {
                title: remitente === "admin" ? "Nuevo mensaje del bar 🍻" : "Nuevo mensaje del cliente 💬",
                body: texto.length > 80 ? texto.slice(0, 80) + "..." : texto,
                url: remitente === "admin"
                    ? `/cliente/mis-pedidos/${params.pedidoId}/chat`
                    : `/admin/pedidos/${params.pedidoId}/chat`,
                icon: "/icon-192.png",
                badge: "/icon-badge-96x96.png",
                image: "/morganwhite.png",
            });
        } catch (err) {
            console.error("❌ Error enviando WebPush:", err);
        }
    }

    // 🔥 Notificación FCM si el destinatario tiene tokenFCM
    if (destinatario?.tokenFCM) {
        console.log("📩 Enviando notificación FCM a token:", destinatario.tokenFCM); // 👈 AGREGA ESTO

        await enviarNotificacionFCM(
            destinatario.tokenFCM,
            remitente === "admin" ? "Nuevo mensaje del bar 🍻" : "Nuevo mensaje del cliente 💬",
            texto.length > 80 ? texto.slice(0, 80) + "..." : texto,
            remitente === "admin"
                ? `/cliente/mis-pedidos/${params.pedidoId}/chat`
                : `/admin/pedidos/${params.pedidoId}/chat`
        );
    }

    return NextResponse.json(nuevo);
}
