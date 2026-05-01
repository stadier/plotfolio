/**
 * One-shot migration: copy property.documents[] entries into the unified
 * AIDocumentModel collection, then drop the documents field from properties.
 *
 * Idempotent: safe to run multiple times. We skip property docs whose fileUrl
 * already exists in the AIDocumentModel collection for the same property.
 *
 * Trigger: POST /api/admin/migrate-documents
 */

import connectDB from "@/lib/mongoose";
import { AIDocumentModel } from "@/models/AIDocument";
import { DocumentAccessRequestModel, PropertyModel } from "@/models/Property";
import { DocumentAccessLevel } from "@/types/property";
import { NextResponse } from "next/server";

function mimeFromUrl(url: string): string {
	const ext = url.split(".").pop()?.toLowerCase().split("?")[0] ?? "";
	const map: Record<string, string> = {
		pdf: "application/pdf",
		jpg: "image/jpeg",
		jpeg: "image/jpeg",
		png: "image/png",
		webp: "image/webp",
		gif: "image/gif",
		svg: "image/svg+xml",
		mp4: "video/mp4",
		mov: "video/quicktime",
		webm: "video/webm",
		mp3: "audio/mpeg",
		wav: "audio/wav",
		doc: "application/msword",
		docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		xls: "application/vnd.ms-excel",
		xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		txt: "text/plain",
	};
	return map[ext] ?? "application/octet-stream";
}

export async function POST() {
	try {
		await connectDB();

		const properties = (await PropertyModel.find(
			{ documents: { $exists: true, $ne: [] } },
			{ id: 1, owner: 1, documents: 1 },
		).lean()) as unknown as Array<{
			id: string;
			owner?: { id?: string };
			documents?: Array<{
				id: string;
				name: string;
				type: string;
				url: string;
				uploadDate?: Date;
				size?: number;
				accessLevel?: string;
				watermark?: Record<string, unknown> | null;
			}>;
		}>;

		let createdCount = 0;
		let skippedCount = 0;
		const idMap: Array<{
			propertyId: string;
			oldId: string;
			newId: string;
		}> = [];

		for (const property of properties) {
			const ownerId = property.owner?.id ?? "unknown";
			for (const doc of property.documents ?? []) {
				// Skip if already migrated (same fileUrl on same property).
				const existing = await AIDocumentModel.findOne({
					fileUrl: doc.url,
					propertyIds: property.id,
				})
					.select("_id")
					.lean();

				if (existing) {
					skippedCount++;
					idMap.push({
						propertyId: property.id,
						oldId: doc.id,
						newId: String((existing as { _id: unknown })._id),
					});
					continue;
				}

				const created = await AIDocumentModel.create({
					userId: ownerId,
					propertyIds: [property.id],
					fileUrl: doc.url,
					fileName: doc.name,
					fileSize: doc.size ?? 0,
					mimeType: mimeFromUrl(doc.url),
					documentType: doc.type,
					accessLevel: doc.accessLevel ?? DocumentAccessLevel.PUBLIC,
					watermark: doc.watermark ?? null,
					aiProcessed: false,
					indexed: false,
					createdAt: doc.uploadDate ?? new Date(),
				});

				createdCount++;
				idMap.push({
					propertyId: property.id,
					oldId: doc.id,
					newId: String(created._id),
				});
			}
		}

		// Update existing access requests so they reference the new
		// AIDocument _id instead of the legacy embedded UUID.
		let accessRequestsUpdated = 0;
		for (const m of idMap) {
			const res = await DocumentAccessRequestModel.updateMany(
				{ propertyId: m.propertyId, documentId: m.oldId },
				{ $set: { documentId: m.newId } },
			);
			accessRequestsUpdated += res.modifiedCount;
		}

		// Drop the documents field from every property.
		const dropResult = await PropertyModel.updateMany(
			{},
			{ $unset: { documents: 1 } },
		);

		return NextResponse.json({
			success: true,
			propertiesScanned: properties.length,
			documentsCreated: createdCount,
			documentsSkipped: skippedCount,
			accessRequestsUpdated,
			propertiesCleared: dropResult.modifiedCount,
		});
	} catch (error) {
		console.error("[migrate-documents] failed:", error);
		return NextResponse.json(
			{
				error: "Migration failed",
				message: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 },
		);
	}
}
