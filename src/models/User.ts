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
  puntos: number;
  pushSubscriptions?: any[];
  tokenFCM?: string;

  email?: string;
  fechaNacimiento?: Date;
  direccion?: string;

  resetToken?: string;
  resetTokenExp?: Date;

  needsReview?: boolean; // 🔥 NUEVO
}

const UserSchema = new Schema<IUser>(
  {
    nombre: { type: String, required: true },
    apellido: { type: String, required: true },
    dni: { type: String, required: true, unique: true },
    telefono: { type: String, required: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["cliente", "admin"], required: true },
    qrToken: { type: String, required: true },
    puntos: { type: Number, default: 0 },
    pushSubscriptions: { type: Array, default: [] },

    tokenFCM: { type: String, required: false },

    email: { type: String, required: false },
    fechaNacimiento: { type: Date, required: false },
    direccion: { type: String, required: false },

    resetToken: { type: String, required: false },
    resetTokenExp: { type: Date, required: false },

    // ⭐⭐⭐ Aquí está el nuevo campo
    needsReview: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const User =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
