import { b2, B2_BUCKET } from "@/lib/b2";
import connectDB from "@/lib/mongoose";
import { checkPortfolioAccess, PortfolioModel } from "@/models/Portfolio";
import { PortfolioRole } from "@/types/property";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "plotfolio_session";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export async function PUT(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const cookieStore = await cookies();
		const session = cookieStore.get(SESSION_COOKIE)?.value;
		if (!session) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const [, userId] = session.split(":");
		if (!userId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { id } = await params;
		await connectDB();

		const isAdmin = await checkPortfolioAccess(userId, id, PortfolioRole.ADMIN);
		if (!isAdmin) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}

		const formData = await req.formData();
		const file = formData.get("file") as File | null;

		if (!file) {
			return NextResponse.json({ error: "No file provided" }, { status: 400 });
		}

		if (!ALLOWED_TYPES.includes(file.type as (typeof ALLOWED_TYPES)[number])) {
			return NextResponse.json(
				{ error: "Only JPEG, PNG, and WebP images are allowed" },
				{ status: 400 },
			);
		}

		if (file.size > MAX_FILE_SIZE) {
			return NextResponse.json(
				{ error: "File must be smaller than 5 MB" },
				{ status: 400 },
			);
		}

		const buffer = Buffer.from(await file.arrayBuffer());
		const ext =
			file.type.split("/")[1] === "jpeg" ? "jpg" : file.type.split("/")[1];
		const key = `portfolios/${id}/${Date.now()}.${ext}`;

		await b2.send(
			new PutObjectCommand({
				Bucket: B2_BUCKET,
				Key: key,
				Body: buffer,
				ContentType: file.type,
				CacheControl: "public, max-age=31536000",
			}),
		);

		const avatarUrl = `/api/portfolios/${id}/avatar/view`;

		// Store the B2 key so the proxy view route can fetch it
		const updated = await PortfolioModel.findOneAndUpdate(
			{ id },
			{ $set: { avatar: avatarUrl, avatarKey: key } },
			{ new: true },
		).lean();

		if (!updated) {
			return NextResponse.json(
				{ error: "Portfolio not found" },
				{ status: 404 },
			);
		}

		return NextResponse.json({ avatar: avatarUrl });
	} catch (error) {
		console.error("Portfolio avatar upload error:", error);
		return NextResponse.json(
			{ error: "Failed to upload avatar" },
			{ status: 500 },
		);
	}
}

/**
 * POST /api/portfolios/[id]/avatar
 *
 * Direct-upload variant: stores an already-uploaded B2 object as the
 * portfolio's avatar.
 */
export async function POST(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const cookieStore = await cookies();
		const session = cookieStore.get(SESSION_COOKIE)?.value;
		if (!session) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}
		const [, userId] = session.split(":");
		if (!userId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { id } = await params;
		await connectDB();

		const isAdmin = await checkPortfolioAccess(userId, id, PortfolioRole.ADMIN);
		if (!isAdmin) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}

		const body = (await req.json()) as { key?: string };
		const key = body.key;
		if (!key || !key.startsWith(`portfolios/${id}/`)) {
			return NextResponse.json(
				{ error: "Invalid key for this portfolio" },
				{ status: 400 },
			);
		}

		const avatarUrl = `/api/portfolios/${id}/avatar/view`;
		const updated = await PortfolioModel.findOneAndUpdate(
			{ id },
			{ $set: { avatar: avatarUrl, avatarKey: key } },
			{ new: true },
		).lean();
		if (!updated) {
			return NextResponse.json(
				{ error: "Portfolio not found" },
				{ status: 404 },
			);
		}
		return NextResponse.json({ avatar: avatarUrl });
	} catch (error) {
		console.error("Portfolio avatar attach error:", error);
		return NextResponse.json(
			{ error: "Failed to set avatar" },
			{ status: 500 },
		);
	}
}
