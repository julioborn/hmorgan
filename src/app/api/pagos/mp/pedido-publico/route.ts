import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { Pedido } from "@/models/Pedido";
import "@/models/MenuItem";

export async function GET(req: NextRequest) {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });

    await connectMongoDB();
    const pedido = await Pedido.findById(id).populate("items.menuItemId", "nombre precio");
    if (!pedido) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    const subtotal = pedido.items.reduce((acc: number, item: any) => {
        return acc + (item.menuItemId?.precio ?? 0) * item.cantidad;
    }, 0);

    return NextResponse.json({
        numero: pedido.numero,
        items: pedido.items.map((item: any) => ({
            nombre: item.menuItemId?.nombre ?? "Producto",
            cantidad: item.cantidad,
            precio: item.menuItemId?.precio ?? 0,
        })),
        subtotal,
        costoEnvio: (pedido as any).costoEnvio ?? 0,
        tipoEntrega: pedido.tipoEntrega,
        mpEstadoPago: pedido.mpEstadoPago,
        createdAt: pedido.createdAt,
    });
}
