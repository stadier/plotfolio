import { b2, B2_BUCKET } from "@/lib/b2";
import { CacheControl } from "@/lib/httpCache";
import connectDB from "@/lib/mongoose";
import { AIDocumentModel } from "@/models/AIDocument";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";

// GET /api/properties/[id]/documents/[docId]/view
// Streams the document file from B2 storage. Documents now live in the
// unified AIDocumentModel collection; the property linkage is checked via
// the propertyIds array.
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
			`inline; filename="${encodeURIComponent(doc.fileName)}"`,
		);
		headers.set("Cache-Control", CacheControl.privateMedium);

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
