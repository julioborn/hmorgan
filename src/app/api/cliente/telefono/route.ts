import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import jwt from "jsonwebtoken";

export async function PATCH(req: NextRequest) {
    const token = req.cookies.get("session")?.value;
    if (!token) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const payload = jwt.verify(token, process.env.NEXTAUTH_SECRET!) as any;
    await connectMongoDB();

    const { telefono } = await req.json();
    if (!telefono || !/^\d{8,10}$/.test(telefono)) {
        return NextResponse.json({ error: "Número inválido" }, { status: 400 });
    }

    await User.findByIdAndUpdate(payload.sub, { telefono });
    return NextResponse.json({ ok: true });
}
