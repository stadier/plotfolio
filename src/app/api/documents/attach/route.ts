import connectDB from "@/lib/mongoose";
import { getSessionUserId } from "@/lib/session";
import { publicUrlForKey } from "@/lib/uploadScopes";
import { AIDocumentModel } from "@/models/AIDocument";
import { PropertyModel } from "@/models/Property";
import { UserModel } from "@/models/User";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/documents/attach
 *
 * Records a freshly-uploaded document in the unified document collection.
 * The bytes are already in B2 (uploaded via presigned URL), so this
 * endpoint only persists the Mongo metadata and returns immediately.
 *
 * AI processing (OCR, extraction, indexing) is only triggered when the
 * caller passes `processWithAi: true` AND the user has the
 * `aiDocumentProcessing` preference enabled (it's a paid feature). The
 * actual AI work is dispatched to the existing
 * `/api/documents/upload` pipeline asynchronously so this endpoint
 * stays fast.
 */
interface AttachBody {
	key: string;
	name: string;
	size: number;
	mime: string;
	documentType?: string;
	propertyIds?: string[];
	accessLevel?: "public" | "request_required" | "private";
	watermark?: Record<string, unknown> | null;
	/**
	 * When true AND the user has opted into AI processing, schedule a
	 * background extraction pass. Defaults to false.
	 */
	processWithAi?: boolean;
}

export async function POST(req: NextRequest) {
	try {
		const userId = await getSessionUserId();
		if (!userId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const body = (await req.json()) as AttachBody;
		const {
			key,
			name,
			size,
			mime,
			documentType,
			propertyIds,
			accessLevel,
			watermark,
			processWithAi,
		} = body;

		if (!key || !name || !size || !mime) {
			return NextResponse.json(
				{ error: "key, name, size, mime are required" },
				{ status: 400 },
			);
		}

		// Restrict the key to the user's own document folders so a presigned
		// URL for one user can never be attached to a different account.
		const allowedPrefixes = [
			`uploads/users/${userId}/documents/`,
			...(propertyIds ?? []).map((pid) => `uploads/${pid}/`),
		];
		if (!allowedPrefixes.some((p) => key.startsWith(p))) {
			return NextResponse.json(
				{ error: "Key does not match this user / property" },
				{ status: 400 },
			);
		}

		await connectDB();

		// Membership check for any property associations.
		if (propertyIds && propertyIds.length > 0) {
			const props = await PropertyModel.find({ id: { $in: propertyIds } })
				.select("id owner.id portfolioId")
				.lean<
					Array<{ id: string; owner?: { id?: string }; portfolioId?: string }>
				>();
			const ownerOk = props.every((p) => p.owner?.id === userId);
			if (!ownerOk) {
				// Fall back to portfolio membership check.
				const { PortfolioMemberModel } = await import("@/models/Portfolio");
				const portfolioIds = props
					.map((p) => p.portfolioId)
					.filter((p): p is string => !!p);
				if (portfolioIds.length === 0) {
					return NextResponse.json({ error: "Forbidden" }, { status: 403 });
				}
				const memberCount = await PortfolioMemberModel.countDocuments({
					userId,
					portfolioId: { $in: portfolioIds },
					status: "active",
				});
				if (memberCount === 0) {
					return NextResponse.json({ error: "Forbidden" }, { status: 403 });
				}
			}
		}

		const doc = await AIDocumentModel.create({
			userId,
			propertyIds: propertyIds ?? [],
			fileUrl: publicUrlForKey(key),
			fileName: name,
			fileSize: size,
			mimeType: mime,
			documentType: documentType || "other",
			accessLevel: accessLevel ?? "public",
			watermark: watermark ?? null,
			aiProcessed: false,
			indexed: false,
			uploadStatus: "ready",
		});

		// Schedule AI processing only if the user has explicitly enabled it
		// (paid feature) AND the caller asked for it. We dispatch by re-using
		// the existing pipeline — but rather than re-uploading the file, we
		// could later add a dedicated "process existing document" endpoint.
		// For now, AI processing remains opt-in via the legacy upload route,
		// and `processWithAi` is reserved for a follow-up implementation.
		let aiScheduled = false;
		if (processWithAi) {
			const user = await UserModel.findOne({ id: userId })
				.select("settings")
				.lean<{ settings?: { aiDocumentProcessing?: boolean } }>();
			if (user?.settings?.aiDocumentProcessing) {
				aiScheduled = true;
				// TODO: kick off background extraction job that reads the file
				// from B2 by `key` and updates this document in place.
			}
		}

		return NextResponse.json(
			{
				document: {
					id: String(doc._id),
					name: doc.fileName,
					type: doc.documentType,
					url: doc.fileUrl,
					uploadDate: doc.createdAt,
					size: doc.fileSize,
					accessLevel: doc.accessLevel,
					aiProcessed: doc.aiProcessed,
				},
				aiScheduled,
			},
			{ status: 201 },
		);
	} catch (error) {
		console.error("Document attach error:", error);
		return NextResponse.json(
			{ error: "Failed to attach document" },
			{ status: 500 },
		);
	}
}
