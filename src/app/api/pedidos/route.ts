import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { Pedido } from "@/models/Pedido";
import { MenuItem } from "@/models/MenuItem";
import jwt from "jsonwebtoken";
import { User } from "@/models/User";
import { sendPushToSubscriptions } from "@/lib/push-server";

const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET!;

export async function GET(req: NextRequest) {
    try {
        const token = req.cookies.get("session")?.value;
        if (!token)
            return NextResponse.json({ message: "No autorizado" }, { status: 401 });

        const payload = jwt.verify(token, NEXTAUTH_SECRET) as any;
        await connectMongoDB();

        // Buscar solo los pedidos del usuario actual
        const pedidos = await Pedido.find({ userId: payload.sub })
            .populate("items.menuItemId", "nombre precio categoria")
            .sort({ createdAt: -1 })
            .lean();

        return NextResponse.json(pedidos, { status: 200 });
    } catch (error) {
        console.error("Error en GET /api/pedidos:", error);
        return NextResponse.json({ message: "Error interno" }, { status: 500 });
    }
}

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

        if (!menuItems.length)
            return NextResponse.json({ message: "Items no encontrados" }, { status: 404 });

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

        // Notificar al admin
        const admin = await User.findOne({ rol: "admin" });
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
