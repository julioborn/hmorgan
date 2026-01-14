import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { connectMongoDB } from "@/lib/mongodb";
import { Pedido } from "@/models/Pedido";
import { User } from "@/models/User";

const secret = process.env.NEXTAUTH_SECRET!;

export async function DELETE() {
    try {
        await connectMongoDB();

        const token = cookies().get("session")?.value;
        if (!token) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        const payload = jwt.verify(token, secret) as { sub: string };
        const userId = payload.sub;

        // 🔥 eliminar datos asociados
        await Pedido.deleteMany({ userId });

        // 🔥 eliminar usuario
        await User.findByIdAndDelete(userId);

        // 🔥 borrar sesión
        cookies().delete("session");

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Eliminar cuenta:", error);
        return NextResponse.json(
            { error: "Error eliminando cuenta" },
            { status: 500 }
        );
    }
}
