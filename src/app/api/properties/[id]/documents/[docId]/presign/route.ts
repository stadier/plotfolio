import { b2, B2_BUCKET } from "@/lib/b2";
import connectDB from "@/lib/mongoose";
import { PropertyModel } from "@/models/Property";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextRequest, NextResponse } from "next/server";

// GET /api/properties/[id]/documents/[docId]/presign
// Returns a short-lived pre-signed URL for direct B2 access (used by Office Online Viewer)
export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string; docId: string }> },
) {
	try {
		const { id, docId } = await params;

		await connectDB();

		const property = (await PropertyModel.findOne(
			{ id, "documents.id": docId },
			{ "documents.$": 1 },
		).lean()) as { documents?: Array<{ url: string; name: string }> } | null;

		if (!property?.documents?.[0]) {
			return NextResponse.json(
				{ error: "Document not found" },
				{ status: 404 },
			);
		}

		const doc = property.documents[0];
		const url = new URL(doc.url);
		const key = decodeURIComponent(url.pathname.slice(1));

		const signedUrl = await getSignedUrl(
			b2,
			new GetObjectCommand({
				Bucket: B2_BUCKET,
				Key: key,
				ResponseContentDisposition: `inline; filename="${encodeURIComponent(doc.name)}"`,
			}),
			{ expiresIn: 3600 }, // 1 hour
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
