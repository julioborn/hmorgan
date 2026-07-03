import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { connectMongoDB } from "@/lib/mongodb";
import { Pedido } from "@/models/Pedido";
import jwt from "jsonwebtoken";

export async function POST(req: NextRequest) {
    const token = req.cookies.get("session")?.value;
    if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    try {
        jwt.verify(token, process.env.NEXTAUTH_SECRET!);
    } catch {
        return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }

    const { pedidoId } = await req.json();
    if (!pedidoId) return NextResponse.json({ error: "Falta pedidoId" }, { status: 400 });

    await connectMongoDB();
    const pedido = await Pedido.findById(pedidoId).populate("items.menuItemId", "nombre precio");
    if (!pedido) return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });

    const client = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN! });
    const preference = new Preference(client);

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

    const result = await preference.create({
        body: {
            items: pedido.items.map((item: any) => ({
                id: item.menuItemId._id.toString(),
                title: item.menuItemId.nombre as string,
                quantity: item.cantidad as number,
                unit_price: item.menuItemId.precio as number,
                currency_id: "ARS",
            })),
            back_urls: {
                success: `${baseUrl}/cliente/pedidos?pago=ok`,
                failure: `${baseUrl}/cliente/pedidos?pago=error`,
                pending: `${baseUrl}/cliente/pedidos?pago=pendiente`,
            },
            auto_return: "approved",
            external_reference: pedidoId,
            notification_url: `${baseUrl}/api/pagos/mp/webhook`,
        },
    });

    await Pedido.findByIdAndUpdate(pedidoId, { mpPreferenceId: result.id });

    return NextResponse.json({ init_point: result.init_point, preferenceId: result.id });
}
