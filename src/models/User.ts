import mongoose, { Schema, model } from "mongoose";

export type Role = "cliente" | "admin";

export interface IUser {
  _id: string;
  nombre: string;
  apellido: string;
  dni: string;
  telefono: string;
  passwordHash: string;
  role: Role;
  qrToken: string;
  points: number;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>({
  nombre: { type: String, required: true, trim: true },
  apellido: { type: String, required: true, trim: true },
  dni: { type: String, required: true, unique: true, index: true },
  telefono: { type: String, required: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ["cliente", "admin"], default: "cliente" },
  qrToken: { type: String, required: true, unique: true, index: true },
  points: { type: Number, default: 0 },
}, { timestamps: true });

export const User = mongoose.models.User || model<IUser>("User", userSchema);