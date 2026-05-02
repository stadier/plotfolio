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
import {
	extractStructuredData,
	extractStructuredDataFromImage,
} from "@/lib/documentAI/extraction";
import { indexDocument } from "@/lib/documentAI/indexing";
import { extractText, extractTextWithLocalOcr } from "@/lib/documentAI/ocr";
import connectDB from "@/lib/mongoose";
import { AIDocumentModel, DocumentImageModel } from "@/models/AIDocument";
import type { AIDocumentType } from "@/types/document";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

const IMAGE_MIME_TYPES = [
	"image/jpeg",
	"image/png",
	"image/webp",
	"image/tiff",
	"image/bmp",
];

function isRateLimitError(error: unknown): boolean {
	if (!error || typeof error !== "object") return false;
	const err = error as { status?: number; message?: string };
	if (err.status === 429) return true;
	return (
		typeof err.message === "string" && /\b429\b|rate limit/i.test(err.message)
	);
}

function hasMeaningfulExtraction(doc: {
	ocrText?: string | null;
	extractedData?: unknown;
	confidence?: number | null;
}): boolean {
	const textLen = doc.ocrText?.trim().length ?? 0;
	const dataCount =
		doc.extractedData && typeof doc.extractedData === "object"
			? Object.keys(doc.extractedData as Record<string, unknown>).length
			: 0;
	const confidence = doc.confidence ?? 0;
	return textLen > 30 || dataCount > 0 || confidence > 0;
}

async function extractDocumentData({
	buffer,
	file,
	fileUrl,
	documentTypeHint,
}: {
	buffer: Buffer;
	file: File;
	fileUrl: string;
	documentTypeHint?: string;
}): Promise<{
	ocrText: string;
	extractedData: Record<string, unknown>;
	confidence: number;
	detectedType: AIDocumentType;
	pageImages: Array<{ imageUrl: string; pageNumber: number }>;
	preExtractedPdfImages: Awaited<
		ReturnType<typeof extractImagesFromPDF>
	> | null;
}> {
	let ocrText = "";
	let extractedData: Record<string, unknown> = {};
	let confidence = 0;
	let detectedType: AIDocumentType =
		(documentTypeHint as AIDocumentType) || "other";
	const pageImages: Array<{ imageUrl: string; pageNumber: number }> = [];
	let preExtractedPdfImages: Awaited<
		ReturnType<typeof extractImagesFromPDF>
	> | null = null;

	const isImageFile = IMAGE_MIME_TYPES.includes(file.type);

	if (file.type === "text/html") {
		ocrText = buffer
			.toString("utf-8")
			.replace(/<[^>]*>/g, " ")
			.replace(/\s+/g, " ")
			.trim();
	} else if (isImageFile) {
		try {
			const result = await extractStructuredDataFromImage(buffer, file.type);
			ocrText = result.ocrText;
			extractedData = result.data as Record<string, unknown>;
			confidence = result.confidence;
			if (!documentTypeHint) detectedType = result.documentType;

			pageImages.push({ imageUrl: fileUrl, pageNumber: 1 });
		} catch (err) {
			console.error("[document-upload] Vision extraction failed:", err);
		}
	} else {
		try {
			ocrText = await extractText(buffer, file.type, file.name);
		} catch (err) {
			console.error("[document-upload] OCR failed:", err);
		}

		if (file.type === "application/pdf" && ocrText.trim().length <= 30) {
			try {
				preExtractedPdfImages = await extractImagesFromPDF(buffer, {
					maxPages: 5,
					maxImages: 5,
				});
				if (preExtractedPdfImages.length > 0) {
					const bestImage = [...preExtractedPdfImages].sort(
						(a, b) => b.width * b.height - a.width * a.height,
					)[0];
					console.log(
						`[document-upload] Found ${preExtractedPdfImages.length} XObject image(s) in PDF; using largest (${bestImage.width}x${bestImage.height}).`,
					);

					try {
						const visionResult = await extractStructuredDataFromImage(
							bestImage.imageBuffer,
							bestImage.mimeType,
						);

						ocrText = visionResult.ocrText;
						extractedData = visionResult.data as Record<string, unknown>;
						confidence = visionResult.confidence;
						if (!documentTypeHint) {
							detectedType = visionResult.documentType;
						}
					} catch (err) {
						if (isRateLimitError(err)) {
							console.warn(
								"[document-upload] Vision rate-limited during scanned PDF fallback; using local OCR.",
							);
						} else {
							console.error(
								"[document-upload] Scanned PDF vision fallback failed:",
								err,
							);
						}

						const localText = await extractTextWithLocalOcr(
							bestImage.imageBuffer,
						);
						if (localText.trim().length > 0) {
							ocrText = localText;
						}
					}
				} else {
					// No embedded XObject images — PDF likely uses inline image operators.
					// Send the PDF directly to the vision LLM (Gemini supports PDFs natively).
					console.log(
						"[document-upload] No XObject images found in PDF; sending PDF directly to vision LLM.",
					);
					try {
						const visionResult = await extractStructuredDataFromImage(
							buffer,
							"application/pdf",
						);
						ocrText = visionResult.ocrText;
						extractedData = visionResult.data as Record<string, unknown>;
						confidence = visionResult.confidence;
						if (!documentTypeHint) detectedType = visionResult.documentType;
						console.log(
							`[document-upload] PDF direct vision: ${ocrText.length} chars, confidence ${visionResult.confidence}.`,
						);
					} catch (err) {
						if (isRateLimitError(err)) {
							console.warn(
								"[document-upload] PDF direct vision rate-limited; using local OCR.",
							);
						} else {
							console.error("[document-upload] PDF direct vision failed:", err);
						}
						try {
							const localText = await extractTextWithLocalOcr(buffer);
							if (localText.trim().length > 0) ocrText = localText;
						} catch {
							// ignore
						}
					}
				}
			} catch (err) {
				console.error("[document-upload] Scanned PDF fallback failed:", err);
			}
		}
	}

	if (!isImageFile && ocrText.trim().length > 30) {
		try {
			const result = await extractStructuredData(ocrText);
			extractedData = result.data as Record<string, unknown>;
			confidence = result.confidence;
			if (!documentTypeHint) detectedType = result.documentType;
		} catch (err) {
			console.error("[document-upload] LLM extraction failed:", err);
		}
	}

	return {
		ocrText,
		extractedData,
		confidence,
		detectedType,
		pageImages,
		preExtractedPdfImages,
	};
}

