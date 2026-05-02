import connectDB from "@/lib/mongoose";
import { getSessionUserId } from "@/lib/session";
import { publicUrlForKey } from "@/lib/uploadScopes";
import { AIDocumentModel } from "@/models/AIDocument";
import { PortfolioMemberModel } from "@/models/Portfolio";
import { PropertyModel } from "@/models/Property";
import { DocumentAccessLevel, DocumentType } from "@/types/property";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/properties/[id]/documents/attach
 *
 * Records a freshly-uploaded document on a property. The bytes are already
 * in B2 (uploaded via presigned URL), so this endpoint only creates the
 * Mongo metadata.
 *
 * AI processing is NEVER triggered here. The user can opt in to AI
 * extraction later (and only when the per-account `aiDocumentProcessing`
 * preference is on — see `/api/settings/preferences`).
 */
interface AttachBody {
	key: string;
	name: string;
	type: DocumentType;
	size: number;
	mime: string;
	accessLevel?: DocumentAccessLevel;
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
		const { key, name, type, size, mime, accessLevel } = body;

		if (!key || !name || !type || !size || !mime) {
			return NextResponse.json(
				{ error: "key, name, type, size, mime are required" },
				{ status: 400 },
			);
		}
		if (!Object.values(DocumentType).includes(type)) {
			return NextResponse.json(
				{ error: "Invalid document type" },
				{ status: 400 },
			);
		}

		const expectedPrefix = `uploads/${id}/`;
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
		const ownerId = property.owner?.id ?? userId;
		const isOwner = ownerId === userId;
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

		const doc = await AIDocumentModel.create({
			userId: ownerId,
			propertyIds: [id],
			fileUrl: publicUrlForKey(key),
			fileName: name,
			fileSize: size,
			mimeType: mime,
			documentType: type,
			accessLevel: accessLevel ?? DocumentAccessLevel.PUBLIC,
			aiProcessed: false,
			indexed: false,
			uploadStatus: "ready",
		});

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
