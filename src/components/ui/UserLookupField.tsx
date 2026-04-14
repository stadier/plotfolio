"use client";

import { TransferAPI } from "@/lib/api";
import { Check, Loader2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/* ── Types ─────────────────────────────────────────────────────────────────── */

export interface LookedUpUser {
	id: string;
	name: string;
	username: string;
	displayName: string;
	email: string;
	avatar?: string;
	type: string;
}

export type LookupStatus = "idle" | "searching" | "found" | "not-found";

export interface UserLookupFieldProps {
	/** Current text value */
	value: string;
	/** Called on every keystroke */
	onChange: (value: string) => void;
	/** Fires when a valid user is resolved via username lookup */
	onUserFound?: (user: LookedUpUser) => void;
	/** Fires when a previously found user is cleared (value changed after match) */
	onUserCleared?: () => void;
	/** Expose the current lookup status to the parent */
	onStatusChange?: (status: LookupStatus) => void;
	/** Whether to render the hint text below the input (default: true) */
	showHint?: boolean;
	placeholder?: string;
	className?: string;
	disabled?: boolean;
}

/* ── Component ─────────────────────────────────────────────────────────────── */

export default function UserLookupField({
	value,
	onChange,
	onUserFound,
	onUserCleared,
	onStatusChange,
	showHint = true,
	placeholder = "Email or @username",
	className,
	disabled,
}: UserLookupFieldProps) {
	const [status, setStatus] = useState<LookupStatus>("idle");
	const [foundUser, setFoundUser] = useState<LookedUpUser | null>(null);
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const lastResolved = useRef<string>("");

	/* Determine if the current value looks like a username query */
	const isUsernameQuery =
		value.includes("@") && !value.includes("@", value.indexOf("@") + 1);
	// Single @ means username mode; two @'s (like an email a@b) means email mode

	/* Actually: email contains exactly one @ with chars on both sides,
	   username starts with @ or has @ with no dot-domain after it.
	   Simpler heuristic: if it matches x@y.z → email, else if contains @ → username */
	const looksLikeEmail = /^[^@]+@[^@]+\.[^@]+$/.test(value.trim());
	const shouldLookup = value.includes("@") && !looksLikeEmail;

	/* Sync status upstream */
	useEffect(() => {
		onStatusChange?.(status);
	}, [status, onStatusChange]);

	/* Debounced username lookup */
	useEffect(() => {
		if (timer.current) clearTimeout(timer.current);

		if (!shouldLookup) {
			// Not in username mode — reset if we had a previous match
			if (status !== "idle") {
				setStatus("idle");
				if (foundUser) {
					setFoundUser(null);
					lastResolved.current = "";
					onUserCleared?.();
				}
			}
			return;
		}

		const clean = value.replace(/^@/, "").replace(/@/g, "").trim();
		if (!clean) {
			setStatus("idle");
			return;
		}

		// Already resolved this exact username
		if (clean === lastResolved.current && foundUser) {
			setStatus("found");
			return;
		}

		// Clear previous match while typing
		if (foundUser) {
			setFoundUser(null);
			lastResolved.current = "";
			onUserCleared?.();
		}

		setStatus("searching");

		timer.current = setTimeout(async () => {
			const result = await TransferAPI.lookupUser(clean);
			if (result.found && result.user) {
				const user = result.user as LookedUpUser;
				setFoundUser(user);
				lastResolved.current = clean;
				setStatus("found");
				onUserFound?.(user);
			} else {
				setFoundUser(null);
				lastResolved.current = "";
				setStatus("not-found");
			}
		}, 500);

		return () => {
			if (timer.current) clearTimeout(timer.current);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [value, shouldLookup]);

	/* Border color based on status */
	const borderClass =
		shouldLookup && status === "found"
			? "border-emerald-500"
			: shouldLookup && status === "not-found"
				? "border-red-400"
				: "border-border";

	return (
		<div>
			<div className="relative">
				<input
					type="text"
					value={value}
					onChange={(e) => onChange(e.target.value)}
					disabled={disabled}
					placeholder={placeholder}
					className={`w-full px-4 py-2.5 rounded-lg border bg-card text-on-surface placeholder:text-outline text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow ${borderClass} ${className ?? ""}`}
				/>

				{/* Status indicator */}
				{shouldLookup && status === "searching" && (
					<Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline animate-spin" />
				)}
				{shouldLookup && status === "found" && (
					<Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600" />
				)}
				{shouldLookup && status === "not-found" && (
					<X className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />
				)}
			</div>

			{/* Found user hint */}
			{showHint && shouldLookup && status === "found" && foundUser && (
				<p className="text-xs text-emerald-600 mt-1">
					Found: {foundUser.displayName || foundUser.name} ({foundUser.email})
				</p>
			)}
			{showHint && shouldLookup && status === "not-found" && (
				<p className="text-xs text-red-500 mt-1">
					No user found with that username.
				</p>
			)}
		</div>
	);
}
