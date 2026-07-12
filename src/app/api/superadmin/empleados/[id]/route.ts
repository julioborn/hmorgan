import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { connectMongoDB } from "@/lib/mongodb";
import { User } from "@/models/User";

const SECRET = process.env.NEXTAUTH_SECRET!;

async function authorize(req: NextRequest) {
    const token = req.cookies.get("session")?.value;
    if (!token) return null;
    try {
        const decoded = jwt.verify(token, SECRET) as any;
        if (!["superadmin", "admin"].includes(decoded.role)) return null;
        return decoded;
    } catch { return null; }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    if (!await authorize(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    await connectMongoDB();
    await User.findByIdAndDelete(params.id);
    return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
    if (!await authorize(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    await connectMongoDB();
    const body = await req.json();

    if (body.password) {
        const passwordHash = await bcrypt.hash(body.password, 10);
        await User.findByIdAndUpdate(params.id, { passwordHash });
        return NextResponse.json({ ok: true });
    }

    const update: Record<string, string> = {};
    if (body.nombre)   update.nombre   = body.nombre.trim();
    if (body.apellido !== undefined) update.apellido = body.apellido.trim();
    if (body.role)     update.role     = body.role;

    if (Object.keys(update).length === 0)
        return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });

    const empleado = await User.findByIdAndUpdate(params.id, update, { new: true }).select("nombre apellido username role");
    return NextResponse.json({ ok: true, empleado });
}
