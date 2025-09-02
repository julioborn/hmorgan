// src/app/api/admin/clientes/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { requireAdmin } from "@/lib/require-admin";

type Params = { params: { id: string } };

// 👇 Tipo mínimo para el JSON que devolvés
type UserLean = {
    _id: any;
    nombre: string;
    apellido: string;
    dni: string;
    telefono?: string;
    points?: number;
    qrToken?: string;
};

export async function PUT(req: NextRequest, { params }: Params) {
    await connectMongoDB();
    await requireAdmin(req);

    const id = params.id;
    let body: any;
    try { body = await req.json(); }
    catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }); }

    const update: any = {};
    if (typeof body.nombre === "string") update.nombre = body.nombre.trim();
    if (typeof body.apellido === "string") update.apellido = body.apellido.trim();
    if (typeof body.dni === "string") update.dni = body.dni.trim();
    if (typeof body.telefono === "string") update.telefono = body.telefono.trim();
    if (typeof body.points !== "undefined") {
        const p = Number(body.points);
        if (!Number.isFinite(p)) return NextResponse.json({ error: "points inválido" }, { status: 400 });
        update.points = p;
    }

    const doc = await User.findByIdAndUpdate(id, { $set: update }, { new: true })
        .select("_id nombre apellido dni telefono points qrToken") // opcional, aclara campos
        .lean<UserLean>();                                         // 👈 tipa el resultado

    if (!doc) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    return NextResponse.json({
        ok: true,
        client: {
            id: String(doc._id),
            nombre: doc.nombre,
            apellido: doc.apellido,
            dni: doc.dni,
            telefono: doc.telefono,
            points: doc.points ?? 0,
            qrToken: doc.qrToken,
        },
    });
}

export async function DELETE(req: NextRequest, { params }: Params) {
    await connectMongoDB();
    await requireAdmin(req);

    const id = params.id;
    const r = await User.deleteOne({ _id: id });
    if (!r.deletedCount) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    return NextResponse.json({ ok: true });
}
