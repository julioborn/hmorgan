import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { Stock } from "@/models/Stock";
import { StockMovement } from "@/models/StockMovement";
import jwt from "jsonwebtoken";

const SECRET = process.env.NEXTAUTH_SECRET!;

function authSuper(req: NextRequest) {
    const token = req.cookies.get("session")?.value;
    if (!token) return null;
    try {
        const p = jwt.verify(token, SECRET) as any;
        if (p.role !== "superadmin") return null;
        return p;
    } catch { return null; }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    const payload = authSuper(req);
    if (!payload) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    await connectMongoDB();
    const [item, movs] = await Promise.all([
        Stock.findById(params.id).lean(),
        StockMovement.find({ stockId: params.id }).sort({ createdAt: -1 }).limit(50).lean(),
    ]);
    if (!item) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    return NextResponse.json({ item, movimientos: movs });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
    const payload = authSuper(req);
    if (!payload) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    await connectMongoDB();
    const body = await req.json();
    const item = await Stock.findByIdAndUpdate(params.id, body, { new: true });
    return NextResponse.json(item);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    const payload = authSuper(req);
    if (!payload) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    await connectMongoDB();
    await Stock.findByIdAndDelete(params.id);
    return NextResponse.json({ ok: true });
}
