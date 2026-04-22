/**
 * GET    /api/documents/[id]  — Get single document with full details
 * DELETE /api/documents/[id]  — Delete document + chunks + images
 * PATCH  /api/documents/[id]  — Re-index or update document metadata
 */

import { b2, B2_BUCKET } from "@/lib/b2";
import { indexDocument } from "@/lib/documentAI/indexing";
import connectDB from "@/lib/mongoose";
import {
	AIDocumentModel,
	DocumentChunkModel,
	DocumentImageModel,
} from "@/models/AIDocument";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";

interface RouteParams {
	params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
	try {
		await connectDB();
		const { id } = await params;

		const doc = await AIDocumentModel.findById(id).lean();
		if (!doc) {
			return NextResponse.json(
				{ error: "Document not found" },
				{ status: 404 },
			);
		}

		const images = await DocumentImageModel.find({ documentId: id })
			.select("-__v")
			.lean();

		return NextResponse.json({
			document: {
				id: doc._id.toString(),
				userId: doc.userId,
				propertyIds: doc.propertyIds ?? [],
				fileUrl: doc.fileUrl,
				fileName: doc.fileName,
				fileSize: doc.fileSize,
				mimeType: doc.mimeType,
				documentType: doc.documentType,
				ocrText: doc.ocrText,
				extractedData: doc.extractedData,
				confidence: doc.confidence,
				indexed: doc.indexed,
				createdAt: doc.createdAt,
				updatedAt: doc.updatedAt,
			},
			images: images.map((img) => ({
				id: img._id.toString(),
				documentId: img.documentId,
				imageUrl: img.imageUrl,
				pageNumber: img.pageNumber,
				description: img.description,
			})),
		});
	} catch (error) {
		console.error("[document-get] Failed:", error);
		return NextResponse.json(
			{ error: "Failed to fetch document" },
			{ status: 500 },
		);
	}
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
	try {
		await connectDB();
		const { id } = await params;

		const doc = await AIDocumentModel.findById(id);
		if (!doc) {
			return NextResponse.json(
				{ error: "Document not found" },
				{ status: 404 },
			);
		}

		// Delete file from B2
		try {
			const key = doc.fileUrl.split(".backblazeb2.com/")[1];
			if (key) {
				await b2.send(new DeleteObjectCommand({ Bucket: B2_BUCKET, Key: key }));
			}
		} catch (err) {
			console.warn("[document-delete] B2 cleanup failed:", err);
		}

		// Delete associated images from B2
		const images = await DocumentImageModel.find({ documentId: id });
		for (const img of images) {
			try {
				const imgKey = img.imageUrl.split(".backblazeb2.com/")[1];
				if (imgKey) {
					await b2.send(
						new DeleteObjectCommand({ Bucket: B2_BUCKET, Key: imgKey }),
					);
				}
			} catch {
				// Best-effort cleanup
			}
		}

		// Delete DB records
		await Promise.all([
			AIDocumentModel.deleteOne({ _id: id }),
			DocumentChunkModel.deleteMany({ documentId: id }),
			DocumentImageModel.deleteMany({ documentId: id }),
		]);

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("[document-delete] Failed:", error);
		return NextResponse.json(
			{ error: "Failed to delete document" },
			{ status: 500 },
		);
	}
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
	try {
		await connectDB();
		const { id } = await params;

		const doc = await AIDocumentModel.findById(id);
		if (!doc) {
			return NextResponse.json(
				{ error: "Document not found" },
				{ status: 404 },
			);
		}

		const body = await req.json();

		// Re-index the document
		if (body.reindex && doc.ocrText && doc.ocrText.trim().length > 50) {
			const chunksCreated = await indexDocument(id, doc.ocrText);
			doc.indexed = true;
			await doc.save();
			return NextResponse.json({ reindexed: true, chunksCreated });
		}

		// Update metadata fields
		if (body.propertyIds !== undefined) doc.propertyIds = body.propertyIds;
		if (body.documentType !== undefined) doc.documentType = body.documentType;
		await doc.save();

		return NextResponse.json({ updated: true });
	} catch (error) {
		console.error("[document-patch] Failed:", error);
		return NextResponse.json(
			{ error: "Failed to update document" },
			{ status: 500 },
		);
	}
}
