import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { Pedido } from "@/models/Pedido";
import { User } from "@/models/User";
import { sendPushToSubscriptions } from "@/lib/push-server";
import { enviarNotificacionFCM, isFCMTokenInvalid } from "@/lib/firebase-admin";
import jwt from "jsonwebtoken";

const SECRET = process.env.NEXTAUTH_SECRET!;

// Categorías que maneja el bar, no la cocina — no bloquean el "todo listo"
const BEBIDAS_CATS = new Set([
    "CERVEZAS", "VINOS", "GASEOSAS", "JARROS", "COCKTAILS", "WHISKY", "MEDIDAS", "BEBIDAS",
]);

function auth(req: NextRequest) {
    const token = req.cookies.get("session")?.value;
    if (!token) return null;
    try {
        const p = jwt.verify(token, SECRET) as any;
        return ["cocina", "superadmin", "admin", "empleado", "cajero"].includes(p.role) ? p : null;
    } catch { return null; }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const actor = auth(req);
    if (!actor) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    await connectMongoDB();

    const { itemId } = await req.json();
    if (!itemId) return NextResponse.json({ error: "itemId requerido" }, { status: 400 });

    const pedido = await Pedido.findById(params.id)
        .populate("items.menuItemId", "nombre categoria")
        .populate("userId", "nombre apellido pushSubscriptions fcmTokens tokenFCM");

    if (!pedido) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    // Marcar el ítem como listo
    const item = (pedido.items as any[]).find((it: any) => String(it._id) === String(itemId));
    if (!item) return NextResponse.json({ error: "Ítem no encontrado" }, { status: 404 });
    item.listo = true;

    // Verificar si todos los ítems de COCINA (no bebidas) están listos
    const itemsCocina = (pedido.items as any[]).filter(
        (it: any) => !BEBIDAS_CATS.has((it.menuItemId?.categoria || "").toUpperCase())
    );
    const todosListos = itemsCocina.length > 0 && itemsCocina.every((it: any) => it.listo);

    if (todosListos) {
        pedido.estado = "listo";
    }

    await pedido.save();

    // Si la comanda quedó lista, notificar al mozo o al cliente
    if (todosListos) {
        const mozo = pedido.userId as any;
        if (pedido.fuente === "empleado" && mozo) {
            const mesaLabel = pedido.mesa ? ` · Mesa ${pedido.mesa}` : "";
            const title = `Comanda lista${mesaLabel}`;
            const body = "Lista para servir. Podés pasar a cobrar cuando terminen.";
            if (mozo.pushSubscriptions?.length) {
                await sendPushToSubscriptions(mozo.pushSubscriptions, {
                    title, body, url: "/empleado/anotador",
                    icon: "/icon-192.png", badge: "/icon-badge-96x96.png",
                });
            }
            const fcmTokens = new Set<string>([...(mozo.fcmTokens ?? []), ...(mozo.tokenFCM ? [mozo.tokenFCM] : [])]);
            for (const t of fcmTokens) {
                try { await enviarNotificacionFCM(t, title, body, "/empleado/anotador"); }
                catch (err) { if (isFCMTokenInvalid(err)) await User.updateOne({ _id: mozo._id }, { $pull: { fcmTokens: t } }); }
            }
        } else if (pedido.fuente === "cliente" && mozo) {
            const tipoEntrega = pedido.tipoEntrega;
            const title = tipoEntrega !== "envio"
                ? "¡Tu pedido está listo para retirar!"
                : "¡Tu pedido está en camino!";
            const body = tipoEntrega !== "envio"
                ? "Ya podés pasar por el bar a buscarlo 📦"
                : "Nuestro repartidor ya está por salir 🛵";
            if (mozo.pushSubscriptions?.length) {
                await sendPushToSubscriptions(mozo.pushSubscriptions, {
                    title, body, url: "/cliente/mis-pedidos",
                    icon: "/icon-192.png", badge: "/icon-badge-96x96.png",
                });
            }
            const fcmTokens = new Set<string>([...(mozo.fcmTokens ?? []), ...(mozo.tokenFCM ? [mozo.tokenFCM] : [])]);
            for (const t of fcmTokens) {
                try { await enviarNotificacionFCM(t, title, body, "/cliente/mis-pedidos"); }
                catch (err) { if (isFCMTokenInvalid(err)) await User.updateOne({ _id: mozo._id }, { $pull: { fcmTokens: t } }); }
            }
        }
    }

    return NextResponse.json({ ok: true, todosListos, pedido });
}
