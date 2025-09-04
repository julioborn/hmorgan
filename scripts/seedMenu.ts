import "dotenv/config";
import { connectMongoDB } from "@/lib/mongodb";
import { MenuItem } from "@/models/MenuItem";
import fs from "fs";
import path from "path";

async function seed() {
    try {
        await connectMongoDB();

        const filePath = path.join(process.cwd(), "menu_completo.json");
        const rawData = fs.readFileSync(filePath, "utf-8");
        const data = JSON.parse(rawData);

        await MenuItem.deleteMany({});
        console.log("🗑️ Colección 'menus' vaciada.");

        await MenuItem.insertMany(data);
        console.log(`✅ Menú cargado exitosamente con ${data.length} ítems.`);

        process.exit(0);
    } catch (error) {
        console.error("❌ Error al cargar el menú:", error);
        process.exit(1);
    }
}

seed();
