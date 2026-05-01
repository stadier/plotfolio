/**
 * Structured data extraction from OCR text (or directly from images) using LLM.
 *
 * Sends raw text — or a document image — to the active AI provider and receives
 * structured JSON matching the ExtractedPropertyData schema.
 * Includes auto-classification of document type and confidence scoring.
 */

import {
	getChatClient,
	getChatModel,
	providerSupportsVision,
} from "@/lib/aiProvider";
import type { ExtractedPropertyData } from "@/types/document";
import { AIDocumentType } from "@/types/document";

const RATE_LIMIT_COOLDOWN_MS = 5 * 60 * 1000;
let llmRateLimitedUntil = 0;

function emptyExtractionResult(): {
	data: ExtractedPropertyData;
	confidence: number;
	documentType: AIDocumentType;
} {
	return {
		data: {} as ExtractedPropertyData,
		confidence: 0,
		documentType: AIDocumentType.OTHER,
	};
}

function isRateLimitError(error: unknown): boolean {
	if (!error || typeof error !== "object") return false;
	const err = error as { status?: number; message?: string };
	if (err.status === 429) return true;
	return (
		typeof err.message === "string" && /\b429\b|rate limit/i.test(err.message)
	);
}

function isRateLimitedNow(): boolean {
	return Date.now() < llmRateLimitedUntil;
}

function markRateLimitedCooldown() {
	llmRateLimitedUntil = Date.now() + RATE_LIMIT_COOLDOWN_MS;
}

const EXTRACTION_PROMPT = `You are a document parser specializing in real estate and property documents from any country worldwide (survey plans, certificates of occupancy, contracts of sale, title deeds, lease agreements, building permits, allocation letters, etc.).

Given the raw text extracted from a document, return a JSON object with as many of these fields as you can identify. Only include fields you are confident about. Omit fields you cannot find.

Schema:
{
  "ownerName": "string - property owner, grantee, or buyer name",
  "plotSize": "string - area with units (e.g. '450 sqm', '2.5 acres')",
  "coordinates": ["string[] - coordinate strings found in the document"],
  "surveyNumber": "string - survey plan number, plot number, or file reference",
  "location": "string - full address or location description",
  "documentType": "string - one of: survey_plan, certificate_of_occupancy, contract_of_sale, title_deed, lease_agreement, building_permit, inspection_report, allocation_letter, other",
  "date": "string - primary date in YYYY-MM-DD format",
  "propertyType": "string - one of: land, house, apartment, building, office, retail, warehouse, farm, other",
  "zoning": "string - one of: residential, commercial, industrial, agricultural, mixed_use, unspecified",
  "area": "string - area in square metres (number only)",
  "taxId": "string - certificate number, registration number, or tax ID",
  "purchasePrice": "string - price/consideration (number only, no commas)",
  "currentValue": "string - current market value if mentioned (number only)",
  "boughtFrom": "string - seller, grantor, or previous owner name",
  "witnesses": ["string[] - witness names"],
  "signatures": ["string[] - signatory names"],
  "ownerEmail": "string - email address if present",
  "ownerPhone": "string - phone number if present",
  "ownerType": "string - one of: individual, company, trust",
  "registrationNumber": "string - registration or certificate number",
  "description": "string - brief description of the property",
  "_confidence": "number 0-1 - your overall confidence in the extraction"
}

Return ONLY valid JSON. No markdown, no explanation, no extra text.`;

/**
 * Extract structured property data from raw OCR text using LLM.
 * Model and provider are controlled by AI_PROVIDER env var (see lib/aiProvider.ts).
 */
export async function extractStructuredData(text: string): Promise<{
	data: ExtractedPropertyData;
	confidence: number;
	documentType: AIDocumentType;
}> {
	if (isRateLimitedNow()) {
		return emptyExtractionResult();
	}

	const openai = getChatClient();

	// Trim text to stay under token limits (12k chars ≈ 3k tokens)
	const trimmedText = text.slice(0, 12000);

	let completion;
	try {
		completion = await openai.chat.completions.create({
			model: getChatModel(),
			temperature: 0,
			response_format: { type: "json_object" },
			messages: [
				{ role: "system", content: EXTRACTION_PROMPT },
				{
					role: "user",
					content: `Extract structured property data from the text below.\nReturn ONLY valid JSON matching the schema.\n\nText:\n${trimmedText}`,
				},
			],
		});
	} catch (error) {
		if (isRateLimitError(error)) {
			markRateLimitedCooldown();
			console.warn(
				"[extraction] LLM rate-limited; skipping structured extraction during cooldown.",
			);
			return emptyExtractionResult();
		}
		throw error;
	}

	const content = completion.choices[0]?.message?.content;
	if (!content) {
		throw new Error("No response from LLM");
	}

	const parsed = JSON.parse(content);

	// Separate internal fields from extracted data
	const confidence =
		typeof parsed._confidence === "number" ? parsed._confidence : 0.5;
	const documentType =
		(parsed.documentType as AIDocumentType) || AIDocumentType.OTHER;

	// Remove internal fields from the data
	const { _confidence, ...extractedData } = parsed;

	return {
		data: extractedData as ExtractedPropertyData,
		confidence,
		documentType,
	};
}

/**
 * Auto-classify document type from text (lightweight, no full extraction).
 */
