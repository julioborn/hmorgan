import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { connectMongoDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { OWNER_USER_ID } from "@/lib/owner";

const SECRET = process.env.NEXTAUTH_SECRET!;

async function authorize(req: NextRequest) {
    const token = req.cookies.get("session")?.value;
    if (!token) return null;
    try {
        const decoded = jwt.verify(token, SECRET) as any;
        if (!["superadmin", "admin"].includes(decoded.role) && decoded.sub !== OWNER_USER_ID) return null;
        return decoded;
    } catch { return null; }
}

export async function GET(req: NextRequest) {
    if (!await authorize(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    await connectMongoDB();
    const empleados = await User.find({ role: { $in: ["empleado", "delivery", "cocina"] } })
        .select("nombre apellido username role createdAt")
        .sort({ nombre: 1 })
        .lean();
    return NextResponse.json(empleados);
}

export async function POST(req: NextRequest) {
    if (!await authorize(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const { nombre, apellido, username, password, role } = await req.json();
    if (!nombre || !apellido || !username || !password)
        return NextResponse.json({ error: "Faltan datos" }, { status: 400 });

    const finalRole = role === "delivery" ? "delivery" : role === "cocina" ? "cocina" : "empleado";

    await connectMongoDB();
    const existe = await User.findOne({ username: username.toLowerCase().trim() });
    if (existe) return NextResponse.json({ error: "El usuario ya existe" }, { status: 409 });

    const passwordHash = await bcrypt.hash(password, 10);
    const qrToken = crypto.randomUUID();
    const emp = await User.create({
        nombre, apellido,
        username: username.toLowerCase().trim(),
        passwordHash,
        role: finalRole,
        qrToken,
        puntos: 0,
    });
    return NextResponse.json({ ok: true, empleado: { _id: emp._id, nombre, apellido, username: emp.username, role: emp.role } }, { status: 201 });
}
