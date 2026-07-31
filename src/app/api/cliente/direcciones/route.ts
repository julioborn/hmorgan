import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import jwt from "jsonwebtoken";

function getUserId(req: NextRequest) {
    const token = req.cookies.get("session")?.value;
    if (!token) return null;
    try {
        return (jwt.verify(token, process.env.NEXTAUTH_SECRET!) as any).sub as string;
    } catch { return null; }
}

// POST — agregar una dirección al array (si no existe ya)
export async function POST(req: NextRequest) {
    const userId = getUserId(req);
    if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const { texto } = await req.json();
    if (!texto?.trim()) return NextResponse.json({ error: "Texto requerido" }, { status: 400 });

    await connectMongoDB();
    await User.findByIdAndUpdate(userId, {
        $addToSet: { direcciones: texto.trim() },
        $set: { direccion: texto.trim() },
    });
    return NextResponse.json({ ok: true });
}

// DELETE — eliminar una dirección del array
export async function DELETE(req: NextRequest) {
    const userId = getUserId(req);
    if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const { texto } = await req.json();
    if (!texto) return NextResponse.json({ error: "Texto requerido" }, { status: 400 });

    await connectMongoDB();
    const user = await User.findById(userId);
    if (!user) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    await User.findByIdAndUpdate(userId, { $pull: { direcciones: texto } });

    // Si era la última usada, pisar con la primera que quede (o vacío)
    if (user.direccion === texto) {
        const resto = (user.direcciones || []).filter((d: string) => d !== texto);
        await User.findByIdAndUpdate(userId, { $set: { direccion: resto[0] || "" } });
    }

    return NextResponse.json({ ok: true });
}
