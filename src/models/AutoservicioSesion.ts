import { Schema, model, models } from "mongoose";

const AutoservicioSesionSchema = new Schema(
    {
        mesaId:      { type: Schema.Types.ObjectId, ref: "Mesa", required: true },
        mesaNombre:  { type: String, required: true },
        usuariosIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
        creadoPor:   { type: Schema.Types.ObjectId, ref: "User" },
        estado:      { type: String, enum: ["activa", "cerrada"], default: "activa" },
    },
    { timestamps: true }
);

export const AutoservicioSesion = models.AutoservicioSesion || model("AutoservicioSesion", AutoservicioSesionSchema);
