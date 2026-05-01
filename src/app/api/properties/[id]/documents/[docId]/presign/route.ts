import { b2, B2_BUCKET } from "@/lib/b2";
import connectDB from "@/lib/mongoose";
import { AIDocumentModel } from "@/models/AIDocument";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextRequest, NextResponse } from "next/server";

// GET /api/properties/[id]/documents/[docId]/presign
// Returns a short-lived pre-signed URL for direct B2 access (used by Office
// Online Viewer). Documents live in the unified AIDocumentModel collection.
export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string; docId: string }> },
) {
	try {
		const { id, docId } = await params;

		await connectDB();

		const doc = await AIDocumentModel.findById(docId)
			.select("fileUrl fileName propertyIds")
			.lean();

		if (!doc || !(doc.propertyIds ?? []).includes(id)) {
			return NextResponse.json(
				{ error: "Document not found" },
				{ status: 404 },
			);
		}

		const url = new URL(doc.fileUrl);
		const key = decodeURIComponent(url.pathname.slice(1));

		const signedUrl = await getSignedUrl(
			b2,
			new GetObjectCommand({
				Bucket: B2_BUCKET,
				Key: key,
				ResponseContentDisposition: `inline; filename="${encodeURIComponent(doc.fileName)}"`,
			}),
			{ expiresIn: 3600 },
		);

		return NextResponse.json({ url: signedUrl });
	} catch (error) {
		console.error("Error generating presigned URL:", error);
		return NextResponse.json(
			{ error: "Failed to generate URL" },
			{ status: 500 },
		);
	}
}
