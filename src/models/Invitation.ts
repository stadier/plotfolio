import mongoose, { Document, Schema } from "mongoose";

export interface IInvitation {
	id: string;
	email: string;
	portfolioId: string;
	role: string;
	token: string;
	invitedBy: string;
	status: "pending" | "accepted" | "expired";
	expiresAt: Date;
	createdAt?: string;
	updatedAt?: string;
}

const InvitationSchema = new Schema<IInvitation & Document>(
	{
		id: { type: String, required: true, unique: true },
		email: { type: String, required: true, index: true },
		portfolioId: { type: String, required: true, index: true },
		role: { type: String, required: true },
		token: { type: String, required: true, unique: true },
		invitedBy: { type: String, required: true },
		status: {
			type: String,
			enum: ["pending", "accepted", "expired"],
			default: "pending",
		},
		expiresAt: { type: Date, required: true },
	},
	{ timestamps: true },
);

// Don't allow duplicate pending invitations for the same email + portfolio
InvitationSchema.index(
	{ email: 1, portfolioId: 1, status: 1 },
	{ unique: true, partialFilterExpression: { status: "pending" } },
);

export const InvitationModel =
	mongoose.models.Invitation ||
	mongoose.model<IInvitation & Document>("Invitation", InvitationSchema);
