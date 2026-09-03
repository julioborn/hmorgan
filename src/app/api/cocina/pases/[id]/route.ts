import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { PaseCocina } from "@/models/PaseCocina";
import jwt from "jsonwebtoken";

const SECRET = process.env.NEXTAUTH_SECRET!;

function authCocina(req: NextRequest) {
    const token = req.cookies.get("session")?.value;
    if (!token) return null;
    try {
        const p = jwt.verify(token, SECRET) as any;
        if (!["cocina", "empleado", "admin", "superadmin"].includes(p.role)) return null;
        return p;
    } catch { return null; }
}

// PATCH — marcar pase completo como listo, o un ítem individual
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
    const payload = authCocina(req);
    if (!payload) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    await connectMongoDB();

    const pase = await PaseCocina.findById(params.id);
    if (!pase) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    const { accion, itemId } = await req.json();

    if (accion === "itemListo" && itemId) {
        const item = (pase.items as any[]).find((i: any) => i._id.toString() === itemId);
        if (item) item.listo = true;
        const todosListos = (pase.items as any[]).every((i: any) => i.listo);
        if (todosListos) pase.estado = "listo";
        await pase.save();
        return NextResponse.json({ ok: true, todosListos, pase });
    }

    // Marcar todo el pase como listo
    pase.estado = "listo";
    for (const it of pase.items as any[]) it.listo = true;
    await pase.save();
    return NextResponse.json({ ok: true, pase });
}
