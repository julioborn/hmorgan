import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { AutoservicioSesion } from "@/models/AutoservicioSesion";
import { Pedido } from "@/models/Pedido";
import { MenuItem } from "@/models/MenuItem";
import { User } from "@/models/User";
import jwt from "jsonwebtoken";

const SECRET = process.env.NEXTAUTH_SECRET!;

const BEBIDAS_CATS = new Set(["CERVEZAS", "VINOS", "GASEOSAS", "JARROS", "COCKTAILS", "WHISKY", "MEDIDAS"]);

async function recalcularTotal(items: { menuItemId: any; cantidad: number }[]) {
    const menuItems = await MenuItem.find({ _id: { $in: items.map((i) => i.menuItemId) } });
    return items.reduce((acc, i) => {
        const m = menuItems.find((m: any) => m._id.toString() === i.menuItemId.toString());
        return acc + (m?.precio || 0) * i.cantidad;
    }, 0);
}

export async function POST(req: NextRequest) {
    try {
        const token = req.cookies.get("session")?.value;
        if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

        let payload: any;
        try { payload = jwt.verify(token, SECRET); } catch {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        await connectMongoDB();

        // Verificar sesión de autoservicio activa
        const sesion = await AutoservicioSesion.findOne({
            usuariosIds: payload.sub,
            estado: "activa",
        }).lean() as any;

        if (!sesion) return NextResponse.json({ error: "Sin sesión de autoservicio activa" }, { status: 403 });

        const mesa = (sesion.mesasNombres as string[]).join(", ");
        const { items, notasProducto } = await req.json();

        if (!items?.length) return NextResponse.json({ error: "Sin items" }, { status: 400 });

        // Construir array de items con notas — impreso: false para que la caja los detecte y los imprima
        const itemsConNota = items.map((it: { menuItemId: string; cantidad: number }) => ({
            menuItemId: it.menuItemId,
            cantidad: it.cantidad,
            nota: notasProducto?.[it.menuItemId]?.trim() || undefined,
            impreso: false,
        }));

        // Buscar pedido activo de autoservicio del mismo usuario en la misma mesa
        const pedidoExistente = await Pedido.findOne({
            userId: payload.sub,
            fuente: "autoservicio",
            mesa,
            estado: { $nin: ["cerrado", "cancelado", "cobrado"] },
        }).sort({ createdAt: -1 });

        if (!pedidoExistente) {
            // Primera orden: crear pedido nuevo
            const total = await recalcularTotal(itemsConNota);
            const pedido = await Pedido.create({
                userId: payload.sub,
                items: itemsConNota,
                fuente: "autoservicio",
                tipoEntrega: "retira",
                total,
                estado: "pendiente",
                mesa,
            });
            return NextResponse.json({ ok: true, pedido, accion: "creado" }, { status: 201 });
        }

        // Ya existe — agregar ítems con impreso: false
        // La caja detectará los items no impresos y los enviará a la impresora automáticamente
        for (const it of itemsConNota) {
            (pedidoExistente.items as any[]).push(it);
        }
        pedidoExistente.total = await recalcularTotal(pedidoExistente.items as any[]);

        // Si estaba "listo" y hay ítems de comida → volver a preparando
        if (pedidoExistente.estado === "listo") {
            const newMenuItems = await MenuItem.find({ _id: { $in: items.map((i: any) => i.menuItemId) } }, "categoria").lean<any[]>();
            const tieneComida = newMenuItems.some((m: any) => !BEBIDAS_CATS.has((m.categoria || "").toUpperCase()));
            if (tieneComida) pedidoExistente.estado = "preparando";
        }

        await pedidoExistente.save();

        return NextResponse.json({ ok: true, pedido: pedidoExistente, accion: "agregado" });
    } catch (err) {
        console.error("[autoservicio/pedido POST]", err);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
