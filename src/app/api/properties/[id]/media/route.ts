import { b2, B2_BUCKET } from "@/lib/b2";
import connectDB from "@/lib/mongoose";
import { PropertyModel } from "@/models/Property";
import { MediaType } from "@/types/property";
import {
	DeleteObjectCommand,
	ListObjectsV2Command,
	PutObjectCommand,
} from "@aws-sdk/client-s3";
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
		const thumbnail = formData.get("thumbnail") as File | null;

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

		let thumbnailUrl: string | undefined;
		if (
			thumbnail &&
			thumbnail.size > 0 &&
			thumbnail.type.startsWith("image/")
		) {
			const safeThumbName = thumbnail.name.replace(/[^a-zA-Z0-9._\- ]/g, "_");
			const thumbKey = `uploads/${id}/media/${timestamp}_thumb_${safeThumbName}`;
			const thumbnailBuffer = Buffer.from(await thumbnail.arrayBuffer());
			await b2.send(
				new PutObjectCommand({
					Bucket: B2_BUCKET,
					Key: thumbKey,
					Body: thumbnailBuffer,
					ContentType: thumbnail.type || "image/jpeg",
				}),
			);
			thumbnailUrl = `https://${B2_BUCKET}.s3.us-east-005.backblazeb2.com/${thumbKey}`;
		}

		const mediaItem = {
			url,
			type,
			...(thumbnailUrl ? { thumbnail: thumbnailUrl } : {}),
			...(caption ? { caption } : {}),
		};

		await connectDB();
		await PropertyModel.updateOne(
			{ id },
			{ $push: { media: mediaItem }, $addToSet: { images: url } },
		);

		return NextResponse.json({ media: mediaItem }, { status: 201 });
	} catch (error) {
		console.error("Error uploading media:", error);
		return NextResponse.json(
			{ error: "Failed to upload media" },
			{ status: 500 },
		);
	}
}

