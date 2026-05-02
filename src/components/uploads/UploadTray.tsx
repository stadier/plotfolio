"use client";

import { useUploads, type UploadJob } from "@/components/uploads/UploadContext";
import {
	AlertCircle,
	CheckCircle2,
	ChevronDown,
	ChevronUp,
	Loader2,
	RotateCcw,
	X,
} from "lucide-react";
import { useEffect, useState } from "react";

/**
 * Floating tray (bottom-right) that surfaces all in-flight and recently
 * finished uploads. Mounted globally in the root layout so the user can
 * navigate freely while uploads continue in the background.
 *
 * Hidden entirely when there are no jobs.
 */
export default function UploadTray() {
	const { jobs, dismiss, retry, clearFinished } = useUploads();
	const [collapsed, setCollapsed] = useState(false);

	// Auto-dismiss successful jobs 5s after they complete so the tray
	// shrinks back when everything is done.
	useEffect(() => {
		const timers = jobs
			.filter((j) => j.status === "done" && j.finishedAt)
			.map((j) => {
				const elapsed = Date.now() - (j.finishedAt ?? 0);
				const remaining = Math.max(0, 5000 - elapsed);
				return window.setTimeout(() => dismiss(j.id), remaining);
			});
		return () => timers.forEach(window.clearTimeout);
	}, [jobs, dismiss]);

	if (jobs.length === 0) return null;

	const inFlight = jobs.filter(
		(j) => j.status === "uploading" || j.status === "attaching",
	).length;
	const failed = jobs.filter((j) => j.status === "failed").length;
	const done = jobs.filter((j) => j.status === "done").length;

	const headerLabel =
		inFlight > 0
			? `Uploading ${inFlight} file${inFlight > 1 ? "s" : ""}…`
			: failed > 0
				? `${failed} upload${failed > 1 ? "s" : ""} failed`
				: `${done} upload${done > 1 ? "s" : ""} complete`;

	return (
		<div
			className="fixed bottom-4 right-4 z-50 w-[min(380px,calc(100vw-2rem))] max-w-sm bg-card border border-border rounded-md shadow-lg overflow-hidden"
			role="status"
			aria-live="polite"
		>
			<header className="flex items-center justify-between gap-2 px-3 py-2 bg-surface-container-high border-b border-border">
				<div className="flex items-center gap-2 min-w-0">
					{inFlight > 0 && (
						<Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
					)}
					<span className="typo-body-sm font-medium text-on-surface truncate">
						{headerLabel}
					</span>
				</div>
				<div className="flex items-center gap-1 shrink-0">
					<button
						type="button"
						onClick={() => setCollapsed((v) => !v)}
						className="p-1 rounded hover:bg-surface-container text-on-surface-variant"
						aria-label={collapsed ? "Expand tray" : "Collapse tray"}
					>
						{collapsed ? (
							<ChevronUp className="w-4 h-4" />
						) : (
							<ChevronDown className="w-4 h-4" />
						)}
					</button>
					{inFlight === 0 && (
						<button
							type="button"
							onClick={clearFinished}
							className="p-1 rounded hover:bg-surface-container text-on-surface-variant"
							aria-label="Dismiss all"
						>
							<X className="w-4 h-4" />
						</button>
					)}
				</div>
			</header>
			{!collapsed && (
				<ul className="max-h-72 overflow-y-auto divide-y divide-border">
					{jobs.map((job) => (
						<UploadRow
							key={job.id}
							job={job}
							onDismiss={dismiss}
							onRetry={retry}
						/>
					))}
				</ul>
			)}
		</div>
	);
}

function UploadRow({
	job,
	onDismiss,
	onRetry,
}: {
	job: UploadJob;
	onDismiss: (id: string) => void;
	onRetry: (id: string) => void;
}) {
	const isFinished = job.status === "done" || job.status === "failed";
	return (
		<li className="px-3 py-2 flex items-start gap-2">
			<div className="mt-0.5 shrink-0">
				{job.status === "uploading" || job.status === "attaching" ? (
					<Loader2 className="w-4 h-4 animate-spin text-primary" />
				) : job.status === "done" ? (
					<CheckCircle2 className="w-4 h-4 text-secondary" />
				) : (
					<AlertCircle className="w-4 h-4 text-error" />
				)}
			</div>
			<div className="min-w-0 flex-1">
				<div className="typo-body-sm text-on-surface truncate">{job.label}</div>
				{(job.status === "uploading" || job.status === "attaching") && (
					<div className="mt-1 h-1 w-full bg-surface-container rounded-full overflow-hidden">
						<div
							className="h-full bg-primary transition-[width]"
							style={{ width: `${job.progress}%` }}
						/>
					</div>
				)}
				{job.status === "attaching" && (
					<div className="typo-caption text-on-surface-variant mt-1">
						Saving…
					</div>
				)}
				{job.status === "failed" && job.error && (
					<div className="typo-caption text-error mt-0.5 wrap-break-word">
						{job.error}
					</div>
				)}
			</div>
			{job.status === "failed" && (
				<button
					type="button"
					onClick={() => onRetry(job.id)}
					className="p-1 rounded hover:bg-surface-container text-on-surface-variant shrink-0"
					aria-label="Retry upload"
					title="Retry"
				>
					<RotateCcw className="w-3.5 h-3.5" />
				</button>
			)}
			{isFinished && (
				<button
					type="button"
					onClick={() => onDismiss(job.id)}
					className="p-1 rounded hover:bg-surface-container text-on-surface-variant shrink-0"
					aria-label="Dismiss"
				>
					<X className="w-3.5 h-3.5" />
				</button>
			)}
		</li>
	);
}
