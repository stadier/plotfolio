import { useEffect, useState } from "react";

/**
 * Like `useState`, but persists the value to `localStorage` under the given key
 * so the selection survives page reloads and navigation. SSR-safe: the initial
 * render uses `defaultValue` and the persisted value is hydrated on mount.
 */
export default function usePersistedState<T>(
	key: string,
	defaultValue: T,
	options?: {
		/** Optional guard to reject malformed/legacy stored values. */
		validate?: (value: unknown) => value is T;
	},
): [T, React.Dispatch<React.SetStateAction<T>>] {
	const [value, setValue] = useState<T>(defaultValue);

	// Hydrate from localStorage after mount to avoid SSR hydration mismatches.
	useEffect(() => {
		if (typeof window === "undefined") return;
		try {
			const raw = window.localStorage.getItem(key);
			if (raw === null) return;
			const parsed = JSON.parse(raw) as unknown;
			if (options?.validate && !options.validate(parsed)) return;
			setValue(parsed as T);
		} catch {
			// Ignore corrupted/invalid stored values.
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [key]);

	// Persist whenever value changes.
	useEffect(() => {
		if (typeof window === "undefined") return;
		try {
			window.localStorage.setItem(key, JSON.stringify(value));
		} catch {
			// Storage may be unavailable (private mode, quota); fail silently.
		}
	}, [key, value]);

	return [value, setValue];
}
