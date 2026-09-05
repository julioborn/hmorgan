import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { Pedido } from "@/models/Pedido";
import { MenuItem } from "@/models/MenuItem";
import jwt from "jsonwebtoken";

const SECRET = process.env.NEXTAUTH_SECRET!;
const BEBIDAS_CATS = new Set(["CERVEZAS","VINOS","GASEOSAS","JARROS","COCKTAILS","WHISKY","MEDIDAS"]);

function authCocina(req: NextRequest) {
    const token = req.cookies.get("session")?.value;
    if (!token) return null;
    try {
        const p = jwt.verify(token, SECRET) as any;
        if (!["cocina","empleado","admin","superadmin"].includes(p.role)) return null;
        return p;
    } catch { return null; }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
    const payload = authCocina(req);
    if (!payload) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    await connectMongoDB();

    const pedido = await Pedido.findById(params.id);
    if (!pedido) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    const { accion, itemId } = await req.json();

    // Determinar cuáles ítems son comida
    const allItemIds = (pedido.items as any[]).map((it: any) => it.menuItemId?.toString()).filter(Boolean);
    const menuItems = await MenuItem.find({ _id: { $in: allItemIds } }, "categoria").lean<any[]>();
    const catMap = new Map(menuItems.map(m => [m._id.toString(), (m.categoria || "").toUpperCase()]));
    const esComida = (menuItemId: string) => !BEBIDAS_CATS.has(catMap.get(menuItemId) || "");

    if (accion === "itemListo" && itemId) {
        const item = (pedido.items as any[]).find((i: any) => i._id.toString() === itemId);
        if (item) item.listo = true;
        const todosListos = (pedido.items as any[])
            .filter((i: any) => esComida(i.menuItemId?.toString()))
            .every((i: any) => i.listo);
        if (todosListos) pedido.estado = "listo";
        await pedido.save();
        return NextResponse.json({ ok: true, todosListos });
    }

    if (accion === "itemDeshacer" && itemId) {
        const item = (pedido.items as any[]).find((i: any) => i._id.toString() === itemId);
        if (item) item.listo = false;
        if (pedido.estado === "listo") pedido.estado = "preparando";
        await pedido.save();
        return NextResponse.json({ ok: true });
    }

    if (accion === "volverPreparando") {
        for (const it of pedido.items as any[]) it.listo = false;
        pedido.estado = "preparando";
        await pedido.save();
        return NextResponse.json({ ok: true });
    }

    // Marcar todos los ítems de comida como listos
    for (const it of pedido.items as any[]) {
        if (esComida(it.menuItemId?.toString())) it.listo = true;
    }
    pedido.estado = "listo";
    await pedido.save();
    return NextResponse.json({ ok: true, todosListos: true });
}
