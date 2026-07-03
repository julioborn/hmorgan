import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { Pedido } from "@/models/Pedido";
import { MenuItem } from "@/models/MenuItem";
import { User } from "@/models/User";
import Mensaje from "@/models/Mensaje";
import { PointTransaction } from "@/models/PointTransaction";
import { Counter } from "@/models/Counter";
import jwt from "jsonwebtoken";
import { sendPushToSubscriptions, sendPushAndCollectInvalid } from "@/lib/push-server";
import { enviarNotificacionFCM, isFCMTokenInvalid } from "@/lib/firebase-admin";
import Config from "@/models/Config";
import { getPointsRatio } from "@/lib/getPointsRatio";
import { hoyArgentina } from "@/lib/argentina-time";

// Numeración diaria de pedidos de la app (se reinicia cada día, hora Argentina)
async function siguienteNumeroDelDia(): Promise<number> {
    const key = `pedidos-${hoyArgentina()}`;
    const counter = await Counter.findOneAndUpdate(
        { _id: key },
        { $inc: { seq: 1 } },
        { upsert: true, new: true }
    );
    return counter.seq;
}

const TRES_DIAS_MS = 3 * 24 * 60 * 60 * 1000;

async function programarBorradoMensajes(pedidoId: string) {
    const deleteAt = new Date(Date.now() + TRES_DIAS_MS);
    await Mensaje.updateMany({ pedidoId, deleteAt: null }, { deleteAt });
}

const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET!;

// ------------------------------------------
// 🟡 GET — trae pedidos
// ------------------------------------------
export async function GET(req: NextRequest) {
    try {
        const token = req.cookies.get("session")?.value;
        if (!token)
            return NextResponse.json({ message: "No autorizado" }, { status: 401 });

        const payload = jwt.verify(token, NEXTAUTH_SECRET) as any;
        await connectMongoDB();

        let query: any =
            payload.role === "admin" || payload.role === "superadmin" || payload.role === "cajero"
                ? {}
                : payload.role === "empleado"
                ? { fuente: "empleado" }
                : payload.role === "delivery"
                ? { tipoEntrega: "envio", estado: { $in: ["listo", "entregado"] } }
                : { userId: payload.sub };

        const mesaParam = req.nextUrl.searchParams.get("mesa");
        const activosParam = req.nextUrl.searchParams.get("activos");
        const fuenteParam = req.nextUrl.searchParams.get("fuente");
        const propiasParam = req.nextUrl.searchParams.get("propias");
        const terminadosHoyParam = req.nextUrl.searchParams.get("terminadosHoy");

        // El mozo solo ve sus propias comandas en su listado (no las de otros mozos).
        // No se aplica al chequeo de mesas ocupadas, que sigue viendo todas para evitar choques.
        if (propiasParam === "true") query.userId = payload.sub;

        if (mesaParam && payload.role !== "cliente") query.mesa = mesaParam;
        if (activosParam === "true") query.estado = { $nin: ["cerrado", "cancelado"] };
        if (fuenteParam && (payload.role === "admin" || payload.role === "superadmin")) query.fuente = fuenteParam;
        if (terminadosHoyParam === "true") {
            const hoy = hoyArgentina(); // "YYYY-MM-DD" en Argentina
            const inicioHoy = new Date(`${hoy}T03:00:00.000Z`); // medianoche ART = UTC-3
            const finHoy = new Date(inicioHoy.getTime() + 24 * 60 * 60 * 1000);
            query.estado = { $in: ["cobrado", "cerrado"] };
            query.createdAt = { $gte: inicioHoy, $lt: finHoy };
        }

        const pedidos = await Pedido.find(query)
            .populate("userId", "nombre apellido role telefono")
            .populate("items.menuItemId", "nombre precio categoria")
            .populate("comensalesIds", "nombre apellido username")
            .sort({ createdAt: -1 })
            .lean();

        return NextResponse.json(pedidos, { status: 200 });
    } catch (error) {
        console.error("Error en GET /api/pedidos:", error);
        return NextResponse.json({ message: "Error interno" }, { status: 500 });
    }
}

