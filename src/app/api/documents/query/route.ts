/**
 * POST /api/documents/query
 *
 * RAG-style Q&A: answer questions about uploaded documents.
 *
 * Body: { query: string, userId?: string, propertyId?: string, limit?: number }
 * Returns: { answer: string, sources: [...] }
 */

import { answerQuestion } from "@/lib/documentAI/query";
import connectDB from "@/lib/mongoose";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
	try {
		await connectDB();

		const body = await req.json();
		const { query, userId, propertyId, limit } = body;

		if (!query || typeof query !== "string" || query.trim().length === 0) {
			return NextResponse.json(
				{ error: "Missing or empty 'query' field" },
				{ status: 400 },
			);
		}

		const result = await answerQuestion(query.trim(), {
			userId,
			propertyId,
			limit: typeof limit === "number" ? Math.min(limit, 20) : 5,
		});

		return NextResponse.json(result);
	} catch (error) {
		console.error("[document-query] Failed:", error);
		return NextResponse.json(
			{ error: "Document query failed" },
			{ status: 500 },
		);
	}
}
