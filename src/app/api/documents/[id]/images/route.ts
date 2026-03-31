/**
 * GET /api/documents/[id]/images — Get extracted images for a document
 */

import connectDB from "@/lib/mongoose";
import { DocumentImageModel } from "@/models/AIDocument";
import { NextRequest, NextResponse } from "next/server";

interface RouteParams {
	params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
	try {
		await connectDB();
		const { id } = await params;

		const images = await DocumentImageModel.find({ documentId: id })
			.sort({ pageNumber: 1 })
			.select("-__v")
			.lean();

		return NextResponse.json({
			images: images.map((img) => ({
				id: img._id.toString(),
				documentId: img.documentId,
				imageUrl: img.imageUrl,
				pageNumber: img.pageNumber,
				description: img.description,
			})),
		});
	} catch (error) {
		console.error("[document-images] Failed:", error);
		return NextResponse.json(
			{ error: "Failed to fetch document images" },
			{ status: 500 },
		);
	}
}
