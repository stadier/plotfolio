import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `You are a document parser specializing in real estate and property documents from any country (title deeds, survey plans, certificates of occupancy, contracts of sale, allocation letters, building permits, etc.).

Given the raw text extracted from a document, return a JSON object with as many of these fields as you can identify. Only include fields you are confident about. Omit fields you cannot find.

Fields:
- name: Property/plot name or identifier (e.g. "Plot 1234, Block A" or "123 Main Street")
- address: Full location/address
- description: Brief description of the property
- propertyType: One of: RESIDENTIAL, COMMERCIAL, INDUSTRIAL, AGRICULTURAL, VACANT_LAND, MIXED_USE
- area: Area in square metres (number as string). Convert from hectares, acres, or sq ft if needed.
- zoning: Zoning classification if mentioned
- taxId: Any certificate number, registration number, file reference, or tax ID
- lat: Latitude in decimal degrees (string)
- lng: Longitude in decimal degrees (string)
- purchasePrice: Price/consideration (number as string, no commas)
- currentValue: Current market value if mentioned (number as string, no commas)
- purchaseDate: Date in YYYY-MM-DD format. If only month/year, use the 1st.
- boughtFrom: Seller, grantor, or previous owner name
- witnesses: Comma-separated witness names
- signatures: Comma-separated signatory names
- ownerName: Grantee, buyer, or property owner name
- ownerEmail: Email address if present
- ownerPhone: Phone number if present
- ownerType: One of: individual, company, trust
- status: One of: OWNED, FOR_SALE, UNDER_DEVELOPMENT, DISPUTED, LEASED

Return ONLY valid JSON. No markdown, no explanation.`;

export async function POST(req: NextRequest) {
	try {
		const { text } = await req.json();

		if (!text || typeof text !== "string") {
			return NextResponse.json(
				{ error: "Missing or invalid 'text' field" },
				{ status: 400 },
			);
		}

		if (!process.env.OPENAI_API_KEY) {
			return NextResponse.json(
				{ error: "OpenAI API key not configured" },
				{ status: 500 },
			);
		}

		const completion = await openai.chat.completions.create({
			model: "gpt-4o-mini",
			temperature: 0,
			response_format: { type: "json_object" },
			messages: [
				{ role: "system", content: SYSTEM_PROMPT },
				{
					role: "user",
					content: `Extract property fields from this document text:\n\n${text.slice(0, 12000)}`,
				},
			],
		});

		const content = completion.choices[0]?.message?.content;
		if (!content) {
			return NextResponse.json(
				{ error: "No response from AI" },
				{ status: 502 },
			);
		}

		const fields = JSON.parse(content);
		return NextResponse.json({ fields });
	} catch (error) {
		console.error("[extract-fields] AI extraction failed:", error);
		return NextResponse.json(
			{ error: "AI extraction failed" },
			{ status: 500 },
		);
	}
}
