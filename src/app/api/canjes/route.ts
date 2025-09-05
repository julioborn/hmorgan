import { NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { Canje } from "@/models/Canje";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Reward } from "@/models/Reward";

export async function POST(req: Request) {
    try {
        await connectMongoDB();

        // 🔑 Recuperar usuario de la sesión
        const session = await getServerSession(authOptions);
        if (!session?.user || !(session.user as any).id) {
            return NextResponse.json({ message: "No autorizado" }, { status: 401 });
        }

        const { rewardId } = await req.json();

        // ❌ antes: .lean() => rompe tipos
        // ✅ ahora: dejamos el documento Mongoose
        const reward = await Reward.findById(rewardId);
        if (!reward) {
            return NextResponse.json({ message: "Recompensa no encontrada" }, { status: 404 });
        }

        // 📝 crear el canje
        const canje = await Canje.create({
            rewardId,
            titulo: reward.titulo,
            puntosGastados: reward.puntos,
            userId: (session.user as any).id,
            fecha: new Date(),
        });

        return NextResponse.json(canje, { status: 201 });
    } catch (err: any) {
        console.error("Error al crear canje:", err);
        return NextResponse.json({ message: "Error interno" }, { status: 500 });
    }
}
