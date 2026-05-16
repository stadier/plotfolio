"use client";

import { useEffect, useState } from "react";

export interface PublicViewer {
	id: string;
	name: string;
	email: string;
}

const STORAGE_KEY = "plotfolio_public_viewer_v1";

function createViewerId() {
	if (
		typeof crypto !== "undefined" &&
		typeof crypto.randomUUID === "function"
	) {
		return `viewer_${crypto.randomUUID()}`;
	}
	return `viewer_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function parseViewer(raw: string | null): PublicViewer | null {
	if (!raw) return null;
	try {
		const parsed = JSON.parse(raw) as Partial<PublicViewer>;
		if (
			typeof parsed.id === "string" &&
			typeof parsed.name === "string" &&
			typeof parsed.email === "string"
		) {
			return {
				id: parsed.id,
				name: parsed.name,
				email: parsed.email,
			};
		}
	} catch {
		// Ignore malformed storage values.
	}
	return null;
}

function buildNewViewer(): PublicViewer {
	const id = createViewerId();
	return {
		id,
		name: "Marketplace Viewer",
		email: `${id}@guest.plotfolio.local`,
	};
}

export default function usePublicViewer() {
	const [viewer, setViewer] = useState<PublicViewer | null>(null);

	useEffect(() => {
		if (typeof window === "undefined") return;

		const stored = parseViewer(window.localStorage.getItem(STORAGE_KEY));
		if (stored) {
			setViewer(stored);
			return;
		}

		const created = buildNewViewer();
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(created));
		setViewer(created);
	}, []);

	return viewer;
}
