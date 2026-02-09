// models/User.ts 
import mongoose, { Schema, Document } from "mongoose";

const PushSubscriptionSchema = new Schema(
  {
    endpoint: { type: String, required: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
  },
  { _id: false }
);

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;

  username: string;
  nombre: string;
  apellido: string;

  dni?: string;
  telefono?: string;
  email?: string;

  // ✅ ESTO FALTABA (está en el Schema)
  fechaNacimiento?: Date;
  direccion?: string;

  passwordHash: string;
  role: "cliente" | "admin";

  tokenFCM?: string;

  qrToken: string;
  puntos: number;

  resetToken?: string;
  resetTokenExp?: Date;

  // 🔔 PUSH
  pushSubscriptions?: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  }[];

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

  tokenFCM: { type: String, default: undefined },

  resetToken: { type: String, default: undefined },
  resetTokenExp: { type: Date, default: undefined },

  role: { type: String, enum: ["cliente", "admin"], required: true },

  qrToken: { type: String, required: true },
  puntos: { type: Number, default: 0 },

  pushSubscriptions: {
    type: [PushSubscriptionSchema],
    default: [],
  },

  needsReview: { type: Boolean, default: false },
});

// 🧨 Forzar recarga del modelo
delete mongoose.models.User;

export const User = mongoose.model<IUser>("User", UserSchema);
