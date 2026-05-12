"use client";

import { useEffect, useState } from "react";

/**
 * Shared layout mode for the property detail left column.
 * Backed by `localStorage` and synchronised across all components in the page
 * via a module-level subscriber set so the toggle button (rendered in the
 * page header) and the panel itself stay in lock-step.
 */
export type PropertyViewLayout = "stacked" | "tabs";

const STORAGE_KEY = "propertyFullView.leftLayout";
const DEFAULT: PropertyViewLayout = "stacked";

let current: PropertyViewLayout = DEFAULT;
let hydrated = false;
const listeners = new Set<(value: PropertyViewLayout) => void>();

function isLayout(v: unknown): v is PropertyViewLayout {
	return v === "stacked" || v === "tabs";
}

function hydrate() {
	if (hydrated || typeof window === "undefined") return;
	hydrated = true;
	try {
		const raw = window.localStorage.getItem(STORAGE_KEY);
		if (raw === null) return;
		const parsed = JSON.parse(raw);
		if (isLayout(parsed)) current = parsed;
	} catch {
		// ignore
	}
}

export function usePropertyViewLayout(): [
	PropertyViewLayout,
	(value: PropertyViewLayout) => void,
] {
	const [value, setValue] = useState<PropertyViewLayout>(current);

	useEffect(() => {
		hydrate();
		setValue(current);
		const cb = (v: PropertyViewLayout) => setValue(v);
		listeners.add(cb);
		return () => {
			listeners.delete(cb);
		};
	}, []);

	const update = (next: PropertyViewLayout) => {
		current = next;
		try {
			if (typeof window !== "undefined") {
				window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
			}
		} catch {
			// ignore
		}
		listeners.forEach((cb) => cb(next));
	};

	return [value, update];
}
