import { b2, B2_BUCKET } from "@/lib/b2";
import connectDB from "@/lib/mongoose";
import { UserModel } from "@/models/User";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "plotfolio_session";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export async function PUT(req: NextRequest) {
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

		await connectDB();

		const buffer = Buffer.from(await file.arrayBuffer());
		const ext =
			file.type.split("/")[1] === "jpeg" ? "jpg" : file.type.split("/")[1];
		const key = `avatars/${userId}/${Date.now()}.${ext}`;

		await b2.send(
			new PutObjectCommand({
				Bucket: B2_BUCKET,
				Key: key,
				Body: buffer,
				ContentType: file.type,
				CacheControl: "public, max-age=31536000",
			}),
		);

		const avatarUrl = `https://${B2_BUCKET}.s3.us-east-005.backblazeb2.com/${key}`;

		const user = await UserModel.findOneAndUpdate(
			{ id: userId },
			{ $set: { avatar: avatarUrl } },
			{ new: true },
		).lean();

		if (!user) {
			return NextResponse.json({ error: "User not found" }, { status: 404 });
		}

		return NextResponse.json({ avatar: avatarUrl });
	} catch (error) {
		console.error("Avatar upload error:", error);
		return NextResponse.json(
			{ error: "Failed to upload avatar" },
			{ status: 500 },
		);
	}
}
