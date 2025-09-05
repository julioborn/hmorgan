import mongoose, { Schema, model, Document } from "mongoose";

export type Role = "cliente" | "admin";

export interface IPushSub {
  endpoint: string;
  keys?: { p256dh?: string; auth?: string };
}

// 👇 extendemos de Document para que Mongoose reconozca _id, createdAt, updatedAt
export interface IUser extends Document {
  nombre: string;
  apellido: string;
  dni: string;
  telefono: string;
  passwordHash: string;
  role: Role;
  qrToken: string;
  points: number;
  pushSubscriptions: IPushSub[];
  createdAt: Date;
  updatedAt: Date;
}

const pushSubSchema = new Schema<IPushSub>(
  {
    endpoint: { type: String, required: true },
    keys: {
      p256dh: { type: String },
      auth: { type: String },
    },
  },
  { _id: false }
);

const userSchema = new Schema<IUser>(
  {
    nombre: { type: String, required: true, trim: true },
    apellido: { type: String, required: true, trim: true },
    dni: { type: String, required: true, unique: true, index: true },
    telefono: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["cliente", "admin"], default: "cliente" },
    qrToken: { type: String, required: true, unique: true, index: true },
    points: { type: Number, default: 0 },
    pushSubscriptions: { type: [pushSubSchema], default: [] },
  },
  { timestamps: true }
);

export const User =
  mongoose.models.User || model<IUser>("User", userSchema);
