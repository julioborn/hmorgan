import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export async function POST(req: NextRequest) {
    try {
        // Conectar a MongoDB
        await connectMongoDB();

        // Obtenemos los datos del body
        const { nombre, apellido, dni, telefono, password } = await req.json();

        if (!nombre || !apellido || !dni || !telefono || !password) {
            return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
        }

        // Verificamos si ya existe
        const existe = await User.findOne({ dni });
        if (existe) {
            return NextResponse.json({ error: "Ya existe un usuario con este DNI" }, { status: 409 });
        }

        // Hasheamos la contraseña
        const passwordHash = await bcrypt.hash(password, 10);

        // Generamos el QR único
        const qrToken = crypto.randomUUID();

        // Creamos el usuario admin
        const admin = await User.create({
            nombre,
            apellido,
            dni,
            telefono,
            passwordHash,
            role: "admin",
            qrToken,
            points: 0,
        });

        return NextResponse.json({
            ok: true,
            message: "Administrador creado con éxito",
            admin: {
                id: admin._id,
                nombre: admin.nombre,
                apellido: admin.apellido,
                dni: admin.dni,
                telefono: admin.telefono,
                role: admin.role,
            },
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Error creando administrador" }, { status: 500 });
    }
}
