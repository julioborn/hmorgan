import mongoose, { Schema, model, models, Model } from "mongoose";

const MensajeWhatsAppSchema = new Schema({
    mensaje: { type: String, required: true },
});

export const MensajeWhatsApp: Model<any> =
    models.MensajeWhatsApp || model("MensajeWhatsApp", MensajeWhatsAppSchema, "mensajewhatsapp");
