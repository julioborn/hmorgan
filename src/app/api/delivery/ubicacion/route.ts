import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import jwt from "jsonwebtoken";

const SECRET = process.env.NEXTAUTH_SECRET!;

// Delivery actualiza su ubicación
export async function PUT(req: NextRequest) {
    const token = req.cookies.get("session")?.value;
    if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    let payload: any;
    try { payload = jwt.verify(token, SECRET) as any; } catch {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    if (payload.role !== "delivery") {
        return NextResponse.json({ error: "Solo delivery" }, { status: 403 });
    }

    const { lat, lng } = await req.json();
    if (typeof lat !== "number" || typeof lng !== "number") {
        return NextResponse.json({ error: "Coordenadas inválidas" }, { status: 400 });
    }

    await connectMongoDB();
    await User.findByIdAndUpdate(payload.sub, {
        ubicacionDelivery: { lat, lng, updatedAt: new Date() },
    });
    return NextResponse.json({ ok: true });
}

// Admin o cliente consulta la ubicación de delivery activos
export async function GET(req: NextRequest) {
    const token = req.cookies.get("session")?.value;
    if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    try { jwt.verify(token, SECRET); } catch {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    await connectMongoDB();
    // Solo devuelve deliveries con ubicación actualizada en los últimos 10 minutos
    const hace10min = new Date(Date.now() - 10 * 60 * 1000);
    const deliveries = await User.find({
        role: "delivery",
        "ubicacionDelivery.updatedAt": { $gte: hace10min },
    }).select("nombre apellido ubicacionDelivery").lean();

    return NextResponse.json(deliveries);
}

// Delivery borra su ubicación al salir
export async function DELETE(req: NextRequest) {
    const token = req.cookies.get("session")?.value;
    if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    let payload: any;
    try { payload = jwt.verify(token, SECRET) as any; } catch {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    if (payload.role !== "delivery") {
        return NextResponse.json({ error: "Solo delivery" }, { status: 403 });
    }

    await connectMongoDB();
    await User.findByIdAndUpdate(payload.sub, { $unset: { ubicacionDelivery: 1 } });
    return NextResponse.json({ ok: true });
}
