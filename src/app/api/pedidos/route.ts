// /api/pedidos/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { Pedido } from "@/models/Pedido";
import { MenuItem } from "@/models/MenuItem";
import { User } from "@/models/User";
import jwt from "jsonwebtoken";
import { sendPushToSubscriptions } from "@/lib/push-server";

const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET!;

// 🔹 GET — trae pedidos (admin ve todos, cliente solo los suyos)
export async function GET(req: NextRequest) {
    try {
        const token = req.cookies.get("session")?.value;
        if (!token)
            return NextResponse.json({ message: "No autorizado" }, { status: 401 });

        const payload = jwt.verify(token, NEXTAUTH_SECRET) as any;
        await connectMongoDB();

        const query =
            payload.role === "admin"
                ? {} // 🔹 admin: todos los pedidos
                : { userId: payload.sub }; // 🔹 cliente: solo los suyos

        const pedidos = await Pedido.find(query)
            .populate("userId", "nombre apellido")
            .populate("items.menuItemId", "nombre precio categoria")
            .sort({ createdAt: -1 })
            .lean();

        return NextResponse.json(pedidos, { status: 200 });
    } catch (error) {
        console.error("Error en GET /api/pedidos:", error);
        return NextResponse.json({ message: "Error interno" }, { status: 500 });
    }
}

// 🔹 POST — crea pedido (cliente)
export async function POST(req: NextRequest) {
    try {
        const token = req.cookies.get("session")?.value;
        if (!token)
            return NextResponse.json({ message: "No autorizado" }, { status: 401 });

        const payload = jwt.verify(token, NEXTAUTH_SECRET) as any;
        await connectMongoDB();

        const { items, tipoEntrega } = await req.json();
        if (!items?.length)
            return NextResponse.json({ message: "Sin items" }, { status: 400 });

        const menuItems = await MenuItem.find({
            _id: { $in: items.map((i: any) => i.menuItemId) },
        });

        const total = items.reduce((acc: number, i: any) => {
            const item = menuItems.find((m: any) => m._id.toString() === i.menuItemId);
            return acc + (item?.precio || 0) * i.cantidad;
        }, 0);

        const pedido = await Pedido.create({
            userId: payload.sub,
            items,
            tipoEntrega,
            total,
            estado: "pendiente",
        });

        // 🔔 Notificar al admin
        const admin = await User.findOne({ role: "admin" });
        if (admin?.pushSubscriptions?.length) {
            await sendPushToSubscriptions(admin.pushSubscriptions, {
                title: "🍔 Nuevo pedido recibido",
                body: `Pedido de ${payload?.nombre ?? "Cliente"}`,
                url: "/admin/pedidos",
            });
        }

        return NextResponse.json({ ok: true, pedido }, { status: 201 });
    } catch (error) {
        console.error("Error en POST /api/pedidos:", error);
        return NextResponse.json({ message: "Error interno" }, { status: 500 });
    }
}

// 🔹 PUT — actualiza estado (admin)
export async function PUT(req: NextRequest) {
    try {
        const token = req.cookies.get("session")?.value;
        if (!token)
            return NextResponse.json({ message: "No autorizado" }, { status: 401 });

        const payload = jwt.verify(token, NEXTAUTH_SECRET) as any;
        if (payload.role !== "admin")
            return NextResponse.json({ message: "Solo admin puede cambiar estados" }, { status: 403 });

        await connectMongoDB();
        const { id, estado } = await req.json();

        const pedido = await Pedido.findByIdAndUpdate(id, { estado }, { new: true });
        if (!pedido) {
            return NextResponse.json({ message: "Pedido no encontrado" }, { status: 404 });
        }

        // 🔔 Notificar al usuario del pedido
        const user = await User.findById(pedido.userId);
        if (user?.pushSubscriptions?.length) {
            await sendPushToSubscriptions(user.pushSubscriptions, {
                title: "🔔 Estado actualizado",
                body: `Tu pedido ahora está "${estado}".`,
                url: "/cliente/mis-pedidos",
            });
        }

        return NextResponse.json({ ok: true, pedido });
    } catch (err: any) {
        console.error("Error en PUT /api/pedidos:", err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
