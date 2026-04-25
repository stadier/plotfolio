import { b2, B2_BUCKET } from "@/lib/b2";
import { CacheControl } from "@/lib/httpCache";
import connectDB from "@/lib/mongoose";
import { AIDocumentModel } from "@/models/AIDocument";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/documents/[id]/view
 * Streams an AI document file from B2 via server credentials.
 */
export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await params;
		await connectDB();

		const doc = await AIDocumentModel.findById(id)
			.select("fileUrl fileName mimeType")
			.lean();

		if (!doc?.fileUrl) {
			return NextResponse.json(
				{ error: "Document not found" },
				{ status: 404 },
			);
		}

		let key: string;
		try {
			const url = new URL(doc.fileUrl);
			key = decodeURIComponent(url.pathname.slice(1));
		} catch {
			const fromSplit = doc.fileUrl.split(".backblazeb2.com/")[1];
			if (!fromSplit) {
				return NextResponse.json(
					{ error: "Invalid document storage URL" },
					{ status: 400 },
				);
			}
			key = fromSplit;
		}

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
		headers.set(
			"Content-Type",
			response.ContentType || doc.mimeType || "application/octet-stream",
		);
		if (response.ContentLength !== undefined) {
			headers.set("Content-Length", String(response.ContentLength));
		}
		headers.set(
			"Content-Disposition",
			`inline; filename="${encodeURIComponent(doc.fileName || "document")}"`,
		);
		headers.set("Cache-Control", CacheControl.privateMedium);

		const bodyStream = response.Body.transformToWebStream();
		return new NextResponse(bodyStream as ReadableStream, {
			status: 200,
			headers,
		});
	} catch (error) {
		console.error("[document-view] Failed:", error);
		return NextResponse.json(
			{ error: "Failed to serve document" },
			{ status: 500 },
		);
	}
}