export async function POST(req: NextRequest) {
	try {
		await connectDB();

		const formData = await req.formData();
		const file = formData.get("file") as File | null;
		const userId = formData.get("userId") as string | null;
		const propertyIdsRaw = formData.get("propertyIds") as string | null;
		const propertyIds: string[] = propertyIdsRaw
			? propertyIdsRaw
					.split(",")
					.map((s) => s.trim())
					.filter(Boolean)
			: [];
		const documentTypeHint =
			(formData.get("documentType") as string) || undefined;
		const accessLevelRaw = (formData.get("accessLevel") as string) || "public";
		const accessLevel = ["public", "request_required", "private"].includes(
			accessLevelRaw,
		)
			? accessLevelRaw
			: "public";
		const watermarkRaw = formData.get("watermark") as string | null;
		let watermark: Record<string, unknown> | null = null;
		if (watermarkRaw) {
			try {
				watermark = JSON.parse(watermarkRaw);
			} catch {
				watermark = null;
			}
		}
		const skipIndexing = formData.get("skipIndexing") === "true";
		let skipAi = formData.get("skipAi") === "true";
		const forceUpload = formData.get("forceUpload") === "true";

		// Honour the per-user "AI document processing" preference. Unless the
		// user has explicitly opted in (it's a paid feature), every upload
		// behaves as if `skipAi=true` so the file is stored as-is and no
		// OCR / extraction work runs.
		if (!skipAi && userId) {
			try {
				const { UserModel } = await import("@/models/User");
				await connectDB();
				const u = await UserModel.findOne({ id: userId })
					.select("settings")
					.lean<{ settings?: { aiDocumentProcessing?: boolean } }>();
				if (!u?.settings?.aiDocumentProcessing) {
					skipAi = true;
				}
			} catch (err) {
				// If the lookup fails, fall back to the safer default (no AI).
				console.warn("Could not read AI preference, defaulting to skipAi", err);
				skipAi = true;
			}
		}

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

		const allowedTypes = ["application/pdf", ...IMAGE_MIME_TYPES, "text/html"];
		if (!allowedTypes.includes(file.type)) {
			return NextResponse.json(
				{ error: "Unsupported file type. Upload PDF or image files." },
				{ status: 400 },
			);
		}

		const buffer = Buffer.from(await file.arrayBuffer());
		const fileHash = createHash("sha256").update(buffer).digest("hex");

		if (!forceUpload) {
			const existingDoc = await AIDocumentModel.findOne({
				userId,
				fileHash,
			}).sort({ createdAt: -1 });

			if (existingDoc) {
				if (propertyIds.length > 0) {
					existingDoc.propertyIds = Array.from(
						new Set([...(existingDoc.propertyIds ?? []), ...propertyIds]),
					);
				}

				let pageImages: Array<{ imageUrl: string; pageNumber: number }> = [];
				if (!skipAi && !hasMeaningfulExtraction(existingDoc)) {
					const extracted = await extractDocumentData({
						buffer,
						file,
						fileUrl: existingDoc.fileUrl,
						documentTypeHint,
					});

					existingDoc.ocrText = extracted.ocrText;
					existingDoc.extractedData = extracted.extractedData;
					existingDoc.confidence = extracted.confidence;
					existingDoc.documentType = extracted.detectedType;
					existingDoc.aiProcessed =
						extracted.ocrText.trim().length > 30 ||
						Object.keys(extracted.extractedData).length > 0 ||
						extracted.confidence > 0;
					existingDoc.indexed = false;
					pageImages = extracted.pageImages;

					await DocumentImageModel.deleteMany({
						documentId: String(existingDoc._id),
					});
					for (const img of pageImages) {
						await DocumentImageModel.create({
							documentId: String(existingDoc._id),
							imageUrl: img.imageUrl,
							pageNumber: img.pageNumber,
						});
					}

					setImmediate(async () => {
						if (file.type === "application/pdf") {
							try {
								const extractedPdfImages =
									extracted.preExtractedPdfImages ??
									(await extractImagesFromPDF(buffer));
								if (extractedPdfImages.length > 0) {
									const uploaded = await uploadExtractedImages(
										String(existingDoc._id),
										extractedPdfImages,
									);
									for (const img of uploaded) {
										await DocumentImageModel.create({
											documentId: String(existingDoc._id),
											imageUrl: img.imageUrl,
											pageNumber: img.pageNumber,
										});
									}
								}
							} catch (err) {
								console.error(
									"[document-upload] Diagram extraction failed:",
									err,
								);
							}
						}

						if (!skipIndexing && extracted.ocrText.trim().length > 50) {
							try {
								await indexDocument(String(existingDoc._id), extracted.ocrText);
								await AIDocumentModel.updateOne(
									{ _id: String(existingDoc._id) },
									{ indexed: true },
								);
							} catch (err) {
								console.error("[document-upload] Indexing failed:", err);
							}
						}
					});
				}

				await existingDoc.save();

				return NextResponse.json({
					document: {
						id: String(existingDoc._id),
						userId: existingDoc.userId,
						propertyIds: existingDoc.propertyIds ?? [],
						fileUrl: existingDoc.fileUrl,
						fileName: existingDoc.fileName,
						fileSize: existingDoc.fileSize,
						mimeType: existingDoc.mimeType,
						documentType: existingDoc.documentType,
						accessLevel: existingDoc.accessLevel,
						watermark: existingDoc.watermark,
						aiProcessed: existingDoc.aiProcessed,
						ocrText: existingDoc.ocrText,
						extractedData: existingDoc.extractedData,
						confidence: existingDoc.confidence,
						indexed: existingDoc.indexed,
						createdAt: existingDoc.createdAt,
					},
					images: pageImages,
					chunksCreated: 0,
					duplicate: true,
					duplicateOf: String(existingDoc._id),
				});
			}
		}

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

		// 2. Text/OCR extraction + structured field extraction
		//
		// Image files: single vision LLM call — extracts text AND structured fields
		//   together with full layout awareness (handles diagrams, stamps, bearings).
		//   The image is also saved as page 1 in DocumentImages.
		//
		// Text PDFs: pdfjs-dist text extraction (free) → LLM field extraction.
		//
		// HTML: strip tags → LLM field extraction.
		//
		// Scanned PDFs with no embedded text: Tesseract.js → LLM field extraction.

		// 2. Text/OCR extraction + structured field extraction
		//
		// Image files: single vision LLM call — extracts text AND structured fields
		//   together with full layout awareness (handles diagrams, stamps, bearings).
		//   The image is also saved as page 1 in DocumentImages.
		//
		// Text PDFs: pdfjs-dist text extraction (free) → LLM field extraction.
		//
		// HTML: strip tags → LLM field extraction.
		//
		// Scanned PDFs with no embedded text: Tesseract.js → LLM field extraction.
		//
		// If skipAi is set, no extraction runs at all — the file is stored as a
		// plain document that the user can later "Process with AI" on demand.

		const extracted = skipAi
			? {
					ocrText: "",
					extractedData: {} as Record<string, unknown>,
					confidence: 0,
					detectedType: (documentTypeHint as AIDocumentType) || "other",
					pageImages: [] as Array<{ imageUrl: string; pageNumber: number }>,
					preExtractedPdfImages: null as Awaited<
						ReturnType<typeof extractImagesFromPDF>
					> | null,
				}
			: await extractDocumentData({
					buffer,
					file,
					fileUrl,
					documentTypeHint,
				});
		const {
			ocrText,
			extractedData,
			confidence,
			detectedType,
			pageImages,
			preExtractedPdfImages,
		} = extracted;

		// 4. Create document record
		const aiProcessed =
			!skipAi &&
			(ocrText.trim().length > 30 ||
				Object.keys(extractedData).length > 0 ||
				confidence > 0);
		const doc = await AIDocumentModel.create({
			userId,
			propertyIds,
			fileHash,
			fileUrl,
			fileName: file.name,
			fileSize: file.size,
			mimeType: file.type,
			documentType: detectedType,
			accessLevel,
			watermark,
			aiProcessed,
			ocrText,
			extractedData,
			confidence,
			indexed: false,
		});

		const documentId = String(doc._id);

		// 5. Save page images from the extraction step
		for (const img of pageImages) {
			await DocumentImageModel.create({
				documentId,
				imageUrl: img.imageUrl,
				pageNumber: img.pageNumber,
			});
		}

		// 6. Fire-and-forget: diagram extraction + vector indexing run after response is sent.
		// Neither is needed for the immediate extraction result shown to the user.
		setImmediate(async () => {
			if (file.type === "application/pdf") {
				try {
					const extracted =
						preExtractedPdfImages ?? (await extractImagesFromPDF(buffer));
					if (extracted.length > 0) {
						const uploaded = await uploadExtractedImages(documentId, extracted);
						for (const img of uploaded) {
							await DocumentImageModel.create({
								documentId,
								imageUrl: img.imageUrl,
								pageNumber: img.pageNumber,
							});
						}
					}
				} catch (err) {
					console.error("[document-upload] Diagram extraction failed:", err);
				}
			}

			if (!skipIndexing && ocrText.trim().length > 50) {
				try {
					await indexDocument(documentId, ocrText);
					await AIDocumentModel.updateOne(
						{ _id: documentId },
						{ indexed: true },
					);
				} catch (err) {
					console.error("[document-upload] Indexing failed:", err);
				}
			}
		});

		const chunksCreated = 0; // indexing is async; not known at response time

		return NextResponse.json({
			document: {
				id: documentId,
				userId: doc.userId,
				propertyIds: doc.propertyIds,
				fileUrl: doc.fileUrl,
				fileName: doc.fileName,
				fileSize: doc.fileSize,
				mimeType: doc.mimeType,
				documentType: doc.documentType,
				accessLevel: doc.accessLevel,
				watermark: doc.watermark,
				aiProcessed: doc.aiProcessed,
				ocrText: doc.ocrText,
				extractedData: doc.extractedData,
				confidence: doc.confidence,
				indexed: chunksCreated > 0,
				createdAt: doc.createdAt,
			},
			images: pageImages,
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
