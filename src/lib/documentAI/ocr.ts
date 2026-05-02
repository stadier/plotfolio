/**
 * OCR service: pdf-parse (text PDFs) → vision LLM (images/scanned) → Tesseract.js (fallback).
 *
 * Strategy:
 * 1. PDFs with embedded text → pdf-parse (free, instant)
 * 2. Image files or scanned PDFs → OpenAI/Kimi vision model (layout-aware, handles diagrams)
 * 3. No vision model configured → Tesseract.js (free, text-only)
 */

import { getProviderChain, runWithFallback } from "@/lib/aiProvider";
import path from "path";

/* ── Vision LLM OCR ──────────────────────────────────── */

async function extractTextWithVisionLLM(
	buffer: Buffer,
	mimeType: string,
): Promise<string> {
	const base64 = buffer.toString("base64");
	const dataUrl = `data:${mimeType};base64,${base64}`;

	const response = await runWithFallback(
		(client, model) =>
			client.chat.completions.create({
				model,
				temperature: 0,
				messages: [
					{
						role: "user",
						content: [
							{
								type: "text",
								text: "Extract all text from this document image exactly as it appears. Include all labels, measurements, numbers, names, dates, and annotations. Preserve the logical reading order.",
							},
							{
								type: "image_url",
								image_url: { url: dataUrl, detail: "high" },
							},
						],
					},
				],
			}),
		{ requireVision: true, hasVision: true },
	);

	return response.choices[0]?.message?.content ?? "";
}

/* ── PDF text extraction via pdf-parse (server-side, no worker needed) ── */

async function extractTextFromPDFBuffer(buffer: Buffer): Promise<string> {
	// Import from the lib path to skip pdf-parse v1's index.js test-file side-effect.
	// This path uses a standalone pre-bundled pdfjs with no worker thread requirement.
	const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default;
	const result = await pdfParse(buffer);
	return result.text ?? "";
}

/* ── Tesseract.js fallback (server-side) ─────────────── */

async function extractTextWithTesseract(buffer: Buffer): Promise<string> {
	const { createWorker } = await import("tesseract.js");
	const worker = await createWorker("eng", 1, {
		workerPath: path.join(
			process.cwd(),
			"node_modules/tesseract.js/src/worker-script/node/index.js",
		),
	});

	try {
		const { data } = await worker.recognize(buffer);
		return data.text;
	} finally {
		await worker.terminate();
	}
}

/** Local-only OCR for image buffers (no external AI provider calls). */
export async function extractTextWithLocalOcr(buffer: Buffer): Promise<string> {
	return extractTextWithTesseract(buffer);
}

/* ── Detect file kind ────────────────────────────────── */

type FileKind = "pdf" | "image" | "unknown";

function detectFileKind(mimeType: string, fileName: string): FileKind {
	if (mimeType === "application/pdf" || fileName.endsWith(".pdf")) return "pdf";
	if (
		mimeType.startsWith("image/") ||
		/\.(jpe?g|png|webp|bmp|tiff?)$/i.test(fileName)
	)
		return "image";
	return "unknown";
}

/* ── Main OCR function ───────────────────────────────── */

/**
 * Extract text from a document file (PDF or image).
 *
 * Strategy:
 * 1. PDFs with embedded text: pdfjs-dist (free, instant).
 * 2. Image files or scanned PDFs: vision LLM (layout-aware, handles diagrams).
 * 3. No vision model available: Tesseract.js (free, text-only fallback).
 */
export async function extractText(
	buffer: Buffer,
	mimeType: string,
	fileName: string,
): Promise<string> {
	const kind = detectFileKind(mimeType, fileName);

	// 1. Try native PDF text extraction first (cheapest)
	if (kind === "pdf") {
		const pdfText = await extractTextFromPDFBuffer(buffer).catch((err) => {
			console.error("[OCR] pdf-parse failed:", err);
			return "";
		});
		console.log(`[OCR] pdf-parse extracted ${pdfText.trim().length} chars`);
		if (pdfText.trim().length > 50) {
			return pdfText;
		}
		// PDF has minimal text — likely scanned, fall through to vision/OCR
	}

	// 2. Vision LLM (handles diagrams, stamps, layout — much better than Tesseract)
	if (kind === "image" || kind === "pdf") {
		// For scanned PDFs, vision models expect an image. This module does not yet
		// rasterize PDF pages, so local OCR fallback is only safe for actual image files.
		const isImageFile = kind === "image";
		const hasVisionProvider =
			getProviderChain({ requireVision: true }).length > 0;
		if (isImageFile && hasVisionProvider) {
			try {
				const text = await extractTextWithVisionLLM(buffer, mimeType);
				if (text.trim().length > 0) return text;
			} catch (err) {
				console.warn(
					"[OCR] Vision LLM failed, falling back to Tesseract:",
					err,
				);
			}
		}

		// 3. Tesseract.js fallback for image files only
		if (isImageFile) {
			try {
				return await extractTextWithTesseract(buffer);
			} catch (err) {
				console.warn("[OCR] Tesseract fallback unavailable:", err);
			}
		}

		return "";
	}

	return "";
}
