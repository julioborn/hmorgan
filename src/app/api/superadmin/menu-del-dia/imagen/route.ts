import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { MenuDelDia } from "@/models/MenuDelDia";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import jwt from "jsonwebtoken";

const SECRET = process.env.NEXTAUTH_SECRET!;
const IMG_DIR = path.join(process.cwd(), "public", "menu-del-dia");

async function authorize(req: NextRequest) {
    const token = req.cookies.get("session")?.value;
    if (!token) return false;
    try {
        const p = jwt.verify(token, SECRET) as any;
        return ["admin", "superadmin", "cajero"].includes(p.role);
    } catch { return false; }
}

export async function POST(req: NextRequest) {
    if (!await authorize(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "Sin archivo" }, { status: 400 });

    await mkdir(IMG_DIR, { recursive: true });

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const filename = `menu-del-dia_${Date.now()}.${ext}`;
    const filePath = path.join(IMG_DIR, filename);
    await writeFile(filePath, Buffer.from(await file.arrayBuffer()));

    await connectMongoDB();
    const url = `/menu-del-dia/${filename}`;
    const doc = await MenuDelDia.findOneAndUpdate(
        {},
        { $set: { imagen: url } },
        { upsert: true, new: true }
    ).lean();

    return NextResponse.json({ ok: true, url, doc });
}
