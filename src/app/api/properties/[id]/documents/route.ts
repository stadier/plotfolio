import { b2, B2_BUCKET } from "@/lib/b2";
import connectDB from "@/lib/mongoose";
import { PropertyModel } from "@/models/Property";
import { DocumentAccessLevel, DocumentType } from "@/types/property";
import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";

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
		const key = `uploads/${id}/${fileName}`;

		// Upload to Backblaze B2
		const buffer = Buffer.from(await file.arrayBuffer());
		await b2.send(
			new PutObjectCommand({
				Bucket: B2_BUCKET,
				Key: key,
				Body: buffer,
				ContentType: file.type || "application/octet-stream",
			}),
		);

		const url = `https://${B2_BUCKET}.s3.us-east-005.backblazeb2.com/${key}`;

		const docId = crypto.randomUUID();
		const document = {
			id: docId,
			name: safeName,
			type,
			url,
			uploadDate: new Date(),
			size: file.size,
			accessLevel: DocumentAccessLevel.PUBLIC,
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

		// Find the document to get its URL/key before removing
		const property = await PropertyModel.findOne(
			{ id, "documents.id": docId },
			{ "documents.$": 1 },
		);
		const doc = property?.documents?.[0];
		if (doc?.url) {
			// Extract the key from the B2 URL
			const urlObj = new URL(doc.url);
			const key = urlObj.pathname.slice(1); // remove leading /
			await b2.send(new DeleteObjectCommand({ Bucket: B2_BUCKET, Key: key }));
		}

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

// PATCH /api/properties/[id]/documents - Update document access level or type
export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await params;
		const body = await request.json();
		const { docId, accessLevel, type } = body;

		if (!docId) {
			return NextResponse.json({ error: "docId is required" }, { status: 400 });
		}

		if (!accessLevel && !type) {
			return NextResponse.json(
				{ error: "accessLevel or type is required" },
				{ status: 400 },
			);
		}

		const updates: Record<string, string> = {};

		if (accessLevel) {
			if (!Object.values(DocumentAccessLevel).includes(accessLevel)) {
				return NextResponse.json(
					{ error: "Invalid access level" },
					{ status: 400 },
				);
			}
			updates["documents.$.accessLevel"] = accessLevel;
		}

		if (type) {
			if (!Object.values(DocumentType).includes(type)) {
				return NextResponse.json(
					{ error: "Invalid document type" },
					{ status: 400 },
				);
			}
			updates["documents.$.type"] = type;
		}

		await connectDB();

		const result = await PropertyModel.updateOne(
			{ id, "documents.id": docId },
			{ $set: updates },
		);

		if (result.matchedCount === 0) {
			return NextResponse.json(
				{ error: "Property or document not found" },
				{ status: 404 },
			);
		}

		return NextResponse.json({ success: true, accessLevel, type });
	} catch (error) {
		console.error("Error updating document:", error);
		return NextResponse.json(
			{ error: "Failed to update document" },
			{ status: 500 },
		);
	}
}
