import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { AutoservicioSesion } from "@/models/AutoservicioSesion";
import { User } from "@/models/User";
import jwt from "jsonwebtoken";
import { sendPushAndCollectInvalid } from "@/lib/push-server";
import { enviarNotificacionFCM, isFCMTokenInvalid } from "@/lib/firebase-admin";

const SECRET = process.env.NEXTAUTH_SECRET!;
const STAFF = ["cajero", "empleado", "admin", "superadmin"];

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const token = req.cookies.get("session")?.value;
        if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        const p = jwt.verify(token, SECRET) as any;
        if (!STAFF.includes(p.role)) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    } catch { return NextResponse.json({ error: "No autorizado" }, { status: 401 }); }

    await connectMongoDB();

    let body: any = {};
    try { body = await req.json(); } catch { /* no body → acción por defecto: cerrar */ }

    // Agregar usuario a sesión existente
    if (body?.accion === "agregarUsuario") {
        const { username } = body;
        if (!username) return NextResponse.json({ error: "Falta username" }, { status: 400 });

        const usuario = await User.findOne({
            username: String(username).toLowerCase().trim(),
            role: "cliente",
        }).select("_id nombre apellido pushSubscriptions fcmTokens").lean() as any;

        if (!usuario) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

        const sesion = await AutoservicioSesion.findByIdAndUpdate(
            params.id,
            { $addToSet: { usuariosIds: usuario._id } },
            { new: true }
        ).lean() as any;

        if (!sesion) return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });

        // Notificar al nuevo usuario
        const mesasStr = (sesion.mesasNombres as string[]).join(", ");
        const title = "¡Te sumaron al autoservicio!";
        const body2 = `Mesa ${mesasStr} lista. Ya podés hacer pedidos desde tu teléfono.`;
        if (Array.isArray(usuario.pushSubscriptions) && usuario.pushSubscriptions.length) {
            const invalid = await sendPushAndCollectInvalid(usuario.pushSubscriptions, { title, body: body2, url: "/autoservicio" });
            if (invalid.length) await User.updateOne({ _id: usuario._id }, { $pull: { pushSubscriptions: { endpoint: { $in: invalid } } } });
        }
        for (const tok of (usuario.fcmTokens ?? [])) {
            try { await enviarNotificacionFCM(tok, title, body2, "/autoservicio"); }
            catch (err) { if (isFCMTokenInvalid(err)) await User.updateOne({ _id: usuario._id }, { $pull: { fcmTokens: tok } }); }
        }

        return NextResponse.json({ ok: true, usuario: { _id: usuario._id, nombre: usuario.nombre, apellido: usuario.apellido, username } });
    }

    // Acción por defecto: cerrar sesión
    await AutoservicioSesion.findByIdAndUpdate(params.id, { estado: "cerrada" });
    return NextResponse.json({ ok: true });
}
