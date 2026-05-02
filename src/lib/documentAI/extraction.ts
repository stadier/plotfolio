/**
 * Structured data extraction from OCR text (or directly from images) using LLM.
 *
 * Sends raw text — or a document image — to the active AI provider and receives
 * structured JSON matching the ExtractedPropertyData schema.
 * Includes auto-classification of document type and confidence scoring.
 *
 * Uses runWithFallback so that if the primary provider is rate-limited the
 * call automatically retries against AI_FALLBACK_PROVIDERS.
 */

import {
	AllProvidersRateLimitedError,
	areAllProvidersRateLimited,
	getChainCooldownRemainingMs,
	runWithFallback,
} from "@/lib/aiProvider";
import type { ExtractedPropertyData } from "@/types/document";
import { AIDocumentType } from "@/types/document";

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

/**
 * Returns the number of milliseconds remaining before any provider in the
 * chain is available again, or 0 if at least one provider is ready now.
 */
export function getRateLimitCooldownRemainingMs(): number {
	if (!areAllProvidersRateLimited()) return 0;
	return getChainCooldownRemainingMs();
}

/**
 * Whether every provider in the chain is currently in a rate-limit cooldown.
 */
export function isLLMRateLimited(): boolean {
	return areAllProvidersRateLimited();
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
	// Trim text to stay under token limits (12k chars ≈ 3k tokens)
	const trimmedText = text.slice(0, 12000);

	let completion;
	try {
		completion = await runWithFallback((client, model) =>
			client.chat.completions.create({
				model,
				temperature: 0,
				response_format: { type: "json_object" },
				messages: [
					{ role: "system", content: EXTRACTION_PROMPT },
					{
						role: "user",
						content: `Extract structured property data from the text below.\nReturn ONLY valid JSON matching the schema.\n\nText:\n${trimmedText}`,
					},
				],
			}),
		);
	} catch (error) {
		if (error instanceof AllProvidersRateLimitedError) {
			console.warn(
				"[extraction] All providers rate-limited; skipping structured extraction.",
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
	let completion;
	try {
		completion = await runWithFallback((client, model) =>
			client.chat.completions.create({
				model,
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
			}),
		);
	} catch (error) {
		if (error instanceof AllProvidersRateLimitedError) {
			console.warn(
				"[extraction] All providers rate-limited; skipping document classification.",
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
		response = await runWithFallback(
			(client, model) =>
				client.chat.completions.create({
					model,
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
				}),
			{ requireVision: true, hasVision: true },
		);
	} catch (error) {
		if (error instanceof AllProvidersRateLimitedError) {
			console.warn(
				"[extraction] All vision providers rate-limited; skipping image extraction.",
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
