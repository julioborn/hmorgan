import { Schema, model, models } from "mongoose";

const CajaSessionSchema = new Schema({
    estado: { type: String, enum: ["abierta", "cerrada"], default: "abierta" },
    montoInicial: { type: Number, default: 0 },
    montoCierre: { type: Number },
    abiertaPor: { type: Schema.Types.ObjectId, ref: "User", required: true },
    cerradaPor: { type: Schema.Types.ObjectId, ref: "User" },
    fechaApertura: { type: Date, default: Date.now },
    fechaCierre: { type: Date },
    notas: { type: String },
}, { timestamps: true });

export const CajaSession = models.CajaSession || model("CajaSession", CajaSessionSchema);
