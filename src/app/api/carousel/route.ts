import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { CarouselImage } from "@/models/CarouselImage";
import { put } from "@vercel/blob";

export async function GET() {
    await connectMongoDB();
    const images = await CarouselImage.find({}).sort({ orden: 1 }).lean();
    return NextResponse.json(images);
}

export async function POST(req: NextRequest) {
    await connectMongoDB();

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
        return NextResponse.json({ error: "No se proporcionó archivo" }, { status: 400 });
    }

    try {
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const filename = `imagenes-carrousel/carrousel_${Date.now()}.${ext}`;

        const blob = await put(filename, file, {
            access: "public",
            contentType: file.type || `image/${ext}`,
        });

        const last = await CarouselImage.findOne().sort({ orden: -1 }).lean() as any;
        const orden = last ? last.orden + 1 : 0;

        const image = await CarouselImage.create({
            filename,
            url: blob.url,
            orden,
        });

        return NextResponse.json(image, { status: 201 });
    } catch (err: any) {
        console.error("[carousel/route] upload error:", err?.message);
        return NextResponse.json({ error: err?.message || "Error al subir imagen" }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    await connectMongoDB();
    const { orden }: { orden: { _id: string; orden: number }[] } = await req.json();

    await Promise.all(
        orden.map(({ _id, orden: o }) =>
            CarouselImage.findByIdAndUpdate(_id, { orden: o })
        )
    );

    return NextResponse.json({ ok: true });
}
