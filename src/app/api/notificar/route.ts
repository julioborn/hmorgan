import { NextResponse } from "next/server";
import { enviarNotificacionFCM } from "@/lib/firebase-admin";

/**
 * Envia una notificación a un token FCM específico.
 * 
 * POST /api/notificar
 * body: { token: string, title: string, body: string, url?: string }
 */
export async function POST(req: Request) {
    try {
        const { token, title, body, url } = await req.json();

        if (!token) {
            return NextResponse.json({ error: "Falta el token FCM" }, { status: 400 });
        }

        await enviarNotificacionFCM(token, title || "Notificación", body || "Mensaje vacío", url);

        return NextResponse.json({ ok: true, message: "Notificación enviada correctamente" });
    } catch (error: any) {
        console.error("❌ Error en /api/notificar:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
