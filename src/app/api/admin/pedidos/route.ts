import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";

// 👇 importa SIEMPRE todos los modelos que pueden intervenir en el populate
import "@/models/MenuItem";  // 👈 esto registra el schema en Mongoose
import "@/models/User";      // 👈 registra el schema de usuarios
import { Pedido } from "@/models/Pedido";
import { User } from "@/models/User";
import { sendPushToSubscriptions } from "@/lib/push-server";

export async function GET() {
    try {
        await connectMongoDB();

        // Ahora Mongoose ya tiene todos los schemas registrados antes del populate
        const pedidos = await Pedido.find()
            .populate("userId", "nombre apellido")
            .populate("items.menuItemId", "nombre precio categoria")
            .sort({ createdAt: -1 })
            .lean();

        return NextResponse.json(pedidos);
    } catch (err: any) {
        console.error("❌ Error en GET /api/admin/pedidos:", err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        await connectMongoDB();
        const { id, estado } = await req.json();

        await Pedido.findByIdAndUpdate(id, { estado });

        // Buscar el pedido y su usuario
        const pedido = await Pedido.findById(id);
        if (pedido) {
            const user = await User.findById(pedido.userId);
            if (user?.pushSubscriptions?.length) {
                await sendPushToSubscriptions(user.pushSubscriptions, {
                    title: "🔔 Estado actualizado",
                    body: `Tu pedido ahora está "${estado}".`,
                    url: "/cliente/mis-pedidos",
                });
            }
        }
        return NextResponse.json({ ok: true });
    } catch (err: any) {
        console.error("Error en PUT /api/admin/pedidos:", err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
