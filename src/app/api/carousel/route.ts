import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { CarouselImage } from "@/models/CarouselImage";
import { writeFile } from "fs/promises";
import { readdir } from "fs/promises";
import path from "path";

const CAROUSEL_DIR = path.join(process.cwd(), "public", "imagenes-carrousel");

async function seedIfEmpty() {
    const count = await CarouselImage.countDocuments();
    if (count > 0) return;

    let files: string[] = [];
    try {
        files = await readdir(CAROUSEL_DIR);
        files = files.filter((f) => /\.(jpe?g|png|webp|gif)$/i.test(f));
    } catch {
        return;
    }

    const seeds = files.map((filename, i) => ({
        filename,
        url: `/imagenes-carrousel/${filename}`,
        orden: i,
    }));
    if (seeds.length > 0) await CarouselImage.insertMany(seeds);
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
    const filename = `carrousel_${Date.now()}.${ext}`;
    const filePath = path.join(CAROUSEL_DIR, filename);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    const last = await CarouselImage.findOne().sort({ orden: -1 }).lean() as any;
    const orden = last ? last.orden + 1 : 0;

    const image = await CarouselImage.create({
        filename,
        url: `/imagenes-carrousel/${filename}`,
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
