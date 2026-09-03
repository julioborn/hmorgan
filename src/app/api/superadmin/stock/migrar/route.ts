import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { Stock } from "@/models/Stock";
import jwt from "jsonwebtoken";

const SECRET = process.env.NEXTAUTH_SECRET!;

export async function POST(req: NextRequest) {
    const token = req.cookies.get("session")?.value;
    if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    try {
        const p = jwt.verify(token, SECRET) as any;
        if (!["superadmin", "admin"].includes(p.role)) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    } catch { return NextResponse.json({ error: "No autorizado" }, { status: 401 }); }

    const { ids, tipo } = await req.json();
    if (!ids || !tipo) return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });

    await connectMongoDB();
    const result = await Stock.updateMany({ _id: { $in: ids } }, { $set: { tipo } });
    return NextResponse.json({ ok: true, modificados: result.modifiedCount });
}
