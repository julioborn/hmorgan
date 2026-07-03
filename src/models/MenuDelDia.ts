import mongoose, { Schema, Document } from "mongoose";

export interface IMenuDelDia extends Document {
    titulo: string;
    descripcion: string;
    imagen: string | null;
    precio: number | null;
    activo: boolean;
}

const MenuDelDiaSchema = new Schema<IMenuDelDia>(
    {
        titulo:      { type: String, default: "Menú del Día" },
        descripcion: { type: String, default: "" },
        imagen:      { type: String, default: null },
        precio:      { type: Number, default: null },
        activo:      { type: Boolean, default: false },
    },
    { timestamps: true }
);

export const MenuDelDia = mongoose.models.MenuDelDia ||
    mongoose.model<IMenuDelDia>("MenuDelDia", MenuDelDiaSchema);