// PATCH /api/properties/[id]/media
// Accepts { urls: string[] } — the full ordered list of media URLs.
// Re-orders the property's media array to match.
export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await params;
		const body = await request.json();

		function mediaTypeFromPath(pathOrUrl: string): MediaType {
			const target = pathOrUrl.toLowerCase();
			if (/\.(mp4|webm|ogg|mov|avi|mkv)(\?|$)/.test(target)) {
				return MediaType.VIDEO;
			}
			if (/\.(mp3|wav|aac|flac|m4a|oga)(\?|$)/.test(target)) {
				return MediaType.AUDIO;
			}
			return MediaType.IMAGE;
		}

		if (body?.recoverFromStorage === true) {
			const prefix = `uploads/${id}/media/`;
			const listed = await b2.send(
				new ListObjectsV2Command({
					Bucket: B2_BUCKET,
					Prefix: prefix,
				}),
			);

			const contents = listed.Contents ?? [];
			const sorted = [...contents].sort((a, b) => {
				const at = a.LastModified?.getTime() ?? 0;
				const bt = b.LastModified?.getTime() ?? 0;
				return at - bt;
			});

			const recoveredMedia = sorted
				.map((obj) => obj.Key)
				.filter((key): key is string => !!key)
				.map((key) => {
					const url = `https://${B2_BUCKET}.s3.us-east-005.backblazeb2.com/${key}`;
					return { url, type: mediaTypeFromPath(key) };
				});

			await connectDB();
			const recoverResult = await PropertyModel.updateOne(
				{ id },
				{
					$set: { media: recoveredMedia },
					$addToSet: {
						images: {
							$each: recoveredMedia
								.filter((m) => m.type === MediaType.IMAGE)
								.map((m) => m.url),
						},
					},
				},
			);

			if (recoverResult.matchedCount === 0) {
				return NextResponse.json(
					{ error: "Property not found" },
					{ status: 404 },
				);
			}

			return NextResponse.json({
				success: true,
				recovered: recoveredMedia.length,
			});
		}

		const urls: unknown = body?.urls;

		if (!Array.isArray(urls) || urls.some((u) => typeof u !== "string")) {
			return NextResponse.json(
				{ error: "urls must be an array of strings" },
				{ status: 400 },
			);
		}

		await connectDB();
		const tConnect = Date.now();
		type MediaItem = {
			url: string;
			type: string;
			thumbnail?: string;
			caption?: string;
		};
		// Only project `media` — fetching the full property document (with
		// boundaries, sales, ownership history, etc.) just to read this array
		// was the bottleneck that made saving order feel slow.
		const property = await PropertyModel.findOne({ id }, { media: 1 }).lean<{
			media?: MediaItem[];
		} | null>();
		const tFind = Date.now();
		if (!property) {
			return NextResponse.json(
				{ error: "Property not found" },
				{ status: 404 },
			);
		}

		const existingMedia: MediaItem[] = property.media ?? [];

		if ((urls as string[]).length === 0 && existingMedia.length > 0) {
			return NextResponse.json(
				{ error: "At least one media URL is required for reorder" },
				{ status: 400 },
			);
		}

		function normalizeForMatch(url: string): string {
			if (url.startsWith("/api/media/view/")) {
				return decodeURIComponent(url.replace("/api/media/view/", ""));
			}
			try {
				const parsed = new URL(url);
				return decodeURIComponent(parsed.pathname.replace(/^\//, ""));
			} catch {
				return url;
			}
		}

		function toStoredUrl(inputUrl: string): string {
			if (inputUrl.startsWith("/api/media/view/")) {
				const key = decodeURIComponent(
					inputUrl.replace("/api/media/view/", ""),
				);
				return `https://${B2_BUCKET}.s3.us-east-005.backblazeb2.com/${key}`;
			}
			return inputUrl;
		}

		const existingByPath = new Map(
			existingMedia.map((item) => [normalizeForMatch(item.url), item]),
		);
		const used = new Set<string>();
		const reordered: MediaItem[] = [];

		for (const url of urls as string[]) {
			const normalized = normalizeForMatch(url);
			const matched = existingByPath.get(normalized);
			if (matched && !used.has(matched.url)) {
				reordered.push(matched);
				used.add(matched.url);
				continue;
			}

			// Recovery path: if URL is not in media, rebuild an entry from payload.
			const rebuiltUrl = toStoredUrl(url);
			if (!used.has(rebuiltUrl)) {
				reordered.push({
					url: rebuiltUrl,
					type: mediaTypeFromPath(rebuiltUrl),
				});
				used.add(rebuiltUrl);
			}
		}

		// Preserve unmatched items in current order to avoid destructive reorders.
		for (const item of existingMedia) {
			if (!used.has(item.url)) {
				reordered.push(item);
			}
		}

		await PropertyModel.updateOne({ id }, { $set: { media: reordered } });
		const tUpdate = Date.now();
		console.log(
			`[media PATCH] connect→find=${tFind - tConnect}ms find→update=${tUpdate - tFind}ms total=${tUpdate - tConnect}ms items=${reordered.length}`,
		);

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Error reordering media:", error);
		return NextResponse.json(
			{ error: "Failed to reorder media" },
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

		// Extract the storage key from either a raw B2 URL or our proxied
		// "/api/media/view/<key>" URL so we can match the DB entry regardless
		// of which form the client sends.
		function extractKey(input: string): string | null {
			if (input.startsWith("/api/media/view/")) {
				return decodeURIComponent(input.replace("/api/media/view/", ""));
			}
			try {
				const parsed = new URL(input);
				return decodeURIComponent(parsed.pathname.replace(/^\//, ""));
			} catch {
				return null;
			}
		}

		const key = extractKey(url);

		// Remove from B2 if the key belongs to this property
		if (key && key.startsWith(`uploads/${id}/`)) {
			try {
				await b2.send(new DeleteObjectCommand({ Bucket: B2_BUCKET, Key: key }));
			} catch {
				// Non-fatal: still remove from DB
			}
		}

		// Find the property and locate the media entry whose URL ends with the
		// extracted key — handles both proxied and raw URL forms in the DB.
		const property = await PropertyModel.findOne({ id }).lean<{
			media?: { url: string }[];
			images?: string[];
		} | null>();

		const candidateUrls = new Set<string>();
		candidateUrls.add(url);
		if (key) {
			for (const m of property?.media ?? []) {
				if (m.url === url || m.url.endsWith(key)) candidateUrls.add(m.url);
			}
			for (const imgUrl of property?.images ?? []) {
				if (imgUrl === url || imgUrl.endsWith(key)) candidateUrls.add(imgUrl);
			}
		}

		await PropertyModel.updateOne(
			{ id },
			{
				$pull: {
					media: { url: { $in: Array.from(candidateUrls) } },
					images: { $in: Array.from(candidateUrls) },
				},
			},
		);

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Error deleting media:", error);
		return NextResponse.json(
			{ error: "Failed to delete media" },
			{ status: 500 },
		);
	}
}
