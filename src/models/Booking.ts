import { Booking, BookingStatus, BookingType } from "@/types/property";
import mongoose, { Document, Schema } from "mongoose";

const BookingSchema = new Schema<Booking & Document>(
	{
		id: { type: String, required: true, unique: true },
		ownerId: { type: String, required: true, index: true },
		requesterId: { type: String, required: true, index: true },
		requesterName: { type: String, required: true },
		requesterEmail: { type: String, required: true },
		type: {
			type: String,
			enum: Object.values(BookingType),
			required: true,
		},
		date: { type: String, required: true },
		time: { type: String, required: true },
		message: { type: String },
		status: {
			type: String,
			enum: Object.values(BookingStatus),
			default: BookingStatus.PENDING,
		},
		propertyId: { type: String },
	},
	{ timestamps: true },
);

export const BookingModel =
	mongoose.models.Booking ||
	mongoose.model<Booking & Document>("Booking", BookingSchema);
