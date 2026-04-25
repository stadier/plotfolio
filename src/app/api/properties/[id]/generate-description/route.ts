import { b2, B2_BUCKET } from "@/lib/b2";
import { extractText } from "@/lib/documentAI/ocr";
import connectDB from "@/lib/mongoose";
import { PropertyModel, PropertyService } from "@/models/Property";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `You are a professional real estate copywriter. Given structured property information and any available document text, write a compelling, factual property description of 2–4 sentences. Focus on location, size, type, condition, and notable features. Be concise and professional. Return only the description text — no headings, no markdown, no quotation marks.`;

/**
 * POST /api/properties/[id]/generate-description
 * Uses OCR on the property's documents (or falls back to metadata) to generate a description via OpenAI.
 * Saves the description to the property and returns it.
 */
export async function POST(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await params;

		await connectDB();

		const property = await PropertyService.getPropertyById(id);
		if (!property) {
			return NextResponse.json(
				{ error: "Property not found" },
				{ status: 404 },
			);
		}

		if (!process.env.OPENAI_API_KEY) {
			return NextResponse.json(
				{ error: "OpenAI API key not configured" },
				{ status: 500 },
			);
		}

		// Attempt OCR on up to 3 documents
		const docTexts: string[] = [];
		const rawProperty = await PropertyModel.findOne({ id }).lean<{
			documents?: Array<{ url: string; name: string; type: string }>;
		}>();
		const docs = rawProperty?.documents ?? [];

		for (const doc of docs.slice(0, 3)) {
			try {
				const url = new URL(doc.url);
				const key = decodeURIComponent(url.pathname.slice(1));
				const response = await b2.send(
					new GetObjectCommand({ Bucket: B2_BUCKET, Key: key }),
				);
				if (!response.Body) continue;

				const chunks: Uint8Array[] = [];
				for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
					chunks.push(chunk);
				}
				const buffer = Buffer.concat(chunks);

				const mimeType = response.ContentType ?? "application/octet-stream";
				const text = await extractText(buffer, mimeType, doc.name);
				if (text.trim().length > 30) {
					docTexts.push(text.trim().slice(0, 3000));
				}
			} catch {
				// skip this document silently
			}
		}

		// Build a context string from property metadata
		const meta = [
			property.name && `Name: ${property.name}`,
			property.address && `Address: ${property.address}`,
			property.propertyType && `Type: ${property.propertyType}`,
			property.area && `Area: ${property.area} sqm`,
			property.zoning && `Zoning: ${property.zoning}`,
			property.conditions?.length &&
				`Condition: ${property.conditions.join(", ")}`,
			property.bedrooms && `Bedrooms: ${property.bedrooms}`,
			property.bathrooms && `Bathrooms: ${property.bathrooms}`,
			property.amenities?.length &&
				`Amenities: ${property.amenities.join(", ")}`,
		]
			.filter(Boolean)
			.join("\n");

		const userContent = [
			"Property metadata:",
			meta || "(none)",
			docTexts.length > 0
				? `\nDocument text:\n${docTexts.join("\n\n---\n\n")}`
				: "",
		]
			.filter(Boolean)
			.join("\n");

		const completion = await openai.chat.completions.create({
			model: "gpt-4o-mini",
			temperature: 0.7,
			messages: [
				{ role: "system", content: SYSTEM_PROMPT },
				{ role: "user", content: userContent.slice(0, 12000) },
			],
		});

		const description = completion.choices[0]?.message?.content?.trim() ?? "";
		if (!description) {
			return NextResponse.json(
				{ error: "No description generated" },
				{ status: 502 },
			);
		}

		// Save to the property
		await PropertyModel.updateOne({ id }, { $set: { description } });

		return NextResponse.json({ description });
	} catch (error) {
		console.error("[generate-description] Failed:", error);
		return NextResponse.json(
			{ error: "Failed to generate description" },
			{ status: 500 },
		);
	}
}
