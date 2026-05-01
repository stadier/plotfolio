/**
 * Centralised AI provider configuration.
 *
 * Set AI_PROVIDER in your environment to switch between providers:
 *   AI_PROVIDER=openai   (default) — requires OPENAI_API_KEY
 *   AI_PROVIDER=gemini             — requires GEMINI_API_KEY (free tier via AI Studio)
 *   AI_PROVIDER=deepseek           — requires DEEPSEEK_API_KEY
 *   AI_PROVIDER=kimi               — requires KIMI_API_KEY
 *
 * Embeddings always use OpenAI (text-embedding-3-small) since DeepSeek and
 * Kimi do not provide reliable embedding APIs. OPENAI_API_KEY is still
 * required for indexing even when using a different chat provider.
 *
 * Vision (image inputs) is supported by OpenAI, Gemini, and Kimi. When the
 * active provider does not support vision the generate-description route
 * automatically skips image inputs and falls back to text-only generation.
 */

import OpenAI from "openai";

export type AIProvider = "openai" | "gemini" | "deepseek" | "kimi";

interface ProviderConfig {
	/** Optional base URL override (omit to use SDK default) */
	baseURL?: string;
	/** Environment variable that holds the API key */
	apiKeyEnv: string;
	/** Display name for error messages */
	label: string;
	/** Default chat/completion model */
	chatModel: string;
	/** Vision-capable model (may be same as chatModel) */
	visionModel: string;
	/** Whether this provider supports image inputs */
	supportsVision: boolean;
}

const PROVIDER_CONFIG: Record<AIProvider, ProviderConfig> = {
	openai: {
		apiKeyEnv: "OPENAI_API_KEY",
		label: "OpenAI",
		chatModel: "gpt-4o-mini",
		visionModel: "gpt-4o",
		supportsVision: true,
	},
	gemini: {
		baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
		apiKeyEnv: "GEMINI_API_KEY",
		label: "Google Gemini",
		chatModel: "gemini-2.0-flash",
		visionModel: "gemini-2.0-flash",
		supportsVision: true,
	},
	deepseek: {
		baseURL: "https://api.deepseek.com",
		apiKeyEnv: "DEEPSEEK_API_KEY",
		label: "DeepSeek",
		chatModel: "deepseek-chat",
		visionModel: "deepseek-chat", // DeepSeek V3 does not support image inputs
		supportsVision: false,
	},
	kimi: {
		baseURL: "https://api.moonshot.cn/v1",
		apiKeyEnv: "KIMI_API_KEY",
		label: "Kimi (Moonshot)",
		chatModel: "moonshot-v1-8k",
		visionModel: "moonshot-v1-8k", // Moonshot supports vision on all models
		supportsVision: true,
	},
};

function getActiveProvider(): AIProvider {
	const p = process.env.AI_PROVIDER as AIProvider | undefined;
	if (p && PROVIDER_CONFIG[p]) return p;
	return "openai";
}

/* ── Chat client ─────────────────────────────────────── */

let chatClient: OpenAI | null = null;

/** Returns an OpenAI-SDK client configured for the active AI provider. */
export function getChatClient(): OpenAI {
	if (!chatClient) {
		const provider = getActiveProvider();
		const config = PROVIDER_CONFIG[provider];
		const apiKey = process.env[config.apiKeyEnv];
		if (!apiKey) {
			throw new Error(
				`${config.label} API key not configured. Set ${config.apiKeyEnv} in your environment.`,
			);
		}
		chatClient = new OpenAI({
			apiKey,
			...(config.baseURL ? { baseURL: config.baseURL } : {}),
		});
	}
	return chatClient;
}

/**
 * Returns the model name to use for chat completions.
 * @param hasVision - Pass true when the request includes image inputs.
 *   If the active provider does not support vision, falls back to the text
 *   chat model so callers can strip images and still proceed.
 */
export function getChatModel(hasVision = false): string {
	const provider = getActiveProvider();
	const config = PROVIDER_CONFIG[provider];
	return hasVision && config.supportsVision
		? config.visionModel
		: config.chatModel;
}

/**
 * Whether the active provider supports image inputs in chat completions.
 * Use this to conditionally include/exclude images in the request body.
 */
export function providerSupportsVision(): boolean {
	return PROVIDER_CONFIG[getActiveProvider()].supportsVision;
}

/* ── Embedding client ────────────────────────────────── */
// Embeddings always use OpenAI regardless of AI_PROVIDER.

let embeddingClient: OpenAI | null = null;

/** Returns an OpenAI client for generating embeddings. Always OpenAI. */
export function getEmbeddingClient(): OpenAI {
	if (!embeddingClient) {
		if (!process.env.OPENAI_API_KEY) {
			throw new Error(
				"OPENAI_API_KEY is required for document embeddings even when using a different chat provider.",
			);
		}
		embeddingClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
	}
	return embeddingClient;
}

export const EMBEDDING_MODEL = "text-embedding-3-small";