// ------------------------------------------
// 🟢 POST — crea pedido (cliente)
// ------------------------------------------
export async function POST(req: NextRequest) {
    try {
        const token = req.cookies.get("session")?.value;
        if (!token)
            return NextResponse.json({ message: "No autorizado" }, { status: 401 });

        const payload = jwt.verify(token, NEXTAUTH_SECRET) as any;
        await connectMongoDB();
        // 🔧 Asegurar que exista configuración global
        const config = await Config.findOneAndUpdate(
            { _id: "global" },
            {},
            { upsert: true, new: true }
        );

        // 🚫 Si pedidos están desactivados, bloquear solo a clientes
        if (!config.pedidosActivos && payload.role === "cliente") {
            return NextResponse.json(
                { message: "Los pedidos están desactivados temporalmente" },
                { status: 403 }
            );
        }

        const { items, tipoEntrega, direccion, fuente, mesa, comensales, nombreComanda, notaEmpleado, notaCliente, horarioPreferido, lat, lng, clienteId, eventoId, comensalesIds } = await req.json();
        const esEmpleado = ["empleado", "cajero", "admin", "superadmin"].includes(payload.role);
        // Clientes siempre necesitan ítems; empleados pueden crear pedidos sin ítems (asignación de mesa)
        if (!items?.length && !esEmpleado)
            return NextResponse.json({ message: "Sin items" }, { status: 400 });

        const menuItems = items?.length
            ? await MenuItem.find({ _id: { $in: items.map((i: any) => i.menuItemId) } })
            : [];

        const total = items?.length
            ? items.reduce((acc: number, i: any) => {
                const item = menuItems.find((m: any) => m._id.toString() === i.menuItemId);
                return acc + (item?.precio || 0) * i.cantidad;
            }, 0)
            : 0;

        const costoEnvio = tipoEntrega === "envio" ? (config.costoEnvio || 0) : 0;

        // 🧠 Buscar usuario con seguridad
        const user = await User.findById(payload.sub);
        if (!user)
            return NextResponse.json({ message: "Usuario no encontrado" }, { status: 404 });

        // 📱 Validar teléfono para clientes
        if (payload.role === "cliente") {
            const tel = user.telefono?.replace(/\D/g, "") ?? "";
            if (!tel || tel.length < 8 || tel.length > 10) {
                // Notificar al usuario
                const notifTokens = new Set<string>(user.fcmTokens ?? []);
                if (user.tokenFCM) notifTokens.add(user.tokenFCM);
                for (const t of notifTokens) {
                    try {
                        await enviarNotificacionFCM(t, "Número de teléfono inválido", "Tu pedido no pudo procesarse. Actualizá tu número en el perfil.", "/cliente/perfil");
                    } catch { /* ignorar */ }
                }
                if (user.pushSubscriptions?.length) {
                    await sendPushToSubscriptions(user.pushSubscriptions, {
                        title: "Número de teléfono inválido",
                        body: "Tu pedido no pudo procesarse. Actualizá tu número en el perfil.",
                        url: "/cliente/perfil",
                        icon: "/icon-192.png",
                        badge: "/icon-badge-96x96.png",
                        image: "/morganwhite.png",
                    });
                }
                return NextResponse.json({ message: "Número de teléfono inválido", code: "INVALID_PHONE" }, { status: 400 });
            }
        }

        // 💾 Guardar o actualizar dirección
        if (tipoEntrega === "envio" && direccion) {
            if (!user.direccion || user.direccion !== direccion) {
                user.direccion = direccion;
                await user.save(); // <-- 🔥 guarda efectivamente
                console.log("✅ Dirección guardada o actualizada:", direccion);
            }
        }

        // 📦 Crear pedido
        const ahora = new Date();
        const cancelableUntil = new Date(ahora.getTime() + 5 * 60 * 1000); // +5 minutos
        const esPedidoApp = fuente !== "empleado";
        const numeroDia = esPedidoApp ? await siguienteNumeroDelDia() : undefined;

        // Pedidos de mozo con solo bebidas → salta directo a "listo" y se auto-imprime en BARRA
        const BEBIDAS_CATS_SET = new Set(["CERVEZAS", "VINOS", "GASEOSAS", "JARROS", "COCKTAILS", "WHISKY", "MEDIDAS"]);
        const esSoloBebidas = !esPedidoApp && (items?.length ?? 0) > 0 && menuItems.length > 0 &&
            menuItems.every(m => BEBIDAS_CATS_SET.has((m.categoria as string).toUpperCase()));

        const pedido = await Pedido.create({
            userId: user._id,
            // impreso: false en bebidas → caja detecta y auto-imprime en BARRA
            items: esSoloBebidas
                ? items.map((i: any) => ({ ...i, impreso: false }))
                : items,
            tipoEntrega,
            total: total + costoEnvio,
            costoEnvio,
            direccion: tipoEntrega === "envio" ? direccion : undefined,
            estado: esSoloBebidas ? "listo" : "pendiente",
            cancelableUntil,
            fuente: esPedidoApp ? "cliente" : "empleado",
            numeroDia,
            mesa: mesa || undefined,
            comensales: Number(comensales) || 0,
            nombreComanda: nombreComanda || undefined,
            notaEmpleado: notaEmpleado || undefined,
            notaCliente: notaCliente || undefined,
            horarioPreferido: horarioPreferido || undefined,
            lat: (tipoEntrega === "envio" && lat) ? lat : undefined,
            lng: (tipoEntrega === "envio" && lng) ? lng : undefined,
            clienteId:     clienteId || undefined,
            eventoId:      eventoId  || undefined,
            comensalesIds: Array.isArray(comensalesIds) && comensalesIds.length > 0 ? comensalesIds : undefined,
        });

        // Pedidos de mozo no generan notificación al admin (ya está en el local)
        if (fuente !== "empleado") {
            const admin = await User.findOne({ role: "admin" });
            if (admin?.pushSubscriptions?.length) {
                await sendPushToSubscriptions(admin.pushSubscriptions, {
                    title: "¡Nuevo pedido recibido!",
                    body: `Nuevo pedido de ${user.nombre ?? "un cliente"}. Revisalo en la barra 👇`,
                    url: "/admin/pedidos",
                    icon: "/icon-192.png",
                    badge: "/icon-badge-96x96.png",
                    image: "/morganwhite.png",
                });
            }

            if (admin) {
                const fcmTokens = new Set<string>(admin.fcmTokens ?? []);
                if (admin.tokenFCM) fcmTokens.add(admin.tokenFCM);
                for (const token of fcmTokens) {
                    try {
                        await enviarNotificacionFCM(token, "¡Nuevo pedido recibido!", `Nuevo pedido de ${user.nombre ?? "un cliente"}. Revisalo en la barra 👇`, "/admin/pedidos");
                    } catch (err) {
                        if (isFCMTokenInvalid(err)) await User.updateOne({ _id: admin._id }, { $pull: { fcmTokens: token } });
                    }
                }
            }
        }

        return NextResponse.json({ ok: true, pedido }, { status: 201 });
    } catch (error) {
        console.error("❌ Error en POST /api/pedidos:", error);
        return NextResponse.json({ message: "Error interno" }, { status: 500 });
    }
}

