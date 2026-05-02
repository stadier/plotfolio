"use client";

import { invalidateCachedGet } from "@/lib/clientCache";
import { uploadDirect } from "@/lib/uploadClient";
import type { UploadScope } from "@/lib/uploadScopes";
import { useQueryClient } from "@tanstack/react-query";
import {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useRef,
	useState,
} from "react";

/** A single file moving through upload + attach. */
export interface UploadJob {
	id: string;
	label: string; // filename, shown in the tray
	scope: UploadScope;
	status: "uploading" | "attaching" | "done" | "failed" | "cancelled";
	progress: number; // 0–100 (upload only; attach is treated as "done" once 100)
	error?: string;
	startedAt: number;
	finishedAt?: number;
}

export interface EnqueueInput {
	file: File;
	scope: UploadScope;
	/**
	 * Optional human label. Defaults to `file.name`. Useful when a single
	 * source file produces multiple uploads (e.g. media + thumbnail).
	 */
	label?: string;
	propertyId?: string;
	portfolioId?: string;
	/**
	 * After the direct upload completes, this callback is invoked with the
	 * resulting `{ key, publicUrl }` so the consumer can persist metadata
	 * (e.g. POST to `/api/properties/:id/media/attach`).
	 *
	 * If it throws, the job is marked `failed` and the error surfaces in the
	 * tray.
	 */
	attach?: (result: { key: string; publicUrl: string }) => Promise<void>;
	/** React Query keys to invalidate once the job completes successfully. */
	invalidateKeys?: ReadonlyArray<readonly unknown[]>;
	/**
	 * Patterns to invalidate in the lib-level `cachedGetJSON` store. Required
	 * for any URL that is also fetched directly via `cachedGetJSON` (e.g.
	 * the property drawer hits `/api/properties/:id` outside React Query),
	 * because invalidating React Query alone leaves that snapshot stale.
	 */
	invalidateUrlPatterns?: ReadonlyArray<string | RegExp>;
}

interface UploadContextValue {
	jobs: UploadJob[];
	/** Enqueue one or more uploads. Returns the generated job IDs. */
	enqueue: (inputs: EnqueueInput[]) => string[];
	/** Re-run a previously failed job using its original input. */
	retry: (id: string) => void;
	/** Dismiss a finished/failed job from the tray. */
	dismiss: (id: string) => void;
	/** Clear all finished/failed jobs from the tray. */
	clearFinished: () => void;
}

const UploadContext = createContext<UploadContextValue | null>(null);

export function useUploads(): UploadContextValue {
	const ctx = useContext(UploadContext);
	if (!ctx) {
		throw new Error("useUploads must be used inside <UploadProvider>");
	}
	return ctx;
}

let nextJobId = 1;

export function UploadProvider({ children }: { children: React.ReactNode }) {
	const [jobs, setJobs] = useState<UploadJob[]>([]);
	const queryClient = useQueryClient();
	// Track the latest jobs ref so async handlers update the live list, not
	// a stale closure capture.
	const jobsRef = useRef<UploadJob[]>([]);
	jobsRef.current = jobs;
	// Keep the original EnqueueInput for each job so failed uploads can be
	// retried from the tray. Stored outside React state because `File`
	// objects don't need to trigger re-renders.
	const inputsRef = useRef<Map<string, EnqueueInput>>(new Map());

	const update = useCallback((id: string, patch: Partial<UploadJob>) => {
		setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch } : j)));
	}, []);

	const runJob = useCallback(
		async (id: string, input: EnqueueInput) => {
			try {
				const result = await uploadDirect(input.file, {
					scope: input.scope,
					propertyId: input.propertyId,
					portfolioId: input.portfolioId,
					onProgress: (percent) => update(id, { progress: percent }),
				});
				update(id, { status: "attaching", progress: 100 });

				if (input.attach) {
					await input.attach(result);
				}

				if (input.invalidateKeys) {
					for (const key of input.invalidateKeys) {
						// Invalidate without throwing on missing query.
						queryClient.invalidateQueries({
							queryKey: key as unknown[],
						});
					}
				}

				if (input.invalidateUrlPatterns) {
					for (const pattern of input.invalidateUrlPatterns) {
						invalidateCachedGet(pattern);
					}
				}

				update(id, { status: "done", finishedAt: Date.now() });
			} catch (err) {
				const message = err instanceof Error ? err.message : "Upload failed";
				update(id, {
					status: "failed",
					error: message,
					finishedAt: Date.now(),
				});
			}
		},
		[queryClient, update],
	);

	const enqueue = useCallback(
		(inputs: EnqueueInput[]): string[] => {
			const created: UploadJob[] = inputs.map((input) => ({
				id: `upload-${nextJobId++}`,
				label: input.label ?? input.file.name,
				scope: input.scope,
				status: "uploading" as const,
				progress: 0,
				startedAt: Date.now(),
			}));
			setJobs((prev) => [...prev, ...created]);
			// Kick off uploads in parallel; runJob handles its own state.
			created.forEach((job, i) => {
				inputsRef.current.set(job.id, inputs[i]);
				runJob(job.id, inputs[i]);
			});
			return created.map((j) => j.id);
		},
		[runJob],
	);

	const retry = useCallback(
		(id: string) => {
			const input = inputsRef.current.get(id);
			if (!input) return;
			update(id, {
				status: "uploading",
				progress: 0,
				error: undefined,
				finishedAt: undefined,
				startedAt: Date.now(),
			});
			runJob(id, input);
		},
		[runJob, update],
	);

	const dismiss = useCallback((id: string) => {
		inputsRef.current.delete(id);
		setJobs((prev) => prev.filter((j) => j.id !== id));
	}, []);

	const clearFinished = useCallback(() => {
		setJobs((prev) => {
			const keep = prev.filter(
				(j) => j.status === "uploading" || j.status === "attaching",
			);
			const keepIds = new Set(keep.map((j) => j.id));
			for (const id of inputsRef.current.keys()) {
				if (!keepIds.has(id)) inputsRef.current.delete(id);
			}
			return keep;
		});
	}, []);

	const value = useMemo<UploadContextValue>(
		() => ({ jobs, enqueue, retry, dismiss, clearFinished }),
		[jobs, enqueue, retry, dismiss, clearFinished],
	);

	return (
		<UploadContext.Provider value={value}>{children}</UploadContext.Provider>
	);
}
