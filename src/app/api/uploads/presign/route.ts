import { b2, B2_BUCKET } from "@/lib/b2";
import connectDB from "@/lib/mongoose";
import { getSessionUserId } from "@/lib/session";
import {
	isMimeAllowed,
	publicUrlForKey,
	sanitizeFilename,
	SCOPE_CONFIG,
	UploadScope,
} from "@/lib/uploadScopes";
import { PortfolioMemberModel } from "@/models/Portfolio";
import { PropertyModel } from "@/models/Property";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextRequest, NextResponse } from "next/server";

const URL_TTL_SECONDS = 60 * 10; // 10 minutes is plenty for a single PUT

interface PresignBody {
	scope: UploadScope;
	filename: string;
	mime: string;
	size: number;
	propertyId?: string;
	portfolioId?: string;
}

/**
 * POST /api/uploads/presign
 *
 * Returns a presigned PUT URL for a Backblaze B2 object so the browser can
 * upload bytes directly to storage. The server only validates and signs —
 * it never touches the file payload, which keeps the request fast and
 * removes Next.js body-size / serverless timeout limits.
 *
 * After the client finishes the PUT it must call the appropriate "attach"
 * endpoint to record the new object in Mongo.
 */
export async function POST(req: NextRequest) {
	try {
		const userId = await getSessionUserId();
		if (!userId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const body = (await req.json()) as PresignBody;
		const { scope, filename, mime, size, propertyId, portfolioId } = body;

		const cfg = SCOPE_CONFIG[scope];
		if (!cfg) {
			return NextResponse.json(
				{ error: "Unknown upload scope" },
				{ status: 400 },
			);
		}

		if (!filename || !mime || typeof size !== "number" || size <= 0) {
			return NextResponse.json(
				{ error: "filename, mime, and size are required" },
				{ status: 400 },
			);
		}

		if (size > cfg.maxBytes) {
			return NextResponse.json(
				{
					error: `File exceeds the ${Math.round(
						cfg.maxBytes / (1024 * 1024),
					)} MB limit for this upload type`,
				},
				{ status: 413 },
			);
		}

		if (!isMimeAllowed(scope, mime)) {
			return NextResponse.json(
				{ error: `Mime type ${mime} is not allowed for ${scope}` },
				{ status: 415 },
			);
		}

		// Ownership / membership checks for scopes that target a resource.
		if (cfg.requirePropertyId) {
			if (!propertyId) {
				return NextResponse.json(
					{ error: "propertyId is required for this scope" },
					{ status: 400 },
				);
			}
			await connectDB();
			const property = await PropertyModel.findOne({ id: propertyId })
				.select("owner.id portfolioId")
				.lean<{
					owner?: { id?: string };
					portfolioId?: string;
				}>();
			if (!property) {
				return NextResponse.json(
					{ error: "Property not found" },
					{ status: 404 },
				);
			}
			const isOwner = property.owner?.id === userId;
			let hasPortfolioAccess = false;
			if (!isOwner && property.portfolioId) {
				const member = await PortfolioMemberModel.findOne({
					portfolioId: property.portfolioId,
					userId,
					status: "active",
				}).lean();
				hasPortfolioAccess = !!member;
			}
			if (!isOwner && !hasPortfolioAccess) {
				return NextResponse.json({ error: "Forbidden" }, { status: 403 });
			}
		}

		if (cfg.requirePortfolioId) {
			if (!portfolioId) {
				return NextResponse.json(
					{ error: "portfolioId is required for this scope" },
					{ status: 400 },
				);
			}
			await connectDB();
			const member = await PortfolioMemberModel.findOne({
				portfolioId,
				userId,
				status: "active",
			}).lean();
			if (!member) {
				return NextResponse.json({ error: "Forbidden" }, { status: 403 });
			}
		}

		const safeName = sanitizeFilename(filename);
		const ts = Date.now();
		const key = cfg.buildKey({
			userId,
			safeName,
			ts,
			propertyId,
			portfolioId,
		});

		const uploadUrl = await getSignedUrl(
			b2,
			new PutObjectCommand({
				Bucket: B2_BUCKET,
				Key: key,
				ContentType: mime,
			}),
			{ expiresIn: URL_TTL_SECONDS },
		);

		return NextResponse.json({
			uploadUrl,
			key,
			publicUrl: publicUrlForKey(key),
			method: "PUT",
			headers: {
				"Content-Type": mime,
			},
			expiresIn: URL_TTL_SECONDS,
		});
	} catch (error) {
		console.error("Presign error:", error);
		return NextResponse.json(
			{ error: "Failed to create upload URL" },
			{ status: 500 },
		);
	}
}
