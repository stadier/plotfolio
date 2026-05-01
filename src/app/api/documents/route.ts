/**
 * GET  /api/documents          — List documents (filter by userId, propertyId, documentType)
 * POST /api/documents          — Alias for /api/documents/upload (convenience)
 */

import connectDB from "@/lib/mongoose";
import { AIDocumentModel } from "@/models/AIDocument";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
	try {
		await connectDB();

		const { searchParams } = new URL(req.url);
		const userId = searchParams.get("userId");
		const propertyId = searchParams.get("propertyId");
		const documentType = searchParams.get("documentType");

		const filter: Record<string, unknown> = {};
		if (userId) filter.userId = userId;
		if (propertyId) filter.propertyIds = propertyId;
		if (documentType) filter.documentType = documentType;

		const documents = await AIDocumentModel.find(filter)
			.sort({ createdAt: -1 })
			.select("-ocrText -__v") // Exclude large OCR text from listing
			.lean();

		const result = documents.map((doc) => ({
			id: doc._id.toString(),
			userId: doc.userId,
			propertyIds: doc.propertyIds ?? [],
			fileUrl: doc.fileUrl,
			fileName: doc.fileName,
			fileSize: doc.fileSize,
			mimeType: doc.mimeType,
			documentType: doc.documentType,
			accessLevel: doc.accessLevel ?? "public",
			watermark: doc.watermark ?? null,
			aiProcessed: doc.aiProcessed ?? false,
			extractedData: doc.extractedData,
			confidence: doc.confidence,
			indexed: doc.indexed,
			createdAt: doc.createdAt,
			updatedAt: doc.updatedAt,
		}));

		return NextResponse.json({ documents: result });
	} catch (error) {
		console.error("[documents] List failed:", error);
		return NextResponse.json(
			{ error: "Failed to list documents" },
			{ status: 500 },
		);
	}
}
