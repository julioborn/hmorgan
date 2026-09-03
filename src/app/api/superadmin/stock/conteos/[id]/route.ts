import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { StockConteo } from "@/models/StockConteo";
import jwt from "jsonwebtoken";

const SECRET = process.env.NEXTAUTH_SECRET!;

function auth(req: NextRequest) {
    const token = req.cookies.get("session")?.value;
    if (!token) return null;
    try {
        const p = jwt.verify(token, SECRET) as any;
        if (!["superadmin", "admin"].includes(p.role)) return null;
        return p;
    } catch { return null; }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    const payload = auth(req);
    if (!payload) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    await connectMongoDB();
    const conteo = await StockConteo.findById(params.id).lean();
    if (!conteo) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    return NextResponse.json(conteo);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    const payload = auth(req);
    if (!payload) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    await connectMongoDB();
    await StockConteo.findByIdAndDelete(params.id);
    return NextResponse.json({ ok: true });
}
