import connectDB from "@/lib/mongoose";
import { ChatModel } from "@/models/Chat";
import { UserModel } from "@/models/User";
import crypto from "crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "plotfolio_session";

async function getSessionUserId(): Promise<string | null> {
	const cookieStore = await cookies();
	const session = cookieStore.get(SESSION_COOKIE)?.value;
	if (!session) return null;
	const [, userId] = session.split(":");
	return userId || null;
}

// GET /api/chat — list all conversations for the current user
export async function GET() {
	try {
		const userId = await getSessionUserId();
		if (!userId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		await connectDB();

		const chats = await ChatModel.find({ "participants.id": userId })
			.sort({ lastMessageAt: -1 })
			.lean();

		const summaries = chats.map((chat: any) => {
			const { messages, _id, __v, ...rest } = chat;
			const lastMessage = messages[messages.length - 1] ?? null;
			const unreadCount = messages.filter(
				(m: any) => !m.readBy?.includes(userId) && m.senderId !== userId,
			).length;
			return {
				...rest,
				lastMessage: lastMessage
					? {
							body: lastMessage.body,
							senderId: lastMessage.senderId,
							createdAt: lastMessage.createdAt,
						}
					: null,
				unreadCount,
			};
		});

		return NextResponse.json({ chats: summaries });
	} catch (error) {
		console.error("Error fetching chats:", error);
		return NextResponse.json(
			{ error: "Failed to fetch chats" },
			{ status: 500 },
		);
	}
}

// POST /api/chat — start or find an existing conversation
// Body: { recipientId, propertyId?, propertyTitle?, propertyImage?, initialMessage? }
export async function POST(request: NextRequest) {
	try {
		const userId = await getSessionUserId();
		if (!userId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const body = await request.json();
		const {
			recipientId,
			propertyId,
			propertyTitle,
			propertyImage,
			initialMessage,
		} = body;

		if (!recipientId) {
			return NextResponse.json(
				{ error: "recipientId is required" },
				{ status: 400 },
			);
		}

		if (userId === recipientId) {
			return NextResponse.json(
				{ error: "Cannot start a chat with yourself" },
				{ status: 400 },
			);
		}

		await connectDB();

		// Look up both users
		const [sender, recipient] = await Promise.all([
			UserModel.findOne({ id: userId }).lean(),
			UserModel.findOne({ id: recipientId }).lean(),
		]);

		if (!sender || !recipient) {
			return NextResponse.json({ error: "User not found" }, { status: 404 });
		}

		// Find existing chat between these two participants (optionally scoped to property)
		const existingQuery: Record<string, unknown> = {
			"participants.id": { $all: [userId, recipientId] },
			$expr: { $eq: [{ $size: "$participants" }, 2] },
		};
		if (propertyId) {
			existingQuery.propertyId = propertyId;
		}

		let chat = (await ChatModel.findOne(existingQuery).lean()) as any;

		if (!chat) {
			const senderParticipant = {
				id: (sender as any).id,
				name: (sender as any).name,
				displayName: (sender as any).displayName,
				username: (sender as any).username,
				avatar: (sender as any).avatar,
			};
			const recipientParticipant = {
				id: (recipient as any).id,
				name: (recipient as any).name,
				displayName: (recipient as any).displayName,
				username: (recipient as any).username,
				avatar: (recipient as any).avatar,
			};

			const newChatData: Record<string, unknown> = {
				id: crypto.randomUUID(),
				participants: [senderParticipant, recipientParticipant],
				messages: [],
				lastMessageAt: new Date().toISOString(),
			};
			if (propertyId) {
				newChatData.propertyId = propertyId;
				if (propertyTitle) newChatData.propertyTitle = propertyTitle;
				if (propertyImage) newChatData.propertyImage = propertyImage;
			}

			chat = await ChatModel.create(newChatData);
			chat = chat.toObject();
		}

		// Send the initial message if provided
		if (initialMessage?.trim()) {
			const msg = {
				id: crypto.randomUUID(),
				senderId: userId,
				senderName: (sender as any).displayName,
				senderAvatar: (sender as any).avatar,
				body: initialMessage.trim(),
				createdAt: new Date().toISOString(),
				readBy: [userId],
			};
			await ChatModel.updateOne(
				{ id: chat.id },
				{
					$push: { messages: msg },
					$set: { lastMessageAt: msg.createdAt },
				},
			);
			chat.messages = [...(chat.messages ?? []), msg];
			chat.lastMessageAt = msg.createdAt;
		}

		return NextResponse.json({ chat }, { status: 201 });
	} catch (error) {
		console.error("Error creating chat:", error);
		return NextResponse.json(
			{ error: "Failed to create chat" },
			{ status: 500 },
		);
	}
}
