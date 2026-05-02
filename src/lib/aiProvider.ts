/**
 * Centralised AI provider configuration.
 *
 * Set AI_PROVIDER in your environment to choose the primary provider:
 *   AI_PROVIDER=openai   (default) — requires OPENAI_API_KEY
 *   AI_PROVIDER=gemini             — requires GEMINI_API_KEY  (free tier via AI Studio)
 *   AI_PROVIDER=groq               — requires GROQ_API_KEY    (free tier, very high RPM)
 *   AI_PROVIDER=mistral            — requires MISTRAL_API_KEY (free tier on La Plateforme)
 *   AI_PROVIDER=qwen               — requires DASHSCOPE_API_KEY (Alibaba Qwen, free credits)
 *   AI_PROVIDER=glm                — requires ZHIPU_API_KEY   (Zhipu GLM, free credits)
 *   AI_PROVIDER=deepseek           — requires DEEPSEEK_API_KEY
 *   AI_PROVIDER=kimi               — requires KIMI_API_KEY
 *
 * Set AI_FALLBACK_PROVIDERS to a comma-separated list of providers to try
 * when the primary provider is rate-limited or fails (e.g.
 *   AI_FALLBACK_PROVIDERS=groq,gemini,kimi
 * ). Providers without an API key are skipped automatically.
 *
 * Embeddings always use OpenAI (text-embedding-3-small) since most providers
 * do not offer reliable embedding APIs. OPENAI_API_KEY is still required
 * for indexing even when using a different chat provider.
 *
 * Vision (image inputs) is supported by openai, gemini, groq, mistral, qwen,
 * glm, and kimi. When a provider in the fallback chain does not support
 * vision the runner skips it for vision requests.
 */

import OpenAI from "openai";

export type AIProvider =
	| "openai"
	| "gemini"
	| "groq"
	| "mistral"
	| "qwen"
	| "glm"
	| "deepseek"
	| "kimi";

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
	/**
	 * Default cooldown (ms) when a 429 is received and the response did not
	 * include a usable Retry-After header. Tuned per provider's typical
	 * rate-limit window.
	 */
	defaultCooldownMs: number;
}

const PROVIDER_CONFIG: Record<AIProvider, ProviderConfig> = {
	openai: {
		apiKeyEnv: "OPENAI_API_KEY",
		label: "OpenAI",
		chatModel: "gpt-4o-mini",
		visionModel: "gpt-4o",
		supportsVision: true,
		defaultCooldownMs: 60_000,
	},
	gemini: {
		baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
		apiKeyEnv: "GEMINI_API_KEY",
		label: "Google Gemini",
		chatModel: "gemini-2.0-flash",
		visionModel: "gemini-2.0-flash",
		supportsVision: true,
		// Free tier resets per minute and per day; 60s recovers per-minute caps.
		defaultCooldownMs: 60_000,
	},
	groq: {
		baseURL: "https://api.groq.com/openai/v1",
		apiKeyEnv: "GROQ_API_KEY",
		label: "Groq",
		// Llama 4 Scout is fast and supports vision; 70B versatile is the
		// solid text default. Override via env if you want something else.
		chatModel: "llama-3.3-70b-versatile",
		visionModel: "meta-llama/llama-4-scout-17b-16e-instruct",
		supportsVision: true,
		defaultCooldownMs: 30_000,
	},
	mistral: {
		baseURL: "https://api.mistral.ai/v1",
		apiKeyEnv: "MISTRAL_API_KEY",
		label: "Mistral",
		chatModel: "mistral-small-latest",
		visionModel: "pixtral-12b-2409",
		supportsVision: true,
		defaultCooldownMs: 30_000,
	},
	qwen: {
		// Alibaba DashScope OpenAI-compatible endpoint (international).
		baseURL: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
		apiKeyEnv: "DASHSCOPE_API_KEY",
		label: "Qwen (Alibaba)",
		chatModel: "qwen-plus",
		visionModel: "qwen-vl-plus",
		supportsVision: true,
		defaultCooldownMs: 60_000,
	},
	glm: {
		// Zhipu GLM OpenAI-compatible endpoint.
		baseURL: "https://open.bigmodel.cn/api/paas/v4",
		apiKeyEnv: "ZHIPU_API_KEY",
		label: "Zhipu GLM",
		chatModel: "glm-4-flash",
		visionModel: "glm-4v-flash",
		supportsVision: true,
		defaultCooldownMs: 60_000,
	},
	deepseek: {
		baseURL: "https://api.deepseek.com",
		apiKeyEnv: "DEEPSEEK_API_KEY",
		label: "DeepSeek",
		chatModel: "deepseek-chat",
		visionModel: "deepseek-chat", // DeepSeek V3 does not support image inputs
		supportsVision: false,
		defaultCooldownMs: 60_000,
	},
	kimi: {
		baseURL: "https://api.moonshot.cn/v1",
		apiKeyEnv: "KIMI_API_KEY",
		label: "Kimi (Moonshot)",
		chatModel: "moonshot-v1-8k",
		visionModel: "moonshot-v1-8k", // Moonshot supports vision on all models
		supportsVision: true,
		defaultCooldownMs: 60_000,
	},
};

