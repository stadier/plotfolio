import { Follow } from "@/types/property";
import mongoose, { Document, Schema } from "mongoose";

const FollowSchema = new Schema<Follow & Document>(
	{
		id: { type: String, required: true, unique: true },
		followerId: { type: String, required: true, index: true },
		followingId: { type: String, required: true, index: true },
	},
	{ timestamps: true },
);

// Prevent duplicate follows
FollowSchema.index({ followerId: 1, followingId: 1 }, { unique: true });

export const FollowModel =
	mongoose.models.Follow ||
	mongoose.model<Follow & Document>("Follow", FollowSchema);
