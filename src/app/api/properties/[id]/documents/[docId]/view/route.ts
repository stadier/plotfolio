import { b2, B2_BUCKET } from "@/lib/b2";
import connectDB from "@/lib/mongoose";
import { PropertyModel } from "@/models/Property";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";

// GET /api/properties/[id]/documents/[docId]/view
// Streams the document file from B2 storage
export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string; docId: string }> },
) {
	try {
		const { id, docId } = await params;

		await connectDB();

		// Find the property and the specific document
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
		const key = decodeURIComponent(url.pathname.slice(1)); // Remove leading /

		const response = await b2.send(
			new GetObjectCommand({
				Bucket: B2_BUCKET,
				Key: key,
			}),
		);

		if (!response.Body) {
			return NextResponse.json(
				{ error: "Empty response from storage" },
				{ status: 502 },
			);
		}

		const headers = new Headers();
		if (response.ContentType) {
			headers.set("Content-Type", response.ContentType);
		}
		if (response.ContentLength !== undefined) {
			headers.set("Content-Length", String(response.ContentLength));
		}
		headers.set(
			"Content-Disposition",
			`inline; filename="${encodeURIComponent(doc.name)}"`,
		);
		headers.set("Cache-Control", "private, max-age=3600");

		// Stream the body from S3-compatible response
		const bodyStream = response.Body.transformToWebStream();

		return new NextResponse(bodyStream as ReadableStream, {
			status: 200,
			headers,
		});
	} catch (error) {
		console.error("Error serving document:", error);
		return NextResponse.json(
			{ error: "Failed to serve document" },
			{ status: 500 },
		);
	}
}
