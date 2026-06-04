import { createRequire } from "module";
const require = createRequire(import.meta.url);
import { randomBytes } from "crypto";

const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/hmorgan";

async function main() {
    const mongoose = (await import("mongoose")).default;
    const bcrypt = (await import("bcryptjs")).default;

    await mongoose.connect(MONGO_URI);
    console.log("✅ Conectado a MongoDB");

    const UserModel = mongoose.models.User || (await import("../src/models/User.js")).User;

    const existing = await UserModel.findOne({ username: "superadmin" });
    if (existing) {
        console.log("⚠️  El usuario superadmin ya existe. Actualizando contraseña...");
        existing.passwordHash = await bcrypt.hash("hmorgan2025!", 10);
        await existing.save();
        console.log("✅ Contraseña actualizada");
    } else {
        await UserModel.create({
            username: "superadmin",
            nombre: "Super",
            apellido: "Admin",
            passwordHash: await bcrypt.hash("hmorgan2025!", 10),
            role: "superadmin",
            qrToken: randomBytes(16).toString("hex"),
            puntos: 0,
        });
        console.log("✅ Usuario superadmin creado");
    }

    console.log("\n  Usuario: superadmin");
    console.log("  Contraseña: hmorgan2025!\n");

    await mongoose.disconnect();
}

main().catch(console.error);
