import { b2, B2_BUCKET } from "@/lib/b2";
import connectDB from "@/lib/mongoose";
import { getSessionUserId } from "@/lib/session";
import { publicUrlForKey } from "@/lib/uploadScopes";
import { PortfolioMemberModel } from "@/models/Portfolio";
import { PropertyModel } from "@/models/Property";
import { MediaType, type PropertyMedia } from "@/types/property";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/properties/[id]/media/attach
 *
 * Records a freshly-uploaded media object on a property. The bytes are
 * already in B2 (uploaded directly via a presigned URL); this endpoint
 * only writes the Mongo metadata so it returns in milliseconds.
 *
 * For images and videos we kick off a background job (see `processMedia`)
 * to generate a thumbnail. The row is persisted with status "processing"
 * during that work, then flipped to "ready". The user can leave the page
 * — the next refetch picks up the final URL.
 */
interface AttachBody {
	key: string;
	type: MediaType;
	caption?: string;
	mime?: string;
	/**
	 * Optional client-provided thumbnail key (already uploaded via the
	 * `property-thumb` scope). When present, we skip the server-side
	 * thumbnail render and use this directly.
	 */
	thumbKey?: string;
}

export async function POST(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const userId = await getSessionUserId();
		if (!userId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { id } = await params;
		const body = (await req.json()) as AttachBody;
		const { key, type, caption, mime, thumbKey } = body;

		if (!key || !type) {
			return NextResponse.json(
				{ error: "key and type are required" },
				{ status: 400 },
			);
		}
		if (!Object.values(MediaType).includes(type)) {
			return NextResponse.json(
				{ error: "Invalid media type" },
				{ status: 400 },
			);
		}

		// Confirm the key actually targets this property's media folder so
		// callers can't attach unrelated objects from elsewhere in the bucket.
		const expectedPrefix = `uploads/${id}/media/`;
		if (!key.startsWith(expectedPrefix)) {
			return NextResponse.json(
				{ error: "Key does not belong to this property" },
				{ status: 400 },
			);
		}

		await connectDB();
		const property = await PropertyModel.findOne({ id })
			.select("owner.id portfolioId")
			.lean<{ owner?: { id?: string }; portfolioId?: string }>();
		if (!property) {
			return NextResponse.json(
				{ error: "Property not found" },
				{ status: 404 },
			);
		}
		const isOwner = property.owner?.id === userId;
		if (!isOwner) {
			const member = property.portfolioId
				? await PortfolioMemberModel.findOne({
						portfolioId: property.portfolioId,
						userId,
						status: "active",
					}).lean()
				: null;
			if (!member) {
				return NextResponse.json({ error: "Forbidden" }, { status: 403 });
			}
		}

		const url = publicUrlForKey(key);
		const clientThumbnailUrl =
			thumbKey && thumbKey.startsWith(expectedPrefix)
				? publicUrlForKey(thumbKey)
				: undefined;
		// Images go straight to "ready" once we know the upload landed; videos
		// (and audio) sit in "processing" while we render a thumbnail.
		// If the client supplied a thumbnail we skip the background render.
		const needsServerThumb = type === MediaType.IMAGE && !clientThumbnailUrl;
		const initialStatus: PropertyMedia["status"] =
			type === MediaType.VIDEO && !clientThumbnailUrl ? "processing" : "ready";

		const mediaItem: PropertyMedia = {
			url,
			type,
			...(caption ? { caption } : {}),
			...(clientThumbnailUrl ? { thumbnail: clientThumbnailUrl } : {}),
			status: initialStatus,
		};

		await PropertyModel.updateOne(
			{ id },
			{
				$push: { media: mediaItem },
				$addToSet: { images: url },
			},
		);

		// For images without a client thumbnail: kick off a background
		// thumbnail render in the same process. We don't await — the response
		// returns immediately. If it fails the row simply stays without a
		// derivative.
		if (needsServerThumb) {
			void renderImageThumbnail({
				propertyId: id,
				key,
				url,
				mime: mime ?? "image/jpeg",
			}).catch((err) => {
				console.error("Thumbnail render failed:", err);
			});
		}

		return NextResponse.json({ media: mediaItem }, { status: 201 });
	} catch (error) {
		console.error("Media attach error:", error);
		return NextResponse.json(
			{ error: "Failed to attach media" },
			{ status: 500 },
		);
	}
}

/**
 * Background job: generate a small thumbnail for an image media item.
 * Runs in-process. Updates the matching media row with the thumbnail URL
 * once the derivative is in place.
 */
async function renderImageThumbnail(input: {
	propertyId: string;
	key: string;
	url: string;
	mime: string;
}) {
	// Lazy-load sharp so this route's cold start stays cheap.
	const { default: sharp } = await import("sharp");

	const obj = await b2.send(
		new GetObjectCommand({ Bucket: B2_BUCKET, Key: input.key }),
	);
	const body = obj.Body as unknown as {
		transformToByteArray?: () => Promise<Uint8Array>;
	};
	if (!body?.transformToByteArray) return;
	const bytes = await body.transformToByteArray();

	const thumbBuffer = await sharp(Buffer.from(bytes))
		.rotate()
		.resize({ width: 480, withoutEnlargement: true })
		.jpeg({ quality: 75 })
		.toBuffer();

	const thumbKey = `${input.key.replace(/(\.[a-zA-Z0-9]+)?$/, "")}_thumb.jpg`;
	await b2.send(
		new PutObjectCommand({
			Bucket: B2_BUCKET,
			Key: thumbKey,
			Body: thumbBuffer,
			ContentType: "image/jpeg",
			CacheControl: "public, max-age=31536000",
		}),
	);
	const thumbnailUrl = publicUrlForKey(thumbKey);

	await connectDB();
	await PropertyModel.updateOne(
		{ id: input.propertyId, "media.url": input.url },
		{
			$set: {
				"media.$.thumbnail": thumbnailUrl,
				"media.$.status": "ready",
			},
		},
	);
}
