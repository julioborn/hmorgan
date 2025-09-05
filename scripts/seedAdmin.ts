import "dotenv/config";
import { connectMongoDB } from "../src/lib/mongodb.js";
import { User } from "../src/models/User.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

async function main() {
  const dni = process.env.ADMIN_DNI || "00000000";
  const nombre = process.env.ADMIN_NOMBRE || "Admin";
  const apellido = process.env.ADMIN_APELLIDO || "Bar";
  const telefono = process.env.ADMIN_TELEFONO || "+54 9 0000-000000";
  const password = process.env.ADMIN_PASSWORD || "admin123";

  await connectMongoDB();

  let user = await User.findOne({ dni });
  if (!user) {
    user = await User.create({
      nombre, apellido, dni, telefono,
      passwordHash: await bcrypt.hash(password, 10),
      role: "admin",
      qrToken: crypto.randomUUID(),
      puntos: 0,
    });
    console.log("Admin creado:", user._id.toString(), "DNI:", dni);
  } else {
    user.nombre = nombre;
    user.apellido = apellido;
    user.telefono = telefono;
    user.passwordHash = await bcrypt.hash(password, 10);
    user.role = "admin";
    await user.save();
    console.log("Admin actualizado:", user._id.toString(), "DNI:", dni);
  }
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
