// src/app/api/push/public-key/route.ts
import { NextResponse } from "next/server";

function sanitizeKey(k: string | undefined) {
    if (!k) return "";
    // quita comillas, espacios y saltos
    const s = k.replace(/^"+|"+$/g, "").trim().replace(/\s+/g, "");
    return s;
}

export async function GET() {
    // usa la pública del server; si no está, cae a la del cliente
    const fromServer = sanitizeKey(process.env.VAPID_PUBLIC_KEY);
    const fromClient = sanitizeKey(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);
    const key = fromServer || fromClient;
    return NextResponse.json({ key });
}