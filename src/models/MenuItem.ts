import { Schema, model, models, Model } from "mongoose";

const MenuItemSchema = new Schema({
    nombre: { type: String, required: true },
    descripcion: String,
    precio: { type: Number, required: true },
    categoria: { type: String, required: true },
    imagen: String,
    activo: { type: Boolean, default: true },
    ruleta: { type: Boolean, default: false }, // 👈 nuevo campo
});

export const MenuItem: Model<any> = models.MenuItem || model("MenuItem", MenuItemSchema);