// ------------------------------------------
// 🔵 PUT — actualiza estado (admin)
// ------------------------------------------
export async function PUT(req: NextRequest) {
    try {
        const token = req.cookies.get("session")?.value;
        if (!token)
            return NextResponse.json({ message: "No autorizado" }, { status: 401 });

        const payload = jwt.verify(token, NEXTAUTH_SECRET) as any;
        if (payload.role !== "admin" && payload.role !== "cajero" && payload.role !== "delivery")
            return NextResponse.json(
                { message: "Solo admin, cajero o delivery puede cambiar estados" },
                { status: 403 }
            );

        await connectMongoDB();
        const { id, estado, repartidorAfuera } = await req.json();

        // 🛵 El repartidor avisa al cliente que está afuera de su domicilio
        if (repartidorAfuera !== undefined && estado === undefined) {
            const actual = await Pedido.findById(id);
            if (!actual) return NextResponse.json({ message: "Pedido no encontrado" }, { status: 404 });
            if (payload.role === "delivery" && (actual.tipoEntrega !== "envio" || actual.estado !== "listo")) {
                return NextResponse.json({ message: "Sin permiso para este cambio de estado" }, { status: 403 });
            }

            const pedido = await Pedido.findByIdAndUpdate(id, { repartidorAfuera }, { new: true });
            if (!pedido) return NextResponse.json({ message: "Pedido no encontrado" }, { status: 404 });

            if (repartidorAfuera) {
                const cliente = await User.findById(pedido.userId);
                if (cliente?.pushSubscriptions?.length) {
                    await sendPushToSubscriptions(cliente.pushSubscriptions, {
                        title: "¡Tu repartidor está afuera!",
                        body: "Te está esperando en la puerta con tu pedido 🛵",
                        url: "/",
                        icon: "/icon-192.png",
                        badge: "/icon-badge-96x96.png",
                    });
                }
                if (cliente) {
                    const fcmTokens = new Set<string>([...(cliente.fcmTokens ?? []), ...(cliente.tokenFCM ? [cliente.tokenFCM] : [])]);
                    for (const t of fcmTokens) {
                        try { await enviarNotificacionFCM(t, "¡Tu repartidor está afuera!", "Te está esperando en la puerta con tu pedido 🛵", "/"); }
                        catch (err) { if (isFCMTokenInvalid(err)) await User.updateOne({ _id: cliente._id }, { $pull: { fcmTokens: t } }); }
                    }
                }
            }

            return NextResponse.json({ ok: true, pedido });
        }

        // 🛵 El rol delivery solo puede marcar como entregado un envío que esté listo
        if (payload.role === "delivery") {
            const actual = await Pedido.findById(id);
            if (!actual) {
                return NextResponse.json({ message: "Pedido no encontrado" }, { status: 404 });
            }
            if (actual.tipoEntrega !== "envio" || actual.estado !== "listo" || estado !== "entregado") {
                return NextResponse.json({ message: "Sin permiso para este cambio de estado" }, { status: 403 });
            }
        }

        const update: Record<string, unknown> = { estado };
        if (estado === "entregado") update.repartidorAfuera = false;
        const pedido = await Pedido.findByIdAndUpdate(id, update, { new: true });
        if (!pedido) {
            return NextResponse.json({ message: "Pedido no encontrado" }, { status: 404 });
        }

        if (estado === "entregado" || estado === "cancelado") {
            await programarBorradoMensajes(id);
        }

        // 💰 Acreditar puntos al marcar como entregado (solo una vez)
        if (estado === "entregado" && !pedido.puntosAcreditados && pedido.total > 0) {
            const ratio = await getPointsRatio();
            const puntos = Math.floor(pedido.total * ratio);
            if (puntos > 0) {
                const cliente = await User.findById(pedido.userId);
                if (cliente) {
                    await PointTransaction.create({
                        userId: cliente._id,
                        source: "consumo",
                        amount: puntos,
                        notes: `Pedido online (${pedido.tipoEntrega})`,
                        meta: { pedidoId: pedido._id, consumoARS: pedido.total },
                        pendingReview: true,
                    });
                    cliente.puntos = (cliente.puntos || 0) + puntos;
                    cliente.needsReview = true;
                    await cliente.save();

                    await Pedido.findByIdAndUpdate(id, { puntosAcreditados: true });

                    // Push web
                    if (Array.isArray(cliente.pushSubscriptions) && cliente.pushSubscriptions.length) {
                        const invalid = await sendPushAndCollectInvalid(cliente.pushSubscriptions, {
                            title: "¡Puntos sumados!",
                            body: `Se acreditaron ${puntos} puntos por tu pedido 🎉`,
                            url: "/cliente/qr",
                        });
                        if (invalid.length) {
                            await User.updateOne({ _id: cliente._id }, { $pull: { pushSubscriptions: { endpoint: { $in: invalid } } } });
                        }
                    }
                    // Push FCM
                    const fcmTokens = new Set<string>(cliente.fcmTokens ?? []);
                    if (cliente.tokenFCM) fcmTokens.add(cliente.tokenFCM);
                    for (const fcmToken of fcmTokens) {
                        try {
                            await enviarNotificacionFCM(fcmToken, "¡Puntos sumados!", `Se acreditaron ${puntos} puntos por tu pedido 🎉`, "/cliente/qr");
                        } catch (err) {
                            if (isFCMTokenInvalid(err)) await User.updateOne({ _id: cliente._id }, { $pull: { fcmTokens: fcmToken } });
                        }
                    }
                }
            }
        }

        const esPedidoMozo = pedido.fuente === "empleado";

        // ── Notificaciones para PEDIDOS DEL MOZO ─────────────────────────
        // El mozo recibe mensajes específicos de su comanda, no mensajes de cliente
        if (esPedidoMozo) {
            const mesaLabel = pedido.mesa ? ` · Mesa ${pedido.mesa}` : "";
            const mensajesMozo: Record<string, { title: string; body: string } | null> = {
                preparando: { title: `Comanda en preparación${mesaLabel}`, body: "La cocina está trabajando en tu comanda." },
                listo:      { title: `Comanda lista${mesaLabel}`, body: "Lista para servir. Podés pasar a cobrar cuando terminen." },
                entregado:  { title: `Comanda finalizada${mesaLabel}`, body: "La comanda fue marcada como finalizada." },
                pendiente:  null, // El mozo la creó él mismo, no necesita notificación
            };
            const msgMozo = mensajesMozo[estado];
            if (msgMozo) {
                const mozo = await User.findById(pedido.userId);
                if (mozo?.pushSubscriptions?.length) {
                    await sendPushToSubscriptions(mozo.pushSubscriptions, {
                        title: msgMozo.title, body: msgMozo.body,
                        url: "/empleado/anotador",
                        icon: "/icon-192.png", badge: "/icon-badge-96x96.png",
                    });
                }
                if (mozo) {
                    const fcmTokens = new Set<string>([...(mozo.fcmTokens ?? []), ...(mozo.tokenFCM ? [mozo.tokenFCM] : [])]);
                    for (const token of fcmTokens) {
                        try { await enviarNotificacionFCM(token, msgMozo.title, msgMozo.body, "/empleado/anotador"); }
                        catch (err) { if (isFCMTokenInvalid(err)) await User.updateOne({ _id: mozo._id }, { $pull: { fcmTokens: token } }); }
                    }
                }
            }
            return NextResponse.json({ ok: true, pedido });
        }

        // ── Notificaciones para PEDIDOS DE CLIENTES (app) ────────────────
        const mensajes: Record<
            string,
            (tipoEntrega?: string) => { title: string; body: string }
        > = {
            pendiente: () => ({
                title: "¡Pedido recibido!",
                body: "Tu pedido fue recibido y está en espera de preparación ⏱️",
            }),
            preparando: () => ({
                title: "¡Estamos cocinando!",
                body: "Tu pedido está siendo preparado 👨🏻‍🍳",
            }),
            listo: (tipoEntrega) => {
                if (tipoEntrega !== "envio") {
                    return {
                        title: "¡Tu pedido está listo para retirar!",
                        body: "Ya podés pasar por el bar a buscarlo 📦",
                    };
                } else {
                    return {
                        title: "¡Tu pedido está en camino!",
                        body: "Nuestro repartidor ya está por salir 🛵",
                    };
                }
            },
            entregado: () => ({
                title: "¡Pedido entregado!",
                body: "¡Esperamos que lo disfrutes! Gracias por elegirnos 🙌",
            }),
        };

        const tipoEntrega = pedido.tipoEntrega || "";
        const mensajeFn = mensajes[estado] || (() => ({
            title: "🔔 Pedido actualizado",
            body: `Tu pedido ahora está "${estado}".`,
        }));
        const msg = mensajeFn(tipoEntrega);

        // 🔔 Notificar al cliente
        const user = await User.findById(pedido.userId);
        const notifUrl = `/cliente/mis-pedidos`;

        if (user?.pushSubscriptions?.length) {
            await sendPushToSubscriptions(user.pushSubscriptions, {
                title: msg.title,
                body: msg.body,
                url: notifUrl,
                icon: "/icon-192.png",
                badge: "/icon-badge-96x96.png",
                image: "/morganwhite.png",
            });
        }

        // 🔥 FCM — todos los tokens del cliente (array + campo legacy)
        if (user) {
            const fcmTokens = new Set<string>(user.fcmTokens ?? []);
            if (user.tokenFCM) fcmTokens.add(user.tokenFCM);

            const expiredTokens: string[] = [];
            for (const token of fcmTokens) {
                try {
                    await enviarNotificacionFCM(token, msg.title, msg.body, notifUrl);
                } catch (err) {
                    if (isFCMTokenInvalid(err)) expiredTokens.push(token);
                    else console.error("❌ FCM error estado pedido:", err);
                }
            }

            if (expiredTokens.length > 0) {
                await User.updateOne(
                    { _id: user._id },
                    {
                        $pull: { fcmTokens: { $in: expiredTokens } },
                        ...(expiredTokens.includes(user.tokenFCM ?? "") ? { $unset: { tokenFCM: "" } } : {}),
                    }
                );
            }
        }

        return NextResponse.json({ ok: true, pedido });
    } catch (err: any) {
        console.error("Error en PUT /api/pedidos:", err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// ------------------------------------------
// 🔴 DELETE — elimina pedido (admin)
// ------------------------------------------
export async function DELETE(req: NextRequest) {
    try {
        const token = req.cookies.get("session")?.value;
        if (!token)
            return NextResponse.json({ message: "No autorizado" }, { status: 401 });

        const payload = jwt.verify(token, NEXTAUTH_SECRET) as any;
        const canDelete = payload.role === "admin" || payload.role === "cajero" || payload.role === "empleado" || payload.role === "superadmin";
        if (!canDelete)
            return NextResponse.json(
                { message: "Sin permiso para eliminar pedidos" },
                { status: 403 }
            );

        // Empleado solo puede eliminar sus propias comandas (fuente empleado)
        // La verificación se hace abajo cuando se obtiene el pedido

        await connectMongoDB();

        // 📦 obtener el ID desde la query (?id=...)
        const id = req.nextUrl.searchParams.get("id");
        if (!id)
            return NextResponse.json({ message: "Falta el ID del pedido" }, { status: 400 });

        // Verificar que el empleado solo borre sus propias comandas
        if (payload.role === "empleado") {
            const p = await Pedido.findById(id);
            if (!p) return NextResponse.json({ message: "Pedido no encontrado" }, { status: 404 });
            if (p.fuente !== "empleado") return NextResponse.json({ message: "Sin permiso" }, { status: 403 });
        }

        const pedido = await Pedido.findByIdAndDelete(id);
        if (!pedido)
            return NextResponse.json({ message: "Pedido no encontrado" }, { status: 404 });

        await programarBorradoMensajes(id);

        // 🔔 Notificar al cliente que su pedido fue rechazado
        const user = await User.findById(pedido.userId);
        if (user?.pushSubscriptions?.length) {
            await sendPushToSubscriptions(user.pushSubscriptions, {
                title: "Pedido rechazado ❌",
                body: "Tu pedido fue rechazado. Si creés que es un error, consultá en el bar.",
                url: "/cliente/mis-pedidos",
                icon: "/icon-192.png",
                badge: "/icon-badge-96x96.png",
                image: "/morganwhite.png",
            });
        }

        // 🔥 FCM — todos los tokens del cliente
        if (user) {
            const fcmTokens = new Set<string>(user.fcmTokens ?? []);
            if (user.tokenFCM) fcmTokens.add(user.tokenFCM);
            for (const token of fcmTokens) {
                try {
                    await enviarNotificacionFCM(token, "Pedido rechazado ❌", "Tu pedido fue rechazado. Si creés que es un error, consultá en el bar.", "/cliente/mis-pedidos");
                } catch (err) {
                    if (isFCMTokenInvalid(err)) await User.updateOne({ _id: user._id }, { $pull: { fcmTokens: token } });
                }
            }
        }

        return NextResponse.json({ ok: true, message: "Pedido eliminado correctamente" });
    } catch (error) {
        console.error("Error en DELETE /api/pedidos:", error);
        return NextResponse.json({ message: "Error interno" }, { status: 500 });
    }
}

