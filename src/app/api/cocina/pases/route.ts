import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { Pedido } from "@/models/Pedido";
import { MenuItem } from "@/models/MenuItem";
import { CajaSession } from "@/models/CajaSession";
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

async function enrichPedidos(pedidos: any[]) {
    if (pedidos.length === 0) return [];
    const allIds = [...new Set(
        pedidos.flatMap(p => p.items.map((it: any) => it.menuItemId?.toString())).filter(Boolean)
    )];
    const menuItems = await MenuItem.find({ _id: { $in: allIds } }, "nombre categoria").lean<any[]>();
    const itemMap = new Map(menuItems.map(m => [m._id.toString(), { nombre: m.nombre, cat: (m.categoria || "").toUpperCase() }]));

    return pedidos.map(p => ({
        ...p,
        items: p.items
            .filter((it: any) => {
                const m = itemMap.get(it.menuItemId?.toString());
                return m && !BEBIDAS_CATS.has(m.cat);
            })
            .map((it: any) => ({
                ...it,
                nombre: itemMap.get(it.menuItemId?.toString())?.nombre ?? "?"
            }))
    })).filter(p => p.items.length > 0);
}

export async function GET(req: NextRequest) {
    const payload = authCocina(req);
    if (!payload) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    await connectMongoDB();

    const estadoParam = req.nextUrl.searchParams.get("estado");

    if (estadoParam === "listo") {
        const sesion = await CajaSession.findOne({ estado: "abierta" }).lean<any>();
        const desde = sesion?.fechaApertura ?? new Date(0);
        const pedidos = await Pedido.find({ estado: "listo", updatedAt: { $gte: desde } })
            .populate("userId", "nombre apellido")
            .sort({ updatedAt: -1 })
            .lean<any[]>();
        const result = await enrichPedidos(pedidos);
        return NextResponse.json(result);
    }

    // Solo preparando: la caja ya los aceptó
    const pedidos = await Pedido.find({ estado: "preparando" })
        .populate("userId", "nombre apellido")
        .sort({ createdAt: 1 })
        .lean<any[]>();
    const result = await enrichPedidos(pedidos);
    return NextResponse.json(result);
}
