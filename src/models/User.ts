// models/User.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;

  username: string;

  nombre: string;
  apellido: string;

  dni?: string;
  telefono?: string;
  email?: string;

  fechaNacimiento?: Date;
  direccion?: string;

  passwordHash: string;
  role: "cliente" | "admin";

  qrToken: string;
  puntos: number;

  // ✅ NUEVO (para reset password)
  resetToken?: string;
  resetTokenExp?: Date;

  needsReview?: boolean;
}

const UserSchema = new Schema<IUser>({
  username: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },

  nombre: { type: String, required: true },
  apellido: { type: String, required: true },

  dni: { type: String, sparse: true },
  telefono: { type: String },
  email: { type: String, lowercase: true, unique: true, sparse: true },
  fechaNacimiento: { type: Date },
  direccion: { type: String },

  passwordHash: { type: String, required: true },

  resetToken: { type: String, default: undefined },
  resetTokenExp: { type: Date, default: undefined },

  role: { type: String, enum: ["cliente", "admin"], required: true },

  qrToken: { type: String, required: true },
  puntos: { type: Number, default: 0 },

  needsReview: { type: Boolean, default: false },
});

// 🧨 Forzar recarga del modelo
delete mongoose.models.User;

export const User = mongoose.model<IUser>("User", UserSchema);
