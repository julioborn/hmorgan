import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { PointTransaction } from "@/models/PointTransaction";
import { User } from "@/models/User";
import jwt from "jsonwebtoken";

const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET!;

export async function GET(req: NextRequest) {
    try {
        const token = req.cookies.get("session")?.value;
        if (!token)
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });

        const payload = jwt.verify(token, NEXTAUTH_SECRET) as any;

        const STAFF_ROLES = ["cajero", "empleado", "cocina", "delivery", "admin", "superadmin"];
        if (STAFF_ROLES.includes(payload.role))
            return NextResponse.json({ tx: null });

        await connectMongoDB();

        const tx = await PointTransaction.findOne({
            userId: payload.sub,
            pendingReview: true,
        })
            .sort({ createdAt: -1 })
            .lean() as any;

        let mozoNombre: string | null = null;
        if (tx?.meta?.mozoId) {
            const mozo = await User.findById(tx.meta.mozoId).select("nombre apellido").lean() as any;
            if (mozo) mozoNombre = [mozo.nombre, mozo.apellido].filter(Boolean).join(" ");
        }

        return NextResponse.json({ tx, mozoNombre });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Error" }, { status: 500 });
    }
}
