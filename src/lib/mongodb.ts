import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI!;
if (!MONGODB_URI) throw new Error("Falta MONGODB_URI");

let cached = (global as any).mongoose as {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  indexesFixed?: boolean;
};
if (!cached) cached = (global as any).mongoose = { conn: null, promise: null };

export async function connectMongoDB() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, { dbName: "hmorgan" });
  }
  cached.conn = await cached.promise;

  // Elimina índices únicos sin sparse que bloquean registros con campos opcionales vacíos
  if (!cached.indexesFixed) {
    cached.indexesFixed = true;
    try {
      const col = mongoose.connection.db!.collection("users");
      await col.dropIndex("dni_1").catch(() => {});
      await col.dropIndex("email_1").catch(() => {});
    } catch {}
  }

  return cached.conn;
}
