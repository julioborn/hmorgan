import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { Reward } from "@/models/Reward";

export async function PATCH(
    _req: NextRequest,
    { params }: { params: { id: string } }
) {
    await connectMongoDB();
    const reward = await Reward.findById(params.id);
    if (!reward) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    reward.activo = !reward.activo;
    await reward.save();
    return NextResponse.json(reward);
}

export async function DELETE(
    _req: Request,
    { params }: { params: { id: string } }
) {
    try {
        await connectMongoDB();

        const deleted = await Reward.findByIdAndDelete(params.id);

        if (!deleted) {
            return NextResponse.json(
                { error: "Canje no encontrado" },
                { status: 404 }
            );
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        return NextResponse.json(
            { error: "Error eliminando canje" },
            { status: 500 }
        );
    }
}
