import mongoose, { Schema, model, models, Model } from "mongoose";

const CarouselImageSchema = new Schema(
    {
        filename: { type: String, required: true },
        url: { type: String, required: true },
        orden: { type: Number, default: 0 },
    },
    { timestamps: true }
);

export const CarouselImage: Model<any> =
    models.CarouselImage || model("CarouselImage", CarouselImageSchema, "carouselimages");
