import "dotenv/config";
import { connectMongoDB } from "@/lib/mongodb";
import { MenuItem } from "@/models/MenuItem";

async function run() {
    await connectMongoDB();

    const result = await MenuItem.updateMany(
        { categoria: "COCKTAILS" },
        { $set: { ruleta: true } }
    );

    console.log(`✅ Actualizados ${result.modifiedCount} items a ruleta:true`);
    process.exit(0);
}

run().catch((err) => {
    console.error("❌ Error:", err);
    process.exit(1);
});
