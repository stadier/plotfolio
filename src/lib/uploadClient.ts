"use client";

import type { UploadScope } from "@/lib/uploadScopes";

export interface PresignResponse {
	uploadUrl: string;
	key: string;
	publicUrl: string;
	method: "PUT";
	headers: Record<string, string>;
	expiresIn: number;
}

export interface DirectUploadOptions {
	scope: UploadScope;
	propertyId?: string;
	portfolioId?: string;
	/** Called with progress percent (0–100) as the upload progresses. */
	onProgress?: (percent: number) => void;
	signal?: AbortSignal;
}

export interface DirectUploadResult {
	key: string;
	publicUrl: string;
}

/**
 * Uploads a single file directly to Backblaze B2 in two steps:
 *
 *   1. Ask the server for a presigned PUT URL (cheap; no bytes).
 *   2. PUT the file straight to B2 using XHR so we get progress events.
 *
 * The Next.js server never sees the file payload, which makes uploads
 * dramatically faster and removes serverless body-size and timeout limits.
 *
 * After this resolves, call the appropriate "attach" endpoint
 * (e.g. `/api/properties/:id/media/attach`) to record metadata.
 */
export async function uploadDirect(
	file: File,
	opts: DirectUploadOptions,
): Promise<DirectUploadResult> {
	const presignRes = await fetch("/api/uploads/presign", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			scope: opts.scope,
			filename: file.name,
			mime: file.type || "application/octet-stream",
			size: file.size,
			propertyId: opts.propertyId,
			portfolioId: opts.portfolioId,
		}),
		signal: opts.signal,
	});

	if (!presignRes.ok) {
		const data = await presignRes.json().catch(() => ({}));
		throw new Error(data.error || `Presign failed (${presignRes.status})`);
	}

	const presign = (await presignRes.json()) as PresignResponse;

	await new Promise<void>((resolve, reject) => {
		const xhr = new XMLHttpRequest();
		xhr.open(presign.method, presign.uploadUrl, true);
		for (const [k, v] of Object.entries(presign.headers)) {
			xhr.setRequestHeader(k, v);
		}
		xhr.upload.onprogress = (ev) => {
			if (ev.lengthComputable && opts.onProgress) {
				opts.onProgress(Math.round((ev.loaded / ev.total) * 100));
			}
		};
		xhr.onload = () => {
			if (xhr.status >= 200 && xhr.status < 300) resolve();
			else reject(new Error(`Upload failed (${xhr.status})`));
		};
		xhr.onerror = () => reject(new Error("Network error during upload"));
		xhr.onabort = () => reject(new DOMException("Aborted", "AbortError"));
		opts.signal?.addEventListener("abort", () => xhr.abort(), { once: true });
		xhr.send(file);
	});

	return { key: presign.key, publicUrl: presign.publicUrl };
}
