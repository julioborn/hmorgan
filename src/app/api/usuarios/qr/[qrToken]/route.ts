import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { User } from "@/models/User";

export const dynamic = "force-dynamic";

export async function GET(
    req: NextRequest,
    { params }: { params: { qrToken: string } }
) {
    try {
        await connectMongoDB();

        const user = await User.findOne({ qrToken: params.qrToken }).select(
            "nombre apellido dni puntos"
        );

        if (!user) {
            return NextResponse.json({ message: "Usuario no encontrado" }, { status: 404 });
        }

        return NextResponse.json(user);
    } catch (error) {
        console.error("Error en GET /api/usuarios/qr:", error);
        return NextResponse.json({ message: "Error interno" }, { status: 500 });
    }
}
