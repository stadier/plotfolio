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

// GET /api/chat/[id] — fetch a single conversation with all messages
export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const userId = await getSessionUserId();
		if (!userId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { id } = await params;
		await connectDB();

		const chat = (await ChatModel.findOne({ id }).lean()) as any;
		if (!chat) {
			return NextResponse.json({ error: "Chat not found" }, { status: 404 });
		}

		// Ensure user is a participant
		const isParticipant = chat.participants?.some((p: any) => p.id === userId);
		if (!isParticipant) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}

		// Mark all messages as read by this user
		await ChatModel.updateOne(
			{ id },
			{ $addToSet: { "messages.$[elem].readBy": userId } },
			{ arrayFilters: [{ "elem.senderId": { $ne: userId } }] },
		);

		const { _id, __v, ...rest } = chat;
		return NextResponse.json({ chat: rest });
	} catch (error) {
		console.error("Error fetching chat:", error);
		return NextResponse.json(
			{ error: "Failed to fetch chat" },
			{ status: 500 },
		);
	}
}

// POST /api/chat/[id]/messages — handled by the sub-route, but also support here
// POST /api/chat/[id] — send a message
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const userId = await getSessionUserId();
		if (!userId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { id } = await params;
		const body = await request.json();
		const { message } = body;

		if (!message?.trim()) {
			return NextResponse.json(
				{ error: "message is required" },
				{ status: 400 },
			);
		}

		await connectDB();

		const chat = (await ChatModel.findOne({ id }).lean()) as any;
		if (!chat) {
			return NextResponse.json({ error: "Chat not found" }, { status: 404 });
		}

		const isParticipant = chat.participants?.some((p: any) => p.id === userId);
		if (!isParticipant) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}

		const sender = (await UserModel.findOne({ id: userId }).lean()) as any;
		if (!sender) {
			return NextResponse.json({ error: "User not found" }, { status: 404 });
		}

		const msg = {
			id: crypto.randomUUID(),
			senderId: userId,
			senderName: sender.displayName,
			senderAvatar: sender.avatar,
			body: message.trim(),
			createdAt: new Date().toISOString(),
			readBy: [userId],
		};

		await ChatModel.updateOne(
			{ id },
			{
				$push: { messages: msg },
				$set: { lastMessageAt: msg.createdAt },
			},
		);

		return NextResponse.json({ message: msg }, { status: 201 });
	} catch (error) {
		console.error("Error sending message:", error);
		return NextResponse.json(
			{ error: "Failed to send message" },
			{ status: 500 },
		);
	}
}
