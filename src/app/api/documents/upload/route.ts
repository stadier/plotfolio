/**
 * POST /api/documents/upload
 *
 * Upload a document (PDF/image), run the full AI pipeline:
 * 1. Upload file to B2 storage
 * 2. OCR text extraction (Google Vision / Tesseract)
 * 3. LLM structured data extraction
 * 4. Extract & store diagrams from PDFs
 * 5. Index text chunks for vector search
 *
 * Body: multipart/form-data
 *   - file: File (required)
 *   - userId: string (required)
 *   - propertyId: string (optional)
 *   - documentType: string (optional, auto-detected if omitted)
 *   - skipIndexing: "true" (optional, skip vector indexing)
 */

import { b2, B2_BUCKET } from "@/lib/b2";
import {
	extractImagesFromPDF,
	uploadExtractedImages,
} from "@/lib/documentAI/diagrams";
import { extractStructuredData } from "@/lib/documentAI/extraction";
import { indexDocument } from "@/lib/documentAI/indexing";
import { extractText } from "@/lib/documentAI/ocr";
import connectDB from "@/lib/mongoose";
import { AIDocumentModel, DocumentImageModel } from "@/models/AIDocument";
import type { AIDocumentType } from "@/types/document";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

export async function POST(req: NextRequest) {
	try {
		await connectDB();

		const formData = await req.formData();
		const file = formData.get("file") as File | null;
		const userId = formData.get("userId") as string | null;
		const propertyId = (formData.get("propertyId") as string) || undefined;
		const documentTypeHint =
			(formData.get("documentType") as string) || undefined;
		const skipIndexing = formData.get("skipIndexing") === "true";

		if (!file || !userId) {
			return NextResponse.json(
				{ error: "Missing required fields: file, userId" },
				{ status: 400 },
			);
		}

		if (file.size > MAX_FILE_SIZE) {
			return NextResponse.json(
				{ error: "File too large. Maximum size is 25 MB." },
				{ status: 400 },
			);
		}

		const allowedTypes = [
			"application/pdf",
			"image/jpeg",
			"image/png",
			"image/webp",
			"image/tiff",
			"image/bmp",
		];
		if (!allowedTypes.includes(file.type)) {
			return NextResponse.json(
				{ error: "Unsupported file type. Upload PDF or image files." },
				{ status: 400 },
			);
		}

		const buffer = Buffer.from(await file.arrayBuffer());

		// 1. Upload to B2 storage
		const safeName = file.name.replace(/[^a-zA-Z0-9._\- ]/g, "_");
		const key = `documents/${userId}/${Date.now()}_${safeName}`;

		await b2.send(
			new PutObjectCommand({
				Bucket: B2_BUCKET,
				Key: key,
				Body: buffer,
				ContentType: file.type,
			}),
		);

		const fileUrl = `https://${B2_BUCKET}.s3.us-east-005.backblazeb2.com/${key}`;

		// 2. OCR text extraction (cached on the document)
		let ocrText = "";
		try {
			ocrText = await extractText(buffer, file.type, file.name);
		} catch (err) {
			console.error("[document-upload] OCR failed:", err);
		}

		// 3. LLM structured data extraction
		let extractedData = {};
		let confidence = 0;
		let detectedType: AIDocumentType =
			(documentTypeHint as AIDocumentType) || "other";

		if (ocrText.trim().length > 30) {
			try {
				const result = await extractStructuredData(ocrText);
				extractedData = result.data;
				confidence = result.confidence;
				if (!documentTypeHint) {
					detectedType = result.documentType;
				}
			} catch (err) {
				console.error("[document-upload] LLM extraction failed:", err);
			}
		}

		// 4. Create document record
		const doc = await AIDocumentModel.create({
			userId,
			propertyId,
			fileUrl,
			fileName: file.name,
			fileSize: file.size,
			mimeType: file.type,
			documentType: detectedType,
			ocrText,
			extractedData,
			confidence,
			indexed: false,
		});

		const documentId = String(doc._id);

		// 5. Extract & store diagrams from PDFs
		const images: Array<{ imageUrl: string; pageNumber: number }> = [];
		if (file.type === "application/pdf") {
			try {
				const extracted = await extractImagesFromPDF(buffer);
				if (extracted.length > 0) {
					const uploaded = await uploadExtractedImages(documentId, extracted);
					for (const img of uploaded) {
						await DocumentImageModel.create({
							documentId,
							imageUrl: img.imageUrl,
							pageNumber: img.pageNumber,
						});
						images.push(img);
					}
				}
			} catch (err) {
				console.error("[document-upload] Diagram extraction failed:", err);
			}
		}

		// 6. Vector indexing (unless skipped)
		let chunksCreated = 0;
		if (!skipIndexing && ocrText.trim().length > 50) {
			try {
				chunksCreated = await indexDocument(documentId, ocrText);
				await AIDocumentModel.updateOne({ _id: documentId }, { indexed: true });
			} catch (err) {
				console.error("[document-upload] Indexing failed:", err);
			}
		}

		return NextResponse.json({
			document: {
				id: documentId,
				userId: doc.userId,
				propertyId: doc.propertyId,
				fileUrl: doc.fileUrl,
				fileName: doc.fileName,
				fileSize: doc.fileSize,
				mimeType: doc.mimeType,
				documentType: doc.documentType,
				extractedData: doc.extractedData,
				confidence: doc.confidence,
				indexed: chunksCreated > 0,
				createdAt: doc.createdAt,
			},
			images,
			chunksCreated,
		});
	} catch (error) {
		console.error("[document-upload] Failed:", error);
		return NextResponse.json(
			{ error: "Document upload failed" },
			{ status: 500 },
		);
	}
}
