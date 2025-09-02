import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { requireAdmin } from "@/lib/require-admin";

export async function GET(req: NextRequest) {
    await connectMongoDB();
    await requireAdmin(req);

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const sortParam = (searchParams.get("sort") || "apellido:asc").toLowerCase();

    const [sortField, sortDir] = (sortParam.includes(":") ? sortParam.split(":") : [sortParam, "asc"]) as [string, "asc" | "desc"];
    const sort: Record<string, 1 | -1> = {};
    if (["nombre", "apellido", "dni", "points"].includes(sortField)) {
        sort[sortField] = sortDir === "desc" ? -1 : 1;
    } else {
        sort["apellido"] = 1;
    }

    // ⚠️ Solo clientes: soportá 'cliente' y 'clientes'
    const filter: any = { role: { $in: ["cliente", "clientes"] } };
    if (q) {
        filter.$or = [
            { nombre: { $regex: q, $options: "i" } },
            { apellido: { $regex: q, $options: "i" } },
            { dni: { $regex: q, $options: "i" } },
        ];
    }

    const [items, total] = await Promise.all([
        User.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).lean(),
        User.countDocuments(filter),
    ]);

    return NextResponse.json({
        items: items.map((u: any) => ({
            id: String(u._id),
            nombre: u.nombre,
            apellido: u.apellido,
            dni: u.dni,
            telefono: u.telefono,
            points: u.points ?? 0,
            qrToken: u.qrToken,
        })),
        total,
    });
}
