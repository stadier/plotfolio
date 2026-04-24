import { Chat, ChatMessage, ChatParticipant } from "@/types/chat";
import mongoose, { Document, Schema } from "mongoose";

const ChatParticipantSchema = new Schema<ChatParticipant>(
	{
		id: { type: String, required: true },
		name: { type: String, required: true },
		displayName: { type: String, required: true },
		username: { type: String, required: true },
		avatar: { type: String },
	},
	{ _id: false },
);

const ChatMessageSchema = new Schema<ChatMessage>(
	{
		id: { type: String, required: true },
		senderId: { type: String, required: true },
		senderName: { type: String, required: true },
		senderAvatar: { type: String },
		body: { type: String, required: true },
		createdAt: { type: String, required: true },
		readBy: [{ type: String }],
	},
	{ _id: false },
);

const ChatSchema = new Schema<Chat & Document>(
	{
		id: { type: String, required: true, unique: true },
		participants: { type: [ChatParticipantSchema], required: true },
		propertyId: { type: String },
		propertyTitle: { type: String },
		propertyImage: { type: String },
		messages: { type: [ChatMessageSchema], default: [] },
		lastMessageAt: { type: String, required: true },
	},
	{ timestamps: true },
);

ChatSchema.index({ "participants.id": 1 });
ChatSchema.index({ lastMessageAt: -1 });

export const ChatModel =
	mongoose.models.Chat || mongoose.model<Chat & Document>("Chat", ChatSchema);
