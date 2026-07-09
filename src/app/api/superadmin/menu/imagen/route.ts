import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { admin } from "@/lib/firebase-admin";
import { OWNER_USER_ID } from "@/lib/owner";

export const dynamic = "force-dynamic";

const SECRET = process.env.NEXTAUTH_SECRET!;

async function authorize(req: NextRequest) {
    const token = req.cookies.get("session")?.value;
    if (!token) return false;
    try {
        const p = jwt.verify(token, SECRET) as any;
        return ["admin", "superadmin", "cajero"].includes(p.role) || p.sub === OWNER_USER_ID;
    } catch { return false; }
}

export async function POST(req: NextRequest) {
    if (!await authorize(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;
        if (!file) return NextResponse.json({ error: "Sin archivo" }, { status: 400 });

        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const filename = `imagenes-menu/cat_${Date.now()}.${ext}`;
        const buffer = Buffer.from(await file.arrayBuffer());

        const bucket = admin.storage().bucket();
        const storageFile = bucket.file(filename);

        await storageFile.save(buffer, {
            metadata: { contentType: file.type || `image/${ext}` },
        });
        await storageFile.makePublic();

        const url = `https://storage.googleapis.com/${bucket.name}/${filename}`;
        return NextResponse.json({ url });
    } catch (err: any) {
        console.error("[imagen/route] upload error:", err?.message);
        return NextResponse.json({ error: err?.message || "Error al subir imagen" }, { status: 500 });
    }
}
