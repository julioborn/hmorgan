import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { Pedido } from "@/models/Pedido";
import { MenuItem } from "@/models/MenuItem";
import jwt from "jsonwebtoken";

const SECRET = process.env.NEXTAUTH_SECRET!;

const ROLES_EDITAN_PEDIDO = ["empleado", "cajero", "admin", "superadmin"];

async function recalcularTotal(items: { menuItemId: any; cantidad: number }[]) {
    const menuItems = await MenuItem.find({ _id: { $in: items.map(i => i.menuItemId) } });
    return items.reduce((acc, i) => {
        const item = menuItems.find((m: any) => m._id.toString() === i.menuItemId.toString());
        return acc + (item?.precio || 0) * i.cantidad;
    }, 0);
}

// PATCH — agrega, edita o elimina ítems de una comanda existente (mozo/cajero)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
    const token = req.cookies.get("session")?.value;
    if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    let payload: any;
    try { payload = jwt.verify(token, SECRET) as any; } catch {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (!ROLES_EDITAN_PEDIDO.includes(payload.role)) {
        return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    await connectMongoDB();

    const pedido = await Pedido.findById(params.id);
    if (!pedido) return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
    if (["cerrado", "cancelado"].includes(pedido.estado)) {
        return NextResponse.json({ error: "El pedido ya está cerrado" }, { status: 400 });
    }

    const body = await req.json();

    // ── Eliminar un ítem de la comanda ──────────────────────────────────────
    if (body.accion === "eliminarItem") {
        const { itemId } = body;
        const items = (pedido.items as any[]).filter(i => i._id.toString() !== itemId);
        pedido.items = items;
        pedido.total = await recalcularTotal(items);
        await pedido.save();
        return NextResponse.json({ ok: true, pedido });
    }

    // ── Reemplazar el producto de un ítem (mismo lugar, otro producto) ─────
    if (body.accion === "reemplazarItem") {
        const { itemId, nuevoMenuItemId } = body;
        const item = (pedido.items as any[]).find(i => i._id.toString() === itemId);
        if (!item) return NextResponse.json({ error: "Ítem no encontrado" }, { status: 404 });
        item.menuItemId = nuevoMenuItemId;
        pedido.total = await recalcularTotal(pedido.items as any[]);
        await pedido.save();
        return NextResponse.json({ ok: true, pedido });
    }

    // ── Marcar ítems como ya impresos en BARRA/COCINA ───────────────────────
    if (body.accion === "marcarImpreso") {
        const { itemIds } = body;
        const idSet = new Set<string>(itemIds || []);
        for (const it of pedido.items as any[]) {
            if (idSet.has(it._id.toString())) it.impreso = true;
        }
        await pedido.save();
        return NextResponse.json({ ok: true, pedido });
    }

    // ── Agregar ítems nuevos a la comanda (default) ─────────────────────────
    const { items, notaEmpleado } = body;
    if (!items?.length) return NextResponse.json({ error: "Sin ítems" }, { status: 400 });

    // Cada agregado queda como línea propia (no se fusiona con lo existente) y marcado
    // como "no impreso" para que la caja lo detecte y lo imprima individual en BARRA/COCINA.
    const updatedItems = [...pedido.items] as any[];
    for (const newItem of items) {
        updatedItems.push({ menuItemId: newItem.menuItemId, cantidad: newItem.cantidad, impreso: false });
    }

    pedido.items = updatedItems;
    pedido.total = await recalcularTotal(updatedItems);
    if (notaEmpleado) pedido.notaEmpleado = notaEmpleado;
    await pedido.save();

    return NextResponse.json({ ok: true, pedido });
}

// GET — obtiene un pedido por ID (empleado/admin/superadmin)
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    const token = req.cookies.get("session")?.value;
    if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    let payload: any;
    try { payload = jwt.verify(token, SECRET) as any; } catch {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    await connectMongoDB();

    const pedido = await Pedido.findById(params.id)
        .populate("items.menuItemId", "nombre precio categoria")
        .lean();

    if (!pedido) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    return NextResponse.json(pedido);
}
