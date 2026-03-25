import connectDB from "@/lib/mongoose";
import { PropertyModel } from "@/models/Property";
import { DocumentType } from "@/types/property";
import { mkdirSync, writeFileSync } from "fs";
import { NextRequest, NextResponse } from "next/server";
import { join } from "path";

// POST /api/properties/[id]/documents
// Accepts multipart/form-data with: file, type, name
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await params;

		const formData = await request.formData();
		const file = formData.get("file") as File | null;
		const type = formData.get("type") as DocumentType | null;
		const name = formData.get("name") as string | null;

		if (!file || !type || !name) {
			return NextResponse.json(
				{ error: "file, type and name are required" },
				{ status: 400 },
			);
		}

		// Validate document type
		if (!Object.values(DocumentType).includes(type)) {
			return NextResponse.json(
				{ error: "Invalid document type" },
				{ status: 400 },
			);
		}

		// Sanitize filename to prevent path traversal
		const safeName = name.replace(/[^a-zA-Z0-9._\- ]/g, "_");
		const timestamp = Date.now();
		const fileName = `${timestamp}_${safeName}`;

		// Save file to /public/uploads/[propertyId]/
		const uploadDir = join(process.cwd(), "public", "uploads", id);
		mkdirSync(uploadDir, { recursive: true });

		const buffer = Buffer.from(await file.arrayBuffer());
		writeFileSync(join(uploadDir, fileName), buffer);

		const docId = crypto.randomUUID();
		const document = {
			id: docId,
			name: safeName,
			type,
			url: `/uploads/${id}/${fileName}`,
			uploadDate: new Date(),
			size: file.size,
		};

		// Append document to property in DB
		await connectDB();
		await PropertyModel.updateOne({ id }, { $push: { documents: document } });

		return NextResponse.json({ document }, { status: 201 });
	} catch (error) {
		console.error("Error uploading document:", error);
		return NextResponse.json(
			{ error: "Failed to upload document" },
			{ status: 500 },
		);
	}
}

// DELETE /api/properties/[id]/documents?docId=xxx
export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await params;
		const { searchParams } = new URL(request.url);
		const docId = searchParams.get("docId");

		if (!docId) {
			return NextResponse.json({ error: "docId is required" }, { status: 400 });
		}

		await connectDB();
		await PropertyModel.updateOne(
			{ id },
			{ $pull: { documents: { id: docId } } },
		);

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Error deleting document:", error);
		return NextResponse.json(
			{ error: "Failed to delete document" },
			{ status: 500 },
		);
	}
}
