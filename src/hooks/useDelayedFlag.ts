import { useEffect, useState } from "react";

/**
 * Returns `true` only if `flag` has been continuously `true` for at least
 * `delayMs` milliseconds. Used to suppress loading-state flicker for fast
 * data fetches (e.g. an empty result for a brand-new account).
 *
 * - If the underlying fetch resolves before `delayMs`, the flag never flips
 *   to `true` and no skeleton is shown.
 * - If the fetch is genuinely slow, the skeleton appears after the delay.
 */
export default function useDelayedFlag(flag: boolean, delayMs = 250): boolean {
	const [delayed, setDelayed] = useState(false);

	useEffect(() => {
		if (!flag) {
			setDelayed(false);
			return;
		}
		const t = setTimeout(() => setDelayed(true), delayMs);
		return () => clearTimeout(t);
	}, [flag, delayMs]);

	return delayed;
}
