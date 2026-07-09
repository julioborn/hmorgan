import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { CarouselImage } from "@/models/CarouselImage";
import { admin } from "@/lib/firebase-admin";

async function seedIfEmpty() {
    const count = await CarouselImage.countDocuments();
    if (count > 0) return;
    // No filesystem seed on Vercel — skip if no docs exist
}

export async function GET() {
    await connectMongoDB();
    await seedIfEmpty();
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

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const filename = `imagenes-carrousel/carrousel_${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const bucket = admin.storage().bucket();
    const storageFile = bucket.file(filename);

    await storageFile.save(buffer, {
        metadata: { contentType: file.type || `image/${ext}` },
    });
    await storageFile.makePublic();

    const url = `https://storage.googleapis.com/${bucket.name}/${filename}`;

    const last = await CarouselImage.findOne().sort({ orden: -1 }).lean() as any;
    const orden = last ? last.orden + 1 : 0;

    const image = await CarouselImage.create({
        filename,
        url,
        orden,
    });

    return NextResponse.json(image, { status: 201 });
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
