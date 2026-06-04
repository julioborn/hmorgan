import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { MenuItem } from "@/models/MenuItem";
import jwt from "jsonwebtoken";

const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET!;

export async function PUT(req: NextRequest) {
    try {
        const token = req.cookies.get("session")?.value;
        if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        const payload = jwt.verify(token, NEXTAUTH_SECRET) as any;
        if (payload.role !== "admin") return NextResponse.json({ error: "No autorizado" }, { status: 403 });

        const { items } = await req.json() as { items: { id: string; order: number }[] };
        if (!Array.isArray(items)) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

        await connectMongoDB();
        await Promise.all(items.map(({ id, order }) => MenuItem.findByIdAndUpdate(id, { order })));

        return NextResponse.json({ ok: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Error guardando orden" }, { status: 500 });
    }
}
