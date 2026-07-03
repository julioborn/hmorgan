import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { CajaMovement } from "@/models/CajaMovement";
import jwt from "jsonwebtoken";

const SECRET = process.env.NEXTAUTH_SECRET!;

function auth(req: NextRequest) {
    const token = req.cookies.get("session")?.value;
    if (!token) return null;
    try {
        const p = jwt.verify(token, SECRET) as any;
        return ["superadmin", "admin", "cajero"].includes(p.role) ? p : null;
    } catch { return null; }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
    if (!auth(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    await connectMongoDB();
    const { concepto, monto, metodoPago } = await req.json();
    const mov = await CajaMovement.findByIdAndUpdate(
        params.id,
        { $set: { concepto, monto: Number(monto), metodoPago } },
        { new: true }
    );
    if (!mov) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    return NextResponse.json(mov);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    if (!auth(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    await connectMongoDB();
    await CajaMovement.findByIdAndDelete(params.id);
    return NextResponse.json({ ok: true });
}