const ALL_PROVIDERS = Object.keys(PROVIDER_CONFIG) as AIProvider[];

function getActiveProvider(): AIProvider {
	const p = process.env.AI_PROVIDER as AIProvider | undefined;
	if (p && PROVIDER_CONFIG[p]) return p;
	return "openai";
}

function parseFallbackProviders(): AIProvider[] {
	const raw = process.env.AI_FALLBACK_PROVIDERS;
	if (!raw) return [];
	return raw
		.split(",")
		.map((s) => s.trim().toLowerCase())
		.filter((s): s is AIProvider => (ALL_PROVIDERS as string[]).includes(s));
}

function hasApiKey(provider: AIProvider): boolean {
	return !!process.env[PROVIDER_CONFIG[provider].apiKeyEnv];
}

/**
 * Ordered list of providers to try for a request: active first, then any
 * configured fallbacks (deduplicated). Providers without an API key in the
 * environment are filtered out so the runner never tries them.
 */
export function getProviderChain(opts?: {
	requireVision?: boolean;
}): AIProvider[] {
	const active = getActiveProvider();
	const fallbacks = parseFallbackProviders();
	const seen = new Set<AIProvider>();
	const chain: AIProvider[] = [];
	for (const p of [active, ...fallbacks]) {
		if (seen.has(p)) continue;
		seen.add(p);
		if (!hasApiKey(p)) continue;
		if (opts?.requireVision && !PROVIDER_CONFIG[p].supportsVision) continue;
		chain.push(p);
	}
	return chain;
}

/* ── Per-provider rate-limit tracking ─────────────────── */

const providerCooldownUntil: Partial<Record<AIProvider, number>> = {};

export function isProviderRateLimited(p: AIProvider): boolean {
	const until = providerCooldownUntil[p] ?? 0;
	return Date.now() < until;
}

export function getProviderCooldownRemainingMs(p: AIProvider): number {
	const until = providerCooldownUntil[p] ?? 0;
	const remaining = until - Date.now();
	return remaining > 0 ? remaining : 0;
}

export function markProviderRateLimited(p: AIProvider, ms?: number): void {
	const cooldown = ms ?? PROVIDER_CONFIG[p].defaultCooldownMs;
	providerCooldownUntil[p] = Date.now() + cooldown;
}

/** Aggregate: are ALL providers in the chain currently cooled down? */
export function areAllProvidersRateLimited(opts?: {
	requireVision?: boolean;
}): boolean {
	const chain = getProviderChain(opts);
	if (chain.length === 0) return true;
	return chain.every(isProviderRateLimited);
}

/** Smallest remaining cooldown across the chain (for UI feedback). */
export function getChainCooldownRemainingMs(opts?: {
	requireVision?: boolean;
}): number {
	const chain = getProviderChain(opts);
	if (chain.length === 0) return 0;
	const remainings = chain.map(getProviderCooldownRemainingMs);
	return Math.min(...remainings);
}

function isRateLimitError(err: unknown): boolean {
	if (!err || typeof err !== "object") return false;
	const e = err as { status?: number; message?: string };
	if (e.status === 429) return true;
	return (
		typeof e.message === "string" &&
		/\b429\b|rate.?limit|quota|RESOURCE_EXHAUSTED/i.test(e.message)
	);
}

function parseRetryAfterMs(err: unknown): number | undefined {
	if (!err || typeof err !== "object") return undefined;
	const e = err as {
		headers?: Record<string, string> | { get?: (k: string) => string | null };
		response?: { headers?: { get?: (k: string) => string | null } };
	};

	// OpenAI SDK exposes headers on APIError; try a few shapes.
	let raw: string | null | undefined;
	const h = e.headers;
	if (h && typeof (h as { get?: unknown }).get === "function") {
		raw = (h as { get: (k: string) => string | null }).get("retry-after");
	} else if (h && typeof h === "object") {
		raw = (h as Record<string, string>)["retry-after"];
	}
	if (!raw && e.response?.headers?.get) {
		raw = e.response.headers.get("retry-after");
	}
	if (!raw) return undefined;

	const seconds = Number(raw);
	if (Number.isFinite(seconds) && seconds > 0) {
		return Math.min(seconds * 1000, 5 * 60_000); // cap at 5 min
	}
	const date = Date.parse(raw);
	if (Number.isFinite(date)) {
		const ms = date - Date.now();
		return ms > 0 ? Math.min(ms, 5 * 60_000) : undefined;
	}
	return undefined;
}

