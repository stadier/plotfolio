import { b2, B2_BUCKET } from "@/lib/b2";
import connectDB from "@/lib/mongoose";
import { PropertyModel } from "@/models/Property";
import { MediaType } from "@/types/property";
import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";

// POST /api/properties/[id]/media
// Accepts multipart/form-data with: file, type (image|video|audio), caption?
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await params;

		const formData = await request.formData();
		const file = formData.get("file") as File | null;
		const type = formData.get("type") as MediaType | null;
		const caption = formData.get("caption") as string | null;

		if (!file || !type) {
			return NextResponse.json(
				{ error: "file and type are required" },
				{ status: 400 },
			);
		}

		if (!Object.values(MediaType).includes(type)) {
			return NextResponse.json(
				{ error: "Invalid media type. Must be image, video, or audio." },
				{ status: 400 },
			);
		}

		// Sanitize filename to prevent path traversal
		const safeName = file.name.replace(/[^a-zA-Z0-9._\- ]/g, "_");
		const timestamp = Date.now();
		const fileName = `${timestamp}_${safeName}`;
		const key = `uploads/${id}/media/${fileName}`;

		// Upload to Backblaze B2
		const buffer = Buffer.from(await file.arrayBuffer());
		await b2.send(
			new PutObjectCommand({
				Bucket: B2_BUCKET,
				Key: key,
				Body: buffer,
				ContentType: file.type || "application/octet-stream",
			}),
		);

		const url = `https://${B2_BUCKET}.s3.us-east-005.backblazeb2.com/${key}`;

		const mediaItem = {
			url,
			type,
			...(caption ? { caption } : {}),
		};

		await connectDB();
		await PropertyModel.updateOne({ id }, { $push: { media: mediaItem } });

		return NextResponse.json({ media: mediaItem }, { status: 201 });
	} catch (error) {
		console.error("Error uploading media:", error);
		return NextResponse.json(
			{ error: "Failed to upload media" },
			{ status: 500 },
		);
	}
}

// DELETE /api/properties/[id]/media?url=<encoded-url>
export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await params;
		const { searchParams } = new URL(request.url);
		const url = searchParams.get("url");

		if (!url) {
			return NextResponse.json({ error: "url is required" }, { status: 400 });
		}

		await connectDB();

		// Remove from B2 if it's a B2 URL we own
		try {
			const urlObj = new URL(url);
			const key = urlObj.pathname.slice(1);
			if (key.startsWith(`uploads/${id}/`)) {
				await b2.send(new DeleteObjectCommand({ Bucket: B2_BUCKET, Key: key }));
			}
		} catch {
			// Non-B2 or malformed URL — skip storage deletion, still remove from DB
		}

		await PropertyModel.updateOne({ id }, { $pull: { media: { url } } });
		// Also remove from legacy images array if present
		await PropertyModel.updateOne({ id }, { $pull: { images: url } });

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Error deleting media:", error);
		return NextResponse.json(
			{ error: "Failed to delete media" },
			{ status: 500 },
		);
	}
}
