import { Schema, model, models } from "mongoose";

const InvitacionEventoSchema = new Schema(
    {
        titulo: { type: String, required: true },
        descripcion: { type: String, default: "" },
        fecha: { type: Date, required: true },
        hora: { type: String, default: "" },
        precio: { type: Number, default: 0 },
        imagenUrl: { type: String, default: "" },
        colorFondo: { type: String, default: "#111111" },
        activo: { type: Boolean, default: false },
        tema: { type: String, enum: ["default", "trasnoche"], default: "default" },
        destinatarios: { type: String, enum: ["todos", "seleccionados"], default: "todos" },
        usuariosIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
    },
    { timestamps: true }
);

export const InvitacionEvento = models.InvitacionEvento || model("InvitacionEvento", InvitacionEventoSchema);
