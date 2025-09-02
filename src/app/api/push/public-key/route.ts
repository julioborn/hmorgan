// src/app/api/push/public-key/route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function sanitizeKey(k?: string) {
    if (!k) return "";
    return k.replace(/^"+|"+$/g, "").trim().replace(/\s+/g, "");
}

function isBase64Url(s: string) {
    return /^[A-Za-z0-9_-]+$/.test(s);
}

export async function GET() {
    const key = sanitizeKey(process.env.VAPID_PUBLIC_KEY);

    if (!key) {
        return NextResponse.json(
            { error: "VAPID_PUBLIC_KEY no configurada" },
            { status: 500 }
        );
    }

    if (!isBase64Url(key) || key.length < 80 || key.length > 100) {
        return NextResponse.json(
            { error: "VAPID_PUBLIC_KEY inválida (formato/longitud)" },
            { status: 500 }
        );
    }

    return NextResponse.json(
        { key },
        { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
}
