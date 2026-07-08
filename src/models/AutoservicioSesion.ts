import { Schema, model, models } from "mongoose";

const AutoservicioSesionSchema = new Schema(
    {
        mesasIds:     [{ type: Schema.Types.ObjectId, ref: "Mesa" }],
        mesasNombres: [{ type: String }],
        usuariosIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
        creadoPor:   { type: Schema.Types.ObjectId, ref: "User" },
        estado:      { type: String, enum: ["activa", "cerrada"], default: "activa" },
    },
    { timestamps: true }
);

export const AutoservicioSesion = models.AutoservicioSesion || model("AutoservicioSesion", AutoservicioSesionSchema);
