/**
 * RAG query system for document Q&A.
 *
 * Flow:
 * 1. User submits a natural-language question
 * 2. Vector search retrieves the most relevant document chunks
 * 3. Chunks + question are sent to LLM for answer generation
 * 4. Returns answer with source references
 */

import { AIDocumentModel } from "@/models/AIDocument";
import type { DocumentQueryResponse } from "@/types/document";
import OpenAI from "openai";
import { vectorSearch } from "./indexing";

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

const QA_SYSTEM_PROMPT = `You are a helpful assistant that answers questions about real estate and property documents. You are given context from relevant document chunks that were retrieved via vector search.

Rules:
- Answer based ONLY on the provided context. Do not make up information.
- If the context does not contain enough information to answer the question, say so clearly.
- Be concise and specific. Cite details from the documents when possible.
- If the question asks about a specific field (owner, area, price), extract it precisely from the context.
- Use the document's own terminology and numbers — do not paraphrase measurements or legal references.`;

/**
 * Answer a question using RAG (Retrieval-Augmented Generation).
 */
export async function answerQuestion(
	query: string,
	options: { userId?: string; propertyId?: string; limit?: number } = {},
): Promise<DocumentQueryResponse> {
	const { limit = 5 } = options;

	// Step 1: Retrieve relevant chunks via vector search
	const chunks = await vectorSearch(query, {
		limit,
		documentId: options.propertyId ? undefined : undefined,
	});

	if (chunks.length === 0) {
		return {
			answer:
				"No relevant documents found to answer your question. Please upload documents first.",
			sources: [],
		};
	}

	// Step 2: Build context from chunks
	const contextParts = chunks.map(
		(c, i) => `[Source ${i + 1}]\n${c.chunkText}`,
	);
	const context = contextParts.join("\n\n");

	// Step 3: Generate answer
	const openai = getOpenAI();
	const completion = await openai.chat.completions.create({
		model: "gpt-4o-mini",
		temperature: 0.2,
		messages: [
			{ role: "system", content: QA_SYSTEM_PROMPT },
			{
				role: "user",
				content: `Context from retrieved documents:\n\n${context}\n\nQuestion: ${query}`,
			},
		],
	});

	const answer =
		completion.choices[0]?.message?.content ?? "Unable to generate an answer.";

	// Step 4: Enrich sources with document metadata
	const docIds = [...new Set(chunks.map((c) => c.documentId))];
	const docs = await AIDocumentModel.find({ _id: { $in: docIds } })
		.select("fileName")
		.lean();
	const docMap = new Map(docs.map((d) => [d._id.toString(), d.fileName]));

	const sources = chunks.map((c) => ({
		documentId: c.documentId,
		fileName: docMap.get(c.documentId) ?? "Unknown",
		chunkText: c.chunkText,
		score: c.score,
	}));

	return { answer, sources };
}
