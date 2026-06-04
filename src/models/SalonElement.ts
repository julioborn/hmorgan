import { Schema, model, models } from "mongoose";

const SalonElementSchema = new Schema({
    tipo: { type: String, enum: ["puerta", "linea_h", "linea_v", "zona"], required: true },
    label: { type: String, default: "" },
    x: { type: Number, default: 50 },
    y: { type: Number, default: 50 },
    ancho: { type: Number, default: 8 },
    alto: { type: Number, default: 4 },
    color: { type: String, default: "#fef3c7" },
}, { timestamps: true });

export const SalonElement = models.SalonElement || model("SalonElement", SalonElementSchema);
