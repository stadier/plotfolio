/**
 * Property document endpoints — thin wrapper around the unified DocumentModel.
 *
 * Documents are no longer stored on the property record. They live in the
 * `aidocuments` collection and are linked to properties via `propertyIds[]`.
 * These endpoints exist for backward compatibility with the property page UI.
 */

import { b2, B2_BUCKET } from "@/lib/b2";
import connectDB from "@/lib/mongoose";
import {
	AIDocumentModel,
	DocumentChunkModel,
	DocumentImageModel,
} from "@/models/AIDocument";
import { PropertyModel } from "@/models/Property";
import { DocumentAccessLevel, DocumentType } from "@/types/property";
import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";

// POST /api/properties/[id]/documents
// Accepts multipart/form-data with: file, type, name, [accessLevel]
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
		const accessLevel =
			(formData.get("accessLevel") as DocumentAccessLevel | null) ||
			DocumentAccessLevel.PUBLIC;

		if (!file || !type || !name) {
			return NextResponse.json(
				{ error: "file, type and name are required" },
				{ status: 400 },
			);
		}

		if (!Object.values(DocumentType).includes(type)) {
			return NextResponse.json(
				{ error: "Invalid document type" },
				{ status: 400 },
			);
		}

		await connectDB();

		// Resolve owner of the property so we can set userId on the document.
		const property = await PropertyModel.findOne({ id }).select("owner").lean();
		if (!property) {
			return NextResponse.json(
				{ error: "Property not found" },
				{ status: 404 },
			);
		}
		const ownerId =
			(property as { owner?: { id?: string } }).owner?.id ?? "unknown";

		// Sanitize filename and upload to B2.
		const safeName = name.replace(/[^a-zA-Z0-9._\- ]/g, "_");
		const timestamp = Date.now();
		const fileName = `${timestamp}_${safeName}`;
		const key = `uploads/${id}/${fileName}`;

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

		// Create the unified document record. AI processing is NOT triggered
		// from this path — the user can opt in later via "Process with AI".
		const doc = await AIDocumentModel.create({
			userId: ownerId,
			propertyIds: [id],
			fileUrl: url,
			fileName: safeName,
			fileSize: file.size,
			mimeType: file.type || "application/octet-stream",
			documentType: type,
			accessLevel,
			aiProcessed: false,
			indexed: false,
		});

		// Return shape mirrors the legacy PropertyDocument response so the
		// existing UI continues to work without changes.
		return NextResponse.json(
			{
				document: {
					id: String(doc._id),
					name: doc.fileName,
					type: doc.documentType,
					url: doc.fileUrl,
					uploadDate: doc.createdAt,
					size: doc.fileSize,
					accessLevel: doc.accessLevel,
					aiProcessed: doc.aiProcessed,
				},
			},
			{ status: 201 },
		);
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

		const doc = await AIDocumentModel.findById(docId);
		if (!doc) {
			return NextResponse.json(
				{ error: "Document not found" },
				{ status: 404 },
			);
		}

		// If the document is linked to multiple properties, just detach it
		// from this one rather than deleting the file.
		const linkedTo = doc.propertyIds ?? [];
		if (linkedTo.length > 1) {
			doc.propertyIds = linkedTo.filter((p) => p !== id);
			await doc.save();
			return NextResponse.json({ success: true, detached: true });
		}

		// Single-property document → fully delete file + DB records.
		try {
			const key = doc.fileUrl.split(".backblazeb2.com/")[1];
			if (key) {
				await b2.send(new DeleteObjectCommand({ Bucket: B2_BUCKET, Key: key }));
			}
		} catch (err) {
			console.warn("[property-doc-delete] B2 cleanup failed:", err);
		}

		const images = await DocumentImageModel.find({ documentId: docId });
		for (const img of images) {
			try {
				const imgKey = img.imageUrl.split(".backblazeb2.com/")[1];
				if (imgKey) {
					await b2.send(
						new DeleteObjectCommand({ Bucket: B2_BUCKET, Key: imgKey }),
					);
				}
			} catch {
				// best-effort
			}
		}

		await Promise.all([
			AIDocumentModel.deleteOne({ _id: docId }),
			DocumentChunkModel.deleteMany({ documentId: docId }),
			DocumentImageModel.deleteMany({ documentId: docId }),
		]);

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Error deleting document:", error);
		return NextResponse.json(
			{ error: "Failed to delete document" },
			{ status: 500 },
		);
	}
}

// PATCH /api/properties/[id]/documents - Update accessLevel, type, or watermark
export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await params;
		const body = await request.json();
		const { docId, accessLevel, type, watermark } = body;

		if (!docId) {
			return NextResponse.json({ error: "docId is required" }, { status: 400 });
		}

		if (!accessLevel && !type && watermark === undefined) {
			return NextResponse.json(
				{ error: "accessLevel, type, or watermark is required" },
				{ status: 400 },
			);
		}

		await connectDB();

		const doc = await AIDocumentModel.findById(docId);
		if (!doc || !(doc.propertyIds ?? []).includes(id)) {
			return NextResponse.json(
				{ error: "Document not found on property" },
				{ status: 404 },
			);
		}

		if (accessLevel) {
			if (!Object.values(DocumentAccessLevel).includes(accessLevel)) {
				return NextResponse.json(
					{ error: "Invalid access level" },
					{ status: 400 },
				);
			}
			doc.accessLevel = accessLevel;
		}

		if (type) {
			if (!Object.values(DocumentType).includes(type)) {
				return NextResponse.json(
					{ error: "Invalid document type" },
					{ status: 400 },
				);
			}
			doc.documentType = type;
		}

		if (watermark !== undefined) {
			if (watermark === null) {
				doc.watermark = null;
			} else {
				const allowed = ["seal", "platform", "text"];
				if (watermark.type && !allowed.includes(watermark.type)) {
					return NextResponse.json(
						{ error: "Invalid watermark type" },
						{ status: 400 },
					);
				}
				doc.watermark = watermark;
			}
		}

		await doc.save();

		return NextResponse.json({ success: true, accessLevel, type, watermark });
	} catch (error) {
		console.error("Error updating document:", error);
		return NextResponse.json(
			{ error: "Failed to update document" },
			{ status: 500 },
		);
	}
}
