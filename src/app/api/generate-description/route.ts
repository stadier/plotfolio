import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `You are a professional real estate copywriter. Based on the property information and any provided materials (document text, photos), write a compelling, factual property description of 2–4 sentences. Focus on location, size, type, condition, and notable features. Be concise and professional. Return only the description text — no headings, no markdown, no quotation marks.`;

/**
 * POST /api/generate-description
 *
 * Body (JSON):
 *   text?         – OCR text extracted from documents (client-side)
 *   imageDataUrls? – base64 data URLs of property photos (max 4)
 *   metadata?     – key/value pairs of form fields
 *
 * Returns: { description: string }
 */
export async function POST(req: NextRequest) {
	try {
		if (!process.env.OPENAI_API_KEY) {
			return NextResponse.json(
				{ error: "OpenAI API key not configured" },
				{ status: 500 },
			);
		}

		const body = await req.json();
		const {
			text,
			imageDataUrls,
			metadata,
		}: {
			text?: string;
			imageDataUrls?: string[];
			metadata?: Record<string, string>;
		} = body;

		const metaLines = Object.entries(metadata ?? {})
			.filter(([, v]) => v)
			.map(([k, v]) => `${k}: ${v}`)
			.join("\n");

		const userText = [
			metaLines ? `Property metadata:\n${metaLines}` : "",
			text ? `\nDocument text:\n${text.slice(0, 8000)}` : "",
		]
			.filter(Boolean)
			.join("\n");

		const images = (imageDataUrls ?? []).slice(0, 4);
		const hasImages = images.length > 0;

		// Build messages — use vision model if photos are provided
		type MessageContent =
			| string
			| Array<
					| { type: "text"; text: string }
					| { type: "image_url"; image_url: { url: string; detail: "low" } }
			  >;

		const userContent: MessageContent = hasImages
			? [
					{
						type: "text" as const,
						text: userText || "Describe this property.",
					},
					...images.map((url) => ({
						type: "image_url" as const,
						image_url: { url, detail: "low" as const },
					})),
				]
			: userText || "Describe this property.";

		const completion = await openai.chat.completions.create({
			model: hasImages ? "gpt-4o" : "gpt-4o-mini",
			temperature: 0.7,
			max_tokens: 300,
			messages: [
				{ role: "system", content: SYSTEM_PROMPT },
				{ role: "user", content: userContent },
			],
		});

		const description = completion.choices[0]?.message?.content?.trim() ?? "";
		if (!description) {
			return NextResponse.json(
				{ error: "No description generated" },
				{ status: 502 },
			);
		}

		return NextResponse.json({ description });
	} catch (error) {
		console.error("[generate-description] Failed:", error);
		return NextResponse.json(
			{ error: "Failed to generate description" },
			{ status: 500 },
		);
	}
}
