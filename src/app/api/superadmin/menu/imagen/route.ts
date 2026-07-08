import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import jwt from "jsonwebtoken";

export const dynamic = "force-dynamic";

const SECRET = process.env.NEXTAUTH_SECRET!;
const IMG_DIR = path.join(process.cwd(), "public", "imagenes-menu");

import { OWNER_USER_ID } from "@/lib/owner";

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

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "Sin archivo" }, { status: 400 });

    await mkdir(IMG_DIR, { recursive: true });

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const filename = `cat_${Date.now()}.${ext}`;
    const filePath = path.join(IMG_DIR, filename);
    await writeFile(filePath, Buffer.from(await file.arrayBuffer()));

    return NextResponse.json({ url: `/imagenes-menu/${filename}` });
}
