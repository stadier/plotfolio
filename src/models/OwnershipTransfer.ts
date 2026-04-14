import { OwnershipTransfer, TransferStatus } from "@/types/property";
import mongoose, { Document, Schema } from "mongoose";

const OwnershipTransferSchema = new Schema<OwnershipTransfer & Document>(
	{
		id: { type: String, required: true, unique: true },
		propertyId: { type: String, required: true, index: true },
		propertyName: { type: String, required: true },
		fromUserId: { type: String, required: true, index: true },
		fromName: { type: String, required: true },
		fromEmail: { type: String, required: true },
		fromAvatar: { type: String },
		toUserId: { type: String, index: true },
		toName: { type: String, required: true },
		toEmail: { type: String, required: true },
		toAvatar: { type: String },
		status: {
			type: String,
			enum: Object.values(TransferStatus),
			default: TransferStatus.PENDING,
		},
		message: { type: String },
		responseMessage: { type: String },
		transferDate: { type: String },
		price: { type: Number, default: 0 },
		documentIds: [{ type: String }],
	},
	{ timestamps: true },
);

export const OwnershipTransferModel =
	mongoose.models.OwnershipTransfer ||
	mongoose.model<OwnershipTransfer & Document>(
		"OwnershipTransfer",
		OwnershipTransferSchema,
	);
