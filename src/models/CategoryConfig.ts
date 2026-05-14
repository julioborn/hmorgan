import mongoose, { Schema, model, models, Model } from "mongoose";

const CategoryConfigSchema = new Schema(
    {
        categoria: { type: String, required: true, unique: true },
        imageUrl: { type: String, default: "" },
        imagePosition: { type: String, default: "50% 50%" },
    },
    { timestamps: true }
);

export const CategoryConfig: Model<any> =
    models.CategoryConfig || model("CategoryConfig", CategoryConfigSchema, "categoryconfigs");
