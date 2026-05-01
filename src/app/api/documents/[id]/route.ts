/**
 * GET    /api/documents/[id]  — Get single document with full details
 * DELETE /api/documents/[id]  — Delete document + chunks + images
 * PATCH  /api/documents/[id]  — Re-index or update document metadata
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
import {
	AIDocumentModel,
	DocumentChunkModel,
	DocumentImageModel,
} from "@/models/AIDocument";
import {
	DeleteObjectCommand,
	GetObjectCommand,
	PutObjectCommand,
} from "@aws-sdk/client-s3";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "plotfolio_session";
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

async function getAuthUserId(): Promise<string | null> {
	const cookieStore = await cookies();
	const session = cookieStore.get(SESSION_COOKIE)?.value;
	if (!session) return null;
	const [, userId] = session.split(":");
	return userId ?? null;
}

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
				accessLevel: doc.accessLevel ?? "public",
				watermark: doc.watermark ?? null,
				aiProcessed: doc.aiProcessed ?? false,
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
		const authUserId = await getAuthUserId();
		if (!authUserId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const doc = await AIDocumentModel.findById(id);
		if (!doc) {
			return NextResponse.json(
				{ error: "Document not found" },
				{ status: 404 },
			);
		}

		if (doc.userId !== authUserId) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}

		const body = await req.json();

		// Re-index the document
		if (body.reindex && doc.ocrText && doc.ocrText.trim().length > 50) {
			const chunksCreated = await indexDocument(id, doc.ocrText);
			doc.indexed = true;
			await doc.save();
			return NextResponse.json({ reindexed: true, chunksCreated });
		}

		if (body.reextract === true) {
			let key: string;
			try {
				const url = new URL(doc.fileUrl);
				key = decodeURIComponent(url.pathname.slice(1));
			} catch {
				const split = doc.fileUrl.split(".backblazeb2.com/")[1];
				if (!split) {
					return NextResponse.json(
						{ error: "Invalid storage key for document" },
						{ status: 400 },
					);
				}
				key = split;
			}

			const object = await b2.send(
				new GetObjectCommand({ Bucket: B2_BUCKET, Key: key }),
			);
			if (!object.Body) {
				return NextResponse.json(
					{ error: "Stored file body is empty" },
					{ status: 400 },
				);
			}

			const bytes = await object.Body.transformToByteArray();
			const buffer = Buffer.from(bytes);

			let ocrText = "";
			let extractedData: Record<string, unknown> = {};
			let confidence = 0;
			let detectedType = doc.documentType;
			let preExtractedPdfImages: Awaited<
				ReturnType<typeof extractImagesFromPDF>
			> | null = null;

			const isImageFile = IMAGE_MIME_TYPES.includes(doc.mimeType);

			if (doc.mimeType === "text/html") {
				ocrText = buffer
					.toString("utf-8")
					.replace(/<[^>]*>/g, " ")
					.replace(/\s+/g, " ")
					.trim();
			} else if (isImageFile) {
				try {
					const result = await extractStructuredDataFromImage(
						buffer,
						doc.mimeType,
					);
					ocrText = result.ocrText;
					extractedData = result.data as Record<string, unknown>;
					confidence = result.confidence;
					detectedType = result.documentType;
				} catch (err) {
					if (isRateLimitError(err)) {
						ocrText = await extractTextWithLocalOcr(buffer);
					} else {
						throw err;
					}
				}
			} else {
				ocrText = await extractText(buffer, doc.mimeType, doc.fileName);

				if (doc.mimeType === "application/pdf" && ocrText.trim().length <= 30) {
					preExtractedPdfImages = await extractImagesFromPDF(buffer, {
						maxPages: 5,
						maxImages: 5,
					});
					if (preExtractedPdfImages.length > 0) {
						const bestImage = [...preExtractedPdfImages].sort(
							(a, b) => b.width * b.height - a.width * a.height,
						)[0];
						console.log(
							`[document-patch] Found ${preExtractedPdfImages.length} XObject image(s); using largest (${bestImage.width}x${bestImage.height}).`,
						);

						try {
							const visionResult = await extractStructuredDataFromImage(
								bestImage.imageBuffer,
								bestImage.mimeType,
							);
							ocrText = visionResult.ocrText;
							extractedData = visionResult.data as Record<string, unknown>;
							confidence = visionResult.confidence;
							detectedType = visionResult.documentType;
						} catch (err) {
							if (isRateLimitError(err)) {
								ocrText = await extractTextWithLocalOcr(bestImage.imageBuffer);
							} else {
								throw err;
							}
						}
					} else {
						// No embedded XObject images — PDF likely uses inline image operators.
						// Send the PDF directly to the vision LLM (Gemini supports PDFs natively).
						console.log(
							"[document-patch] No XObject images found; sending PDF directly to vision LLM.",
						);
						try {
							const visionResult = await extractStructuredDataFromImage(
								buffer,
								"application/pdf",
							);
							ocrText = visionResult.ocrText;
							extractedData = visionResult.data as Record<string, unknown>;
							confidence = visionResult.confidence;
							detectedType = visionResult.documentType;
							console.log(
								`[document-patch] PDF direct vision: ${ocrText.length} chars, confidence ${visionResult.confidence}.`,
							);
						} catch (err) {
							if (isRateLimitError(err)) {
								console.warn(
									"[document-patch] PDF direct vision rate-limited; using local OCR.",
								);
								try {
									const localText = await extractTextWithLocalOcr(buffer);
									if (localText.trim().length > 0) ocrText = localText;
								} catch {
									// ignore
								}
							} else {
								console.error(
									"[document-patch] PDF direct vision failed:",
									err,
								);
							}
						}
					}
				}

				if (ocrText.trim().length > 30) {
					const result = await extractStructuredData(ocrText);
					extractedData = result.data as Record<string, unknown>;
					confidence = result.confidence;
					detectedType = result.documentType;
				}
			}

			doc.ocrText = ocrText;
			doc.extractedData = extractedData;
			doc.confidence = confidence;
			doc.documentType = detectedType;
			doc.aiProcessed =
				ocrText.trim().length > 30 ||
				Object.keys(extractedData).length > 0 ||
				confidence > 0;
			doc.indexed = false;
			await doc.save();

			await DocumentChunkModel.deleteMany({ documentId: id });

			setImmediate(async () => {
				if (doc.mimeType !== "application/pdf") return;
				try {
					const extracted =
						preExtractedPdfImages ?? (await extractImagesFromPDF(buffer));
					if (extracted.length === 0) return;

					await DocumentImageModel.deleteMany({ documentId: id });
					const uploaded = await uploadExtractedImages(id, extracted);
					for (const img of uploaded) {
						await DocumentImageModel.create({
							documentId: id,
							imageUrl: img.imageUrl,
							pageNumber: img.pageNumber,
						});
					}
				} catch (err) {
					console.error(
						"[document-patch] Re-extract image refresh failed:",
						err,
					);
				}
			});

			return NextResponse.json({
				reextracted: true,
				document: {
					id: String(doc._id),
					userId: doc.userId,
					propertyIds: doc.propertyIds ?? [],
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
					indexed: doc.indexed,
					createdAt: doc.createdAt,
					updatedAt: doc.updatedAt,
				},
			});
		}

		if (typeof body.htmlContent === "string") {
			const htmlContent = body.htmlContent;
			const nextName =
				typeof body.fileName === "string" && body.fileName.trim()
					? body.fileName.trim()
					: doc.fileName;

			let key: string;
			try {
				const url = new URL(doc.fileUrl);
				key = decodeURIComponent(url.pathname.slice(1));
			} catch {
				const split = doc.fileUrl.split(".backblazeb2.com/")[1];
				if (!split) {
					return NextResponse.json(
						{ error: "Invalid storage key for document" },
						{ status: 400 },
					);
				}
				key = split;
			}

			const htmlBuffer = Buffer.from(htmlContent, "utf-8");
			await b2.send(
				new PutObjectCommand({
					Bucket: B2_BUCKET,
					Key: key,
					Body: htmlBuffer,
					ContentType: "text/html",
				}),
			);

			doc.fileName = nextName;
			doc.fileSize = htmlBuffer.length;
			doc.mimeType = "text/html";
			doc.ocrText = htmlContent
				.replace(/<[^>]*>/g, " ")
				.replace(/\s+/g, " ")
				.trim();
			doc.indexed = false;

			// Content changed, so old embeddings become stale.
			await DocumentChunkModel.deleteMany({ documentId: id });
		}

		// Update metadata fields
		if (body.propertyIds !== undefined) doc.propertyIds = body.propertyIds;
		if (body.documentType !== undefined) doc.documentType = body.documentType;
		if (body.accessLevel !== undefined) {
			const valid = ["public", "request_required", "private"];
			if (!valid.includes(body.accessLevel)) {
				return NextResponse.json(
					{ error: "Invalid accessLevel" },
					{ status: 400 },
				);
			}
			doc.accessLevel = body.accessLevel;
		}
		if (body.watermark !== undefined) doc.watermark = body.watermark;
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
