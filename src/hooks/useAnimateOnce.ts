import { useState } from "react";

/**
 * Returns true only on the first mount within the browser session for the given key.
 * Subsequent mounts (e.g. navigating away and back) return false,
 * so entrance animations play just once per session.
 */
export default function useAnimateOnce(key: string): boolean {
	const [shouldAnimate] = useState(() => {
		if (typeof window === "undefined") return false;
		const storageKey = `_anim_${key}`;
		if (sessionStorage.getItem(storageKey)) return false;
		sessionStorage.setItem(storageKey, "1");
		return true;
	});

	return shouldAnimate;
}
