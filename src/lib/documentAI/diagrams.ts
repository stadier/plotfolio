/**
 * PDF diagram/image extraction.
 *
 * Extracts embedded images from PDF files using pdfjs-dist,
 * uploads them to B2 storage, and links them to the document record.
 * Survey diagrams, floor plans, site maps, etc. are preserved as-is
 * without AI processing.
 */

import { b2, B2_BUCKET } from "@/lib/b2";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import path from "path";
import sharp from "sharp";
import { pathToFileURL } from "url";

interface ExtractedImage {
	imageBuffer: Buffer;
	mimeType: string;
	pageNumber: number;
	width: number;
	height: number;
}

interface ExtractImageOptions {
	maxPages?: number;
	maxImages?: number;
}

function configurePdfJsWorker(pdfjsLib: {
	GlobalWorkerOptions?: { workerSrc: string };
}) {
	if (!pdfjsLib.GlobalWorkerOptions) return;
	pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(
		path.join(
			process.cwd(),
			"node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
		),
	).href;
}

/**
 * Extract embedded images from a PDF buffer.
 * Uses pdfjs-dist to iterate pages and pull out image objects.
 */
export async function extractImagesFromPDF(
	buffer: Buffer,
	options: ExtractImageOptions = {},
): Promise<ExtractedImage[]> {
	const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
	configurePdfJsWorker(pdfjsLib);
	const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) })
		.promise;

	const images: ExtractedImage[] = [];
	const maxPages =
		typeof options.maxPages === "number" && options.maxPages > 0
			? options.maxPages
			: pdf.numPages;
	const maxImages =
		typeof options.maxImages === "number" && options.maxImages > 0
			? options.maxImages
			: Number.POSITIVE_INFINITY;
	const pagesToScan = Math.min(pdf.numPages, maxPages);

	for (let i = 1; i <= pagesToScan; i++) {
		const page = await pdf.getPage(i);
		const ops = await page.getOperatorList();

		for (let j = 0; j < ops.fnArray.length; j++) {
			// OPS.paintImageXObject = 85
			if (ops.fnArray[j] === 85) {
				const imgName = ops.argsArray[j]?.[0];
				if (!imgName) continue;

				try {
					const img = await page.objs.get(imgName);
					if (!img || !img.data || !img.width || !img.height) continue;

					// Skip tiny images (icons, bullets, etc.)
					if (img.width < 100 || img.height < 100) continue;

					// Convert raw pixel data to PNG using sharp
					const channels = img.data.length / (img.width * img.height);
					const pngBuffer = await sharp(Buffer.from(img.data), {
						raw: {
							width: img.width,
							height: img.height,
							channels: Math.min(channels, 4) as 1 | 2 | 3 | 4,
						},
					})
						.png()
						.toBuffer();

					images.push({
						imageBuffer: pngBuffer,
						mimeType: "image/png",
						pageNumber: i,
						width: img.width,
						height: img.height,
					});

					if (images.length >= maxImages) {
						return images;
					}
				} catch {
					// Skip images that can't be processed
				}
			}
		}
	}

	return images;
}

/**
 * Upload extracted images to B2 and return their URLs.
 */
export async function uploadExtractedImages(
	documentId: string,
	images: ExtractedImage[],
): Promise<Array<{ imageUrl: string; pageNumber: number }>> {
	const uploaded: Array<{ imageUrl: string; pageNumber: number }> = [];

	for (let i = 0; i < images.length; i++) {
		const img = images[i];
		const key = `document-images/${documentId}/${Date.now()}_page${img.pageNumber}_${i}.png`;

		await b2.send(
			new PutObjectCommand({
				Bucket: B2_BUCKET,
				Key: key,
				Body: img.imageBuffer,
				ContentType: img.mimeType,
			}),
		);

		const imageUrl = `https://${B2_BUCKET}.s3.us-east-005.backblazeb2.com/${key}`;
		uploaded.push({ imageUrl, pageNumber: img.pageNumber });
	}

	return uploaded;
}
