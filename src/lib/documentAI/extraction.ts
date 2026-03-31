/**
 * Structured data extraction from OCR text using LLM.
 *
 * Sends raw text to OpenAI and receives structured JSON
 * matching the ExtractedPropertyData schema.
 * Includes auto-classification of document type and confidence scoring.
 */

import type { AIDocumentType, ExtractedPropertyData } from "@/types/document";
import OpenAI from "openai";

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
  "propertyType": "string - one of: RESIDENTIAL, COMMERCIAL, INDUSTRIAL, AGRICULTURAL, VACANT_LAND, MIXED_USE",
  "area": "string - area in square metres (number only)",
  "zoning": "string - zoning classification",
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

let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
	if (!openaiClient) {
		if (!process.env.OPENAI_API_KEY) {
			throw new Error("OPENAI_API_KEY not configured");
		}
		openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
	}
	return openaiClient;
}

/**
 * Extract structured property data from raw OCR text using LLM.
 * Uses GPT-4o-mini for cost efficiency with JSON mode.
 */
export async function extractStructuredData(text: string): Promise<{
	data: ExtractedPropertyData;
	confidence: number;
	documentType: AIDocumentType;
}> {
	const openai = getOpenAI();

	// Trim text to stay under token limits (12k chars ≈ 3k tokens)
	const trimmedText = text.slice(0, 12000);

	const completion = await openai.chat.completions.create({
		model: "gpt-4o-mini",
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

	const content = completion.choices[0]?.message?.content;
	if (!content) {
		throw new Error("No response from LLM");
	}

	const parsed = JSON.parse(content);

	// Separate internal fields from extracted data
	const confidence =
		typeof parsed._confidence === "number" ? parsed._confidence : 0.5;
	const documentType = (parsed.documentType as AIDocumentType) || "other";

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
	const openai = getOpenAI();

	const completion = await openai.chat.completions.create({
		model: "gpt-4o-mini",
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

	const content = completion.choices[0]?.message?.content;
	if (!content) return "other" as AIDocumentType;

	const parsed = JSON.parse(content);
	return (parsed.type as AIDocumentType) || ("other" as AIDocumentType);
}
