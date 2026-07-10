import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { Pedido } from "@/models/Pedido";
import { MenuItem } from "@/models/MenuItem";
import { User } from "@/models/User";
import { Counter } from "@/models/Counter";
import jwt from "jsonwebtoken";
import { sendPushToSubscriptions } from "@/lib/push-server";
import { enviarNotificacionFCM, isFCMTokenInvalid } from "@/lib/firebase-admin";
import { hoyArgentina } from "@/lib/argentina-time";

const SECRET = process.env.NEXTAUTH_SECRET!;

const ROLES_EDITAN_PEDIDO = ["empleado", "cajero", "admin", "superadmin"];

async function recalcularTotal(items: { menuItemId: any; cantidad: number }[]) {
    const menuItems = await MenuItem.find({ _id: { $in: items.map(i => i.menuItemId) } });
    return items.reduce((acc, i) => {
        const item = menuItems.find((m: any) => m._id.toString() === i.menuItemId.toString());
        return acc + (item?.precio || 0) * i.cantidad;
    }, 0);
}

// PATCH — agrega, edita o elimina ítems de una comanda existente (mozo/cajero)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
    const token = req.cookies.get("session")?.value;
    if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    let payload: any;
    try { payload = jwt.verify(token, SECRET) as any; } catch {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (!ROLES_EDITAN_PEDIDO.includes(payload.role)) {
        return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    await connectMongoDB();

    const pedido = await Pedido.findById(params.id);
    if (!pedido) return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
    if (["cerrado", "cancelado"].includes(pedido.estado)) {
        return NextResponse.json({ error: "El pedido ya está cerrado" }, { status: 400 });
    }

    const body = await req.json();

    // ── Notificar al cliente si el pedido es de la app ─────────────────────
    async function notificarClienteModificacion(titulo: string, mensaje: string) {
        if (pedido.fuente !== "cliente") return;
        const cliente = await User.findById(pedido.userId);
        if (!cliente) return;
        if (cliente.pushSubscriptions?.length) {
            await sendPushToSubscriptions(cliente.pushSubscriptions, {
                title: titulo, body: mensaje,
                url: "/cliente/mis-pedidos",
                icon: "/icon-192.png", badge: "/icon-badge-96x96.png",
            });
        }
        const fcmTokens = new Set<string>([...(cliente.fcmTokens ?? []), ...(cliente.tokenFCM ? [cliente.tokenFCM] : [])]);
        for (const token of fcmTokens) {
            try { await enviarNotificacionFCM(token, titulo, mensaje, "/cliente/mis-pedidos"); }
            catch (err) { if (isFCMTokenInvalid(err)) await User.updateOne({ _id: cliente._id }, { $pull: { fcmTokens: token } }); }
        }
    }

    // ── Eliminar un ítem de la comanda ──────────────────────────────────────
    if (body.accion === "eliminarItem") {
        const { itemId, nombreItem } = body;
        const items = (pedido.items as any[]).filter(i => i._id.toString() !== itemId);
        pedido.items = items;
        pedido.total = await recalcularTotal(items);
        await pedido.save();
        const msg = nombreItem ? `Se eliminó "${nombreItem}" de tu pedido.` : "Se eliminó un producto de tu pedido.";
        await notificarClienteModificacion("Tu pedido fue modificado", msg);
        return NextResponse.json({ ok: true, pedido });
    }

    // ── Reemplazar el producto de un ítem (mismo lugar, otro producto) ─────
    if (body.accion === "reemplazarItem") {
        const { itemId, nuevoMenuItemId, nombreActual, nuevoNombre } = body;
        const item = (pedido.items as any[]).find(i => i._id.toString() === itemId);
        if (!item) return NextResponse.json({ error: "Ítem no encontrado" }, { status: 404 });
        item.menuItemId = nuevoMenuItemId;
        pedido.total = await recalcularTotal(pedido.items as any[]);
        await pedido.save();
        const msg = (nombreActual && nuevoNombre)
            ? `"${nombreActual}" fue reemplazado por "${nuevoNombre}" en tu pedido.`
            : "Un producto de tu pedido fue reemplazado.";
        await notificarClienteModificacion("Tu pedido fue modificado", msg);
        return NextResponse.json({ ok: true, pedido });
    }

    // ── Transferir mesa ────────────────────────────────────────────────────
    if (body.accion === "cambiarMesa") {
        const { mesa: nuevaMesa } = body;
        if (!nuevaMesa) return NextResponse.json({ error: "Mesa requerida" }, { status: 400 });
        pedido.mesa = nuevaMesa;
        await pedido.save();
        return NextResponse.json({ ok: true, pedido });
    }

    // ── Marcar ítems como ya impresos en BARRA/COCINA ───────────────────────
    if (body.accion === "marcarImpreso") {
        const { itemIds } = body;
        const idSet = new Set<string>(itemIds || []);
        for (const it of pedido.items as any[]) {
            if (idSet.has(it._id.toString())) it.impreso = true;
        }
        await pedido.save();
        return NextResponse.json({ ok: true, pedido });
    }

    // ── Actualizar comensales (count + opcional agregar/quitar userId) ────────
    if (body.accion === "actualizarComensales") {
        const { comensales, agregarUserId, quitarUserId } = body;
        if (typeof comensales === "number") pedido.comensales = Math.max(0, comensales);
        if (agregarUserId) {
            const ids = ((pedido as any).comensalesIds || []).map((id: any) => id.toString());
            if (!ids.includes(agregarUserId)) (pedido as any).comensalesIds = [...ids, agregarUserId];
        }
        if (quitarUserId) {
            (pedido as any).comensalesIds = ((pedido as any).comensalesIds || []).filter((id: any) => id.toString() !== quitarUserId);
        }
        await pedido.save();
        return NextResponse.json({ ok: true, pedido });
    }

    // ── Editar nota de un ítem ─────────────────────────────────────────────
    if (body.accion === "editarNotaItem") {
        const { itemId, nota } = body;
        const item = (pedido.items as any[]).find(i => i._id.toString() === itemId);
        if (!item) return NextResponse.json({ error: "Ítem no encontrado" }, { status: 404 });
        item.nota = nota?.trim() || undefined;
        await pedido.save();
        return NextResponse.json({ ok: true, pedido });
    }

    // ── Convertir retiro a envío a domicilio ───────────────────────────────
    if (body.accion === "cambiarEntrega") {
        if (!["cajero", "admin", "superadmin"].includes(payload.role)) {
            return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
        }
        const { direccion, telefonoContacto, costoEnvio } = body;
        if (!direccion?.trim()) return NextResponse.json({ error: "Dirección requerida" }, { status: 400 });

        const costo = Number(costoEnvio) || 0;
        const keyDel = `delivery-${hoyArgentina()}`;
        const cnt = await Counter.findOneAndUpdate({ _id: keyDel }, { $inc: { seq: 1 } }, { upsert: true, new: true });

        (pedido as any).tipoEntrega = "envio";
        (pedido as any).direccion = direccion.trim();
        if (telefonoContacto?.trim()) (pedido as any).telefonoContacto = telefonoContacto.trim();
        (pedido as any).costoEnvio = costo;
        pedido.total = pedido.total + costo;
        (pedido as any).deliveryNumero = cnt.seq;
        await pedido.save();

        await notificarClienteModificacion("Tu pedido se actualizó", "Tu pedido ahora será enviado a tu domicilio 🛵");

        if (["preparando", "listo"].includes(pedido.estado)) {
            const deliveryUsers = await User.find({ role: "delivery" });
            const notifTitle = pedido.estado === "listo" ? "¡Pedido listo para llevar! 🛵" : "¡Nuevo envío en preparación! 👨🏻‍🍳";
            const notifBody = `Nuevo envío a: ${direccion.trim()}`;
            for (const du of deliveryUsers) {
                if (du.pushSubscriptions?.length) {
                    await sendPushToSubscriptions(du.pushSubscriptions, {
                        title: notifTitle, body: notifBody, url: "/delivery",
                        icon: "/icon-192.png", badge: "/icon-badge-96x96.png",
                    });
                }
                const fcmTokens = new Set<string>([...(du.fcmTokens ?? []), ...(du.tokenFCM ? [du.tokenFCM] : [])]);
                for (const t of fcmTokens) {
                    try { await enviarNotificacionFCM(t, notifTitle, notifBody, "/delivery"); }
                    catch (err) { if (isFCMTokenInvalid(err)) await User.updateOne({ _id: du._id }, { $pull: { fcmTokens: t } }); }
                }
            }
        }

        return NextResponse.json({ ok: true, pedido });
    }

    // ── Cambiar dirección de entrega ───────────────────────────────────────
    if (body.accion === "cambiarDireccion") {
        const { direccion } = body;
        if (!direccion?.trim()) return NextResponse.json({ error: "Dirección requerida" }, { status: 400 });
        (pedido as any).direccion = direccion.trim();
        await pedido.save();
        return NextResponse.json({ ok: true, pedido });
    }

    // ── Agregar ítems nuevos a la comanda (default) ─────────────────────────
    const { items, notaEmpleado } = body;
    if (!items?.length) return NextResponse.json({ error: "Sin ítems" }, { status: 400 });

    const BEBIDAS_CATS_SERVER = new Set(["CERVEZAS", "VINOS", "GASEOSAS", "JARROS", "COCKTAILS", "WHISKY", "MEDIDAS"]);

    // Push directo al DocumentArray de Mongoose para garantizar impreso: false en MongoDB
    for (const newItem of items) {
        (pedido.items as any[]).push({ menuItemId: newItem.menuItemId, cantidad: newItem.cantidad, nota: newItem.nota || undefined, impreso: false });
    }

    pedido.total = await recalcularTotal(pedido.items as any[]);
    if (notaEmpleado) pedido.notaEmpleado = notaEmpleado;

    // Si estaba en "listo" y se agregaron ítems de comida → volver a preparando
    if (pedido.estado === "listo") {
        const newMenuItemIds = items.map((i: any) => i.menuItemId);
        const newMenuItems = await MenuItem.find({ _id: { $in: newMenuItemIds } }, "categoria").lean<any[]>();
        const tieneComida = newMenuItems.some((m: any) => !BEBIDAS_CATS_SERVER.has((m.categoria || "").toUpperCase()));
        if (tieneComida) pedido.estado = "preparando";
    }

    await pedido.save();

    return NextResponse.json({ ok: true, pedido, estadoCambiado: pedido.estado });
}

// GET — obtiene un pedido por ID (empleado/admin/superadmin)
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    const token = req.cookies.get("session")?.value;
    if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    let payload: any;
    try { payload = jwt.verify(token, SECRET) as any; } catch {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    await connectMongoDB();

    const pedido = await Pedido.findById(params.id)
        .populate("items.menuItemId", "nombre precio categoria")
        .lean();

    if (!pedido) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    return NextResponse.json(pedido);
}
