"use client";

import { ArrowLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

// ── Module-scoped navigation tracking ───────────────────────────
let _navCount = 0;
let _previousPath: string | null = null;
let _currentPath: string | null = null;

/**
 * Drop this once in the root layout to track in-app navigations.
 * Renders nothing visible.
 */
export function NavigationTracker() {
	const pathname = usePathname();
	useEffect(() => {
		_previousPath = _currentPath;
		_currentPath = pathname;
		_navCount += 1;
	}, [pathname]);
	return null;
}

/** True when the browser has a real history entry to go back to. */
function hasBrowserHistory(): boolean {
	if (typeof window === "undefined") return false;
	// window.history.length > 1 is the most reliable cross-browser check.
	// A fresh tab starts at 1; any prior navigation bumps it to 2+.
	return window.history.length > 1;
}

// ── Path → label mapping ────────────────────────────────────────
const STATIC_LABELS: Record<string, string> = {
	"/portfolio/properties": "Properties",
	"/portfolio": "Dashboard",
	"/marketplace": "Marketplace",
	"/marketplace/favourites": "Favourites",
	"/settings": "Settings",
};

function labelForPath(path: string): string | null {
	if (STATIC_LABELS[path]) return STATIC_LABELS[path];
	if (/^\/portfolio\/properties\/[^/]+$/.test(path)) return "Property";
	if (/^\/portfolio\/properties\/[^/]+\/edit$/.test(path)) return "Edit";
	if (/^\/marketplace\/[^/]+$/.test(path)) return "Listing";
	if (/^\/profile\/[^/]+$/.test(path)) return "Profile";
	return null;
}

// ── BackButton component ────────────────────────────────────────
interface BackButtonProps {
	/** URL to navigate to when there is no in-app history (e.g. direct page load) */
	fallbackHref: string;
	/** Default label shown when previous path is unknown */
	label: string;
	className?: string;
}

export default function BackButton({
	fallbackHref,
	label,
	className,
}: BackButtonProps) {
	const router = useRouter();

	const displayLabel =
		(_previousPath ? labelForPath(_previousPath) : null) ?? label;

	const handleBack = () => {
		if (_navCount > 1 || hasBrowserHistory()) {
			router.back();
		} else {
			router.push(fallbackHref);
		}
	};

	return (
		<button
			type="button"
			onClick={handleBack}
			className={
				className ??
				"flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-primary transition-colors font-body cursor-pointer"
			}
		>
			<ArrowLeft className="w-4 h-4" />
			{displayLabel}
		</button>
	);
}
