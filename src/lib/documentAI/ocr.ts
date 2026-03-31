/**
 * OCR service: Google Vision API (primary) with Tesseract.js fallback.
 *
 * Extracts raw text from PDF and image files.
 * Caches the OCR result on the document record to avoid reprocessing.
 */

import { ImageAnnotatorClient } from "@google-cloud/vision";

let visionClient: ImageAnnotatorClient | null = null;

function getVisionClient(): ImageAnnotatorClient | null {
	if (visionClient) return visionClient;
	if (
		!process.env.GOOGLE_VISION_API_KEY &&
		!process.env.GOOGLE_APPLICATION_CREDENTIALS
	) {
		return null;
	}
	visionClient = new ImageAnnotatorClient(
		process.env.GOOGLE_VISION_API_KEY
			? { apiKey: process.env.GOOGLE_VISION_API_KEY }
			: undefined,
	);
	return visionClient;
}

/* ── Google Vision OCR ───────────────────────────────── */

async function extractTextWithVision(
	buffer: Buffer,
	mimeType: string,
): Promise<string> {
	const client = getVisionClient();
	if (!client) throw new Error("Google Vision not configured");

	const [result] = await client.documentTextDetection({
		image: { content: buffer.toString("base64") },
		imageContext: {
			languageHints: ["en"],
		},
	});

	return result.fullTextAnnotation?.text ?? "";
}

/* ── PDF text extraction via pdfjs-dist (server-side) ── */

async function extractTextFromPDFBuffer(buffer: Buffer): Promise<string> {
	const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

	const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) })
		.promise;

	const pages: string[] = [];
	for (let i = 1; i <= pdf.numPages; i++) {
		const page = await pdf.getPage(i);
		const content = await page.getTextContent();
		const strings = content.items
			.filter((item: Record<string, unknown>) => "str" in item)
			.map((item: Record<string, unknown>) => item.str as string);
		pages.push(strings.join(" "));
	}

	return pages.join("\n");
}

/* ── Tesseract.js fallback (server-side) ─────────────── */

async function extractTextWithTesseract(buffer: Buffer): Promise<string> {
	const Tesseract = await import("tesseract.js");
	const { data } = await Tesseract.recognize(buffer, "eng");
	return data.text;
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
 * 1. For PDFs: try pdfjs-dist text extraction first (free, fast).
 *    If the PDF has minimal text (scanned), fall through to OCR.
 * 2. For images or scanned PDFs: try Google Vision API.
 *    If Vision not configured, fall back to Tesseract.js.
 */
export async function extractText(
	buffer: Buffer,
	mimeType: string,
	fileName: string,
): Promise<string> {
	const kind = detectFileKind(mimeType, fileName);

	// Try native PDF text extraction first (cheapest)
	if (kind === "pdf") {
		const pdfText = await extractTextFromPDFBuffer(buffer).catch(() => "");
		// If we got meaningful text (>50 chars), use it
		if (pdfText.trim().length > 50) {
			return pdfText;
		}
		// Otherwise, the PDF is likely scanned — fall through to OCR
	}

	// Try Google Vision (primary OCR)
	const visionAvailable = getVisionClient() !== null;
	if (visionAvailable) {
		try {
			// For PDFs, Vision supports up to 5 pages in a single sync request.
			// For longer PDFs, we'd need to use async batch annotation (not implemented here).
			const text = await extractTextWithVision(buffer, mimeType);
			if (text.trim().length > 0) return text;
		} catch (err) {
			console.warn(
				"[OCR] Google Vision failed, falling back to Tesseract:",
				err,
			);
		}
	}

	// Fallback: Tesseract.js (free, runs locally)
	if (kind === "image" || kind === "pdf") {
		const text = await extractTextWithTesseract(buffer);
		return text;
	}

	return "";
}
