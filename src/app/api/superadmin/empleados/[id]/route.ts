import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { connectMongoDB } from "@/lib/mongodb";
import { User } from "@/models/User";

const SECRET = process.env.JWT_SECRET || "secret";

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
    const { password } = await req.json();
    if (!password) return NextResponse.json({ error: "Falta contraseña" }, { status: 400 });
    await connectMongoDB();
    const passwordHash = await bcrypt.hash(password, 10);
    await User.findByIdAndUpdate(params.id, { passwordHash });
    return NextResponse.json({ ok: true });
}
