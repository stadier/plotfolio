import { OwnershipRecord } from "@/types/property";
import mongoose, { Document, Schema } from "mongoose";

const OwnershipRecordSchema = new Schema<OwnershipRecord & Document>(
	{
		id: { type: String, required: true, unique: true },
		propertyId: { type: String, required: true, index: true },
		ownerId: { type: String, index: true },
		ownerName: { type: String, required: true },
		ownerEmail: { type: String },
		ownerAvatar: { type: String },
		ownerType: {
			type: String,
			enum: ["individual", "company", "trust", "government", "external"],
			required: true,
		},
		acquiredDate: { type: String },
		transferredDate: { type: String },
		acquisitionMethod: {
			type: String,
			enum: [
				"purchase",
				"inheritance",
				"gift",
				"government_grant",
				"development",
				"transfer",
				"other",
			],
			required: true,
		},
		price: { type: Number, default: 0 },
		notes: { type: String },
		transferId: { type: String },
	},
	{ timestamps: true },
);

export const OwnershipRecordModel =
	mongoose.models.OwnershipRecord ||
	mongoose.model<OwnershipRecord & Document>(
		"OwnershipRecord",
		OwnershipRecordSchema,
	);
