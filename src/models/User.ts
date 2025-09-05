// models/User.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  nombre: string;
  apellido: string;
  dni: string;
  telefono: string;
  passwordHash: string;
  role: "cliente" | "admin";
  qrToken: string;
  puntos: number; // 👈 antes era puntos
  pushSubscriptions?: any[];
}

const UserSchema = new Schema<IUser>({
  nombre: { type: String, required: true },
  apellido: { type: String, required: true },
  dni: { type: String, required: true, unique: true },
  telefono: { type: String, required: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ["cliente", "admin"], required: true },
  qrToken: { type: String, required: true },
  puntos: { type: Number, default: 0 }, // 👈 cambiado
  pushSubscriptions: { type: Array, default: [] },
}, { timestamps: true });

export const User =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