/* ── Chat client (per-provider cache) ─────────────────── */

const clientByProvider: Partial<Record<AIProvider, OpenAI>> = {};

export function getClientForProvider(provider: AIProvider): OpenAI {
	const cached = clientByProvider[provider];
	if (cached) return cached;
	const config = PROVIDER_CONFIG[provider];
	const apiKey = process.env[config.apiKeyEnv];
	if (!apiKey) {
		throw new Error(
			`${config.label} API key not configured. Set ${config.apiKeyEnv} in your environment.`,
		);
	}
	const client = new OpenAI({
		apiKey,
		...(config.baseURL ? { baseURL: config.baseURL } : {}),
	});
	clientByProvider[provider] = client;
	return client;
}

export function getModelForProvider(
	provider: AIProvider,
	hasVision = false,
): string {
	const config = PROVIDER_CONFIG[provider];
	return hasVision && config.supportsVision
		? config.visionModel
		: config.chatModel;
}

export function providerLabel(provider: AIProvider): string {
	return PROVIDER_CONFIG[provider].label;
}

export function doesProviderSupportVision(provider: AIProvider): boolean {
	return PROVIDER_CONFIG[provider].supportsVision;
}

/** Returns an OpenAI-SDK client configured for the active AI provider. */
export function getChatClient(): OpenAI {
	return getClientForProvider(getActiveProvider());
}

/**
 * Returns the model name to use for chat completions.
 * @param hasVision - Pass true when the request includes image inputs.
 *   If the active provider does not support vision, falls back to the text
 *   chat model so callers can strip images and still proceed.
 */
export function getChatModel(hasVision = false): string {
	return getModelForProvider(getActiveProvider(), hasVision);
}

/**
 * Whether the active provider supports image inputs in chat completions.
 * Use this to conditionally include/exclude images in the request body.
 */
export function providerSupportsVision(): boolean {
	return PROVIDER_CONFIG[getActiveProvider()].supportsVision;
}

/* ── Fallback runner ───────────────────────────────────── */

export class AllProvidersRateLimitedError extends Error {
	readonly cooldownMs: number;
	readonly providersTried: AIProvider[];
	constructor(cooldownMs: number, providersTried: AIProvider[]) {
		super(
			`All AI providers are rate-limited (next available in ~${Math.ceil(
				cooldownMs / 1000,
			)}s).`,
		);
		this.name = "AllProvidersRateLimitedError";
		this.cooldownMs = cooldownMs;
		this.providersTried = providersTried;
	}
}

export interface RunWithFallbackOptions {
	/** Whether the request needs an image-capable model. */
	hasVision?: boolean;
	/** Restrict the chain to vision-capable providers. */
	requireVision?: boolean;
	/** Optional explicit chain (overrides env-derived chain). */
	providers?: AIProvider[];
}

/**
 * Run an LLM call against the active provider, falling back to configured
 * fallback providers on 429/rate-limit errors. The executor receives the
 * client, model name, and provider id for the current attempt.
 *
 * Throws AllProvidersRateLimitedError if every provider in the chain is
 * either pre-cooled-down or returns a 429 during the attempt.
 * Non-rate-limit errors are re-thrown immediately.
 */
export async function runWithFallback<T>(
	executor: (client: OpenAI, model: string, provider: AIProvider) => Promise<T>,
	opts: RunWithFallbackOptions = {},
): Promise<T> {
	const requireVision = opts.requireVision ?? false;
	const chain = opts.providers ?? getProviderChain({ requireVision });
	if (chain.length === 0) {
		throw new Error(
			"No AI provider available — set AI_PROVIDER (and an API key) in your environment.",
		);
	}

	const tried: AIProvider[] = [];
	let firstError: unknown;

	for (const provider of chain) {
		if (isProviderRateLimited(provider)) {
			tried.push(provider);
			continue;
		}
		try {
			const client = getClientForProvider(provider);
			const model = getModelForProvider(provider, opts.hasVision);
			const result = await executor(client, model, provider);
			return result;
		} catch (err) {
			tried.push(provider);
			if (isRateLimitError(err)) {
				const cooldown =
					parseRetryAfterMs(err) ?? PROVIDER_CONFIG[provider].defaultCooldownMs;
				markProviderRateLimited(provider, cooldown);
				if (!firstError) firstError = err;
				console.warn(
					`[ai] ${PROVIDER_CONFIG[provider].label} rate-limited; cooling down for ${Math.ceil(
						cooldown / 1000,
					)}s and trying next provider.`,
				);
				continue;
			}
			throw err;
		}
	}

	const minRemaining = Math.min(...chain.map(getProviderCooldownRemainingMs));
	throw new AllProvidersRateLimitedError(
		minRemaining > 0 ? minRemaining : 0,
		tried,
	);
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
