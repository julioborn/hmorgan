// src/app/api/auth/request-reset/route.ts
import { NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import crypto from "crypto";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
    await connectMongoDB();
    const { email } = await req.json();

    if (!email) {
        return NextResponse.json({ error: "Email requerido" }, { status: 400 });
    }

    const user = await User.findOne({ email });
    if (!user) {
        return NextResponse.json({ ok: true }); // 👈 no decimos "no existe", para seguridad
    }

    // generar token único
    const token = crypto.randomBytes(32).toString("hex");
    user.resetToken = token;
    user.resetTokenExp = new Date(Date.now() + 1000 * 60 * 15); // 15 min
    await user.save();

    // enviar mail
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

    const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`;

    await transporter.sendMail({
        from: `"H Morgan Bar" <${process.env.SMTP_USER}>`,
        to: user.email,
        subject: "Recuperar contraseña",
        html: `
      <p>Hola ${user.nombre},</p>
      <p>Has solicitado cambiar tu contraseña. Haz clic en el siguiente enlace:</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>Este enlace caduca en 1 hora.</p>
    `,
    });

    return NextResponse.json({ ok: true });
}
