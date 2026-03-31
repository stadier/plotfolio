import { Favourite } from "@/types/property";
import mongoose, { Document, Schema } from "mongoose";

const FavouriteSchema = new Schema<Favourite & Document>(
	{
		id: { type: String, required: true, unique: true },
		userId: { type: String, required: true, index: true },
		propertyId: { type: String, required: true, index: true },
	},
	{ timestamps: true },
);

FavouriteSchema.index({ userId: 1, propertyId: 1 }, { unique: true });

export const FavouriteModel =
	mongoose.models.Favourite ||
	mongoose.model<Favourite & Document>("Favourite", FavouriteSchema);
