import { Schema, model, models } from "mongoose";

const ReservaSchema = new Schema({
    userId:           { type: Schema.Types.ObjectId, ref: "User" },
    nombreContacto:   { type: String },
    telefonoContacto: { type: String },
    fecha:      { type: Date, required: true },
    hora:       { type: String, required: true },
    comensales: { type: Number, required: true, min: 1 },
    zona:       { type: String, enum: ["adentro", "afuera", "indiferente"], default: "indiferente" },
    mesaId:     { type: Schema.Types.ObjectId, ref: "Mesa" },
    estado:     { type: String, enum: ["pendiente", "confirmada", "cancelada"], default: "pendiente" },
    notas:      { type: String },
}, { timestamps: true });

export const Reserva = models.Reserva || model("Reserva", ReservaSchema);
