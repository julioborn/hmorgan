import { NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { Reward } from "@/models/Reward";

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
