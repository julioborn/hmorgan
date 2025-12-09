// models/User.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId; // 👈 agregar esto

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

  needsReview?: boolean;
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
    tokenFCM: { type: String },

    email: { type: String },
    fechaNacimiento: { type: Date },
    direccion: { type: String },

    resetToken: { type: String },
    resetTokenExp: { type: Date },

    needsReview: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// 🧨 Forzar recarga del modelo
delete mongoose.models.User;

export const User = mongoose.model<IUser>("User", UserSchema);
