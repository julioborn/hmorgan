// src/models/Configuracion.ts
import mongoose, { Schema, model, models } from "mongoose";

const ConfiguracionSchema = new Schema({
    clave: { type: String, required: true, unique: true },
    valor: { type: Number, required: true },
});

export default models.Configuracion || model("Configuracion", ConfiguracionSchema);