export async function classifyDocumentType(
	text: string,
): Promise<AIDocumentType> {
	if (isRateLimitedNow()) {
		return AIDocumentType.OTHER;
	}

	const openai = getChatClient();

	let completion;
	try {
		completion = await openai.chat.completions.create({
			model: getChatModel(),
			temperature: 0,
			response_format: { type: "json_object" },
			messages: [
				{
					role: "system",
					content:
						'Classify the document type. Return JSON: {"type": "<type>"} where type is one of: survey_plan, certificate_of_occupancy, contract_of_sale, title_deed, lease_agreement, building_permit, inspection_report, allocation_letter, other',
				},
				{
					role: "user",
					content: text.slice(0, 3000),
				},
			],
		});
	} catch (error) {
		if (isRateLimitError(error)) {
			markRateLimitedCooldown();
			console.warn(
				"[extraction] LLM rate-limited; skipping document classification during cooldown.",
			);
			return AIDocumentType.OTHER;
		}
		throw error;
	}

	const content = completion.choices[0]?.message?.content;
	if (!content) return AIDocumentType.OTHER;

	const parsed = JSON.parse(content);
	return (parsed.type as AIDocumentType) || AIDocumentType.OTHER;
}

/**
 * Extract structured property data directly from an image buffer using a vision LLM.
 *
 * Used for image file uploads (jpg/png/webp etc.) — combines OCR and field extraction
 * in a single pass. The model sees the full document layout including diagrams, stamps,
 * and spatial relationships between labels and boundary lines.
 *
 * Falls back to `extractStructuredData("")` (empty extraction) if vision is unavailable.
 */
export async function extractStructuredDataFromImage(
	imageBuffer: Buffer,
	mimeType: string,
): Promise<{
	data: ExtractedPropertyData;
	confidence: number;
	documentType: AIDocumentType;
	ocrText: string;
}> {
	if (!providerSupportsVision() || isRateLimitedNow()) {
		return {
			...emptyExtractionResult(),
			ocrText: "",
		};
	}

	const openai = getChatClient();
	const base64 = imageBuffer.toString("base64");
	const dataUrl = `data:${mimeType};base64,${base64}`;

	const systemPrompt = `You are a document parser specialising in real estate and property documents from any country worldwide (survey plans, title deeds, certificates of occupancy, contracts, lease agreements, building permits, allocation letters, etc.).

You will receive an image of a document. Do two things:
1. Extract all visible text from the document (field: "ocrText").
2. Parse that text into structured property data.

Return a single JSON object with this schema:
{
  "ocrText": "string — all text visible in the document, in reading order",
  "ownerName": "string",
  "plotSize": "string — area with units (e.g. '450 sqm', '2.5 acres')",
  "coordinates": ["string[] — coordinate strings found in the document"],
  "surveyNumber": "string",
  "location": "string — full address or location description",
  "documentType": "string — one of: survey_plan, certificate_of_occupancy, contract_of_sale, title_deed, lease_agreement, building_permit, inspection_report, allocation_letter, other",
  "date": "string — primary date in YYYY-MM-DD format",
  "propertyType": "string — one of: land, house, apartment, building, office, retail, warehouse, farm, other",
  "zoning": "string — one of: residential, commercial, industrial, agricultural, mixed_use, unspecified",
  "area": "string — area in square metres (number only)",
  "taxId": "string",
  "purchasePrice": "string — number only, no commas",
  "currentValue": "string — number only",
  "boughtFrom": "string — seller or previous owner",
  "witnesses": ["string[]"],
  "signatures": ["string[]"],
  "ownerEmail": "string",
  "ownerPhone": "string",
  "ownerType": "string — one of: individual, company, trust",
  "registrationNumber": "string",
  "description": "string — brief property description",
  "_confidence": "number 0-1 — overall confidence in the extraction"
}

Only include fields you are confident about. Omit fields you cannot find. Return ONLY valid JSON.`;

	let response;
	try {
		response = await openai.chat.completions.create({
			model: getChatModel(true),
			temperature: 0,
			response_format: { type: "json_object" },
			messages: [
				{ role: "system", content: systemPrompt },
				{
					role: "user",
					content: [
						{
							type: "text",
							text: "Extract all text and structured property data from this document image.",
						},
						{
							type: "image_url",
							image_url: { url: dataUrl, detail: "high" },
						},
					],
				},
			],
		});
	} catch (error) {
		if (isRateLimitError(error)) {
			markRateLimitedCooldown();
			console.warn(
				"[extraction] Vision LLM rate-limited; skipping image extraction during cooldown.",
			);
			return {
				...emptyExtractionResult(),
				ocrText: "",
			};
		}
		throw error;
	}

	const content = response.choices[0]?.message?.content;
	if (!content) throw new Error("No response from vision LLM");

	const parsed = JSON.parse(content);
	const confidence =
		typeof parsed._confidence === "number" ? parsed._confidence : 0.5;
	const documentType =
		(parsed.documentType as AIDocumentType) || AIDocumentType.OTHER;
	const ocrText = typeof parsed.ocrText === "string" ? parsed.ocrText : "";
	const {
		_confidence,
		ocrText: _ocrText,
		documentType: _docType,
		...extractedData
	} = parsed;

	return {
		data: extractedData as ExtractedPropertyData,
		confidence,
		documentType,
		ocrText,
	};
}
