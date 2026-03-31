/**
 * Document indexing: text chunking + embedding generation.
 *
 * Splits OCR text into overlapping chunks, generates embeddings
 * via OpenAI text-embedding-3-small, and stores in MongoDB for
 * vector search retrieval.
 */

import { DocumentChunkModel } from "@/models/AIDocument";
import OpenAI from "openai";

const CHUNK_SIZE = 500; // characters per chunk
const CHUNK_OVERLAP = 100; // overlap between chunks
const EMBEDDING_MODEL = "text-embedding-3-small"; // cheapest embedding model

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

/* ── Text chunking ───────────────────────────────────── */

/**
 * Split text into overlapping chunks for embedding.
 * Tries to split on sentence boundaries when possible.
 */
export function chunkText(text: string): string[] {
	const cleaned = text.replace(/\s+/g, " ").trim();
	if (cleaned.length <= CHUNK_SIZE) {
		return cleaned.length > 0 ? [cleaned] : [];
	}

	const chunks: string[] = [];
	let start = 0;

	while (start < cleaned.length) {
		let end = Math.min(start + CHUNK_SIZE, cleaned.length);

		// Try to break at a sentence boundary
		if (end < cleaned.length) {
			const lastPeriod = cleaned.lastIndexOf(". ", end);
			const lastNewline = cleaned.lastIndexOf("\n", end);
			const breakPoint = Math.max(lastPeriod, lastNewline);
			if (breakPoint > start + CHUNK_SIZE * 0.5) {
				end = breakPoint + 1;
			}
		}

		const chunk = cleaned.slice(start, end).trim();
		if (chunk.length > 0) {
			chunks.push(chunk);
		}

		start = end - CHUNK_OVERLAP;
		if (start >= cleaned.length) break;
	}

	return chunks;
}

/* ── Embedding generation ────────────────────────────── */

/**
 * Generate embeddings for an array of text chunks.
 * Uses OpenAI text-embedding-3-small (1536 dimensions, $0.02/1M tokens).
 */
export async function generateEmbeddings(
	chunks: string[],
): Promise<number[][]> {
	if (chunks.length === 0) return [];

	const openai = getOpenAI();

	// OpenAI supports batch embedding (up to ~8k tokens per request)
	const response = await openai.embeddings.create({
		model: EMBEDDING_MODEL,
		input: chunks,
	});

	return response.data.map((d) => d.embedding);
}

/* ── Index a document ────────────────────────────────── */

/**
 * Index a document's OCR text for vector search.
 * Chunks the text, generates embeddings, and stores in MongoDB.
 *
 * @returns Number of chunks created
 */
export async function indexDocument(
	documentId: string,
	text: string,
): Promise<number> {
	// Remove any existing chunks for this document (re-indexing)
	await DocumentChunkModel.deleteMany({ documentId });

	const chunks = chunkText(text);
	if (chunks.length === 0) return 0;

	const embeddings = await generateEmbeddings(chunks);

	const docs = chunks.map((chunkText, i) => ({
		documentId,
		chunkText,
		chunkIndex: i,
		embedding: embeddings[i],
	}));

	await DocumentChunkModel.insertMany(docs);
	return docs.length;
}

/* ── Vector search ───────────────────────────────────── */

/**
 * Search document chunks by semantic similarity.
 *
 * Uses MongoDB Atlas $vectorSearch if available,
 * otherwise falls back to a brute-force cosine similarity scan.
 */
export async function vectorSearch(
	query: string,
	options: { limit?: number; documentId?: string; propertyId?: string } = {},
): Promise<Array<{ documentId: string; chunkText: string; score: number }>> {
	const { limit = 5, documentId } = options;

	const queryEmbedding = (await generateEmbeddings([query]))[0];

	// Try MongoDB Atlas Vector Search first
	try {
		const filter: Record<string, unknown> = {};
		if (documentId) filter.documentId = documentId;

		const results = await DocumentChunkModel.aggregate([
			{
				$vectorSearch: {
					index: "vector_index",
					path: "embedding",
					queryVector: queryEmbedding,
					numCandidates: limit * 10,
					limit,
					...(Object.keys(filter).length > 0 && { filter }),
				},
			},
			{
				$project: {
					documentId: 1,
					chunkText: 1,
					score: { $meta: "vectorSearchScore" },
				},
			},
		]);

		if (results.length > 0) return results;
	} catch {
		// Atlas Vector Search not configured — fall back to brute-force
	}

	// Fallback: cosine similarity in-memory (works without Atlas Vector Search index)
	const matchFilter: Record<string, unknown> = {};
	if (documentId) matchFilter.documentId = documentId;

	const allChunks = await DocumentChunkModel.find(matchFilter)
		.select("documentId chunkText embedding")
		.lean();

	const scored = allChunks.map((chunk) => ({
		documentId: chunk.documentId,
		chunkText: chunk.chunkText,
		score: cosineSimilarity(queryEmbedding, chunk.embedding),
	}));

	scored.sort((a, b) => b.score - a.score);
	return scored.slice(0, limit);
}

/* ── Cosine similarity helper ────────────────────────── */

function cosineSimilarity(a: number[], b: number[]): number {
	let dot = 0;
	let normA = 0;
	let normB = 0;
	for (let i = 0; i < a.length; i++) {
		dot += a[i] * b[i];
		normA += a[i] * a[i];
		normB += b[i] * b[i];
	}
	const denom = Math.sqrt(normA) * Math.sqrt(normB);
	return denom === 0 ? 0 : dot / denom;
}
