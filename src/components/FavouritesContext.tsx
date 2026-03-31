"use client";

import { useAuth } from "@/components/AuthContext";
import {
	createContext,
	ReactNode,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";

const STORAGE_KEY = "plotfolio-favourites";

interface FavouritesContextValue {
	favourites: Set<string>;
	isFavourite: (propertyId: string) => boolean;
	toggleFavourite: (propertyId: string) => void;
	loading: boolean;
}

const FavouritesContext = createContext<FavouritesContextValue | null>(null);

function readLocalStorage(): Set<string> {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return new Set();
		const parsed = JSON.parse(raw);
		if (Array.isArray(parsed)) return new Set<string>(parsed);
	} catch {
		// ignore
	}
	return new Set();
}

function writeLocalStorage(ids: Set<string>) {
	localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

export function FavouritesProvider({ children }: { children: ReactNode }) {
	const { user } = useAuth();
	const [favourites, setFavourites] = useState<Set<string>>(new Set());
	const [loading, setLoading] = useState(true);
	const syncedRef = useRef(false);
	const prevUserIdRef = useRef<string | null>(null);

	// On mount: load from localStorage
	useEffect(() => {
		setFavourites(readLocalStorage());
		setLoading(false);
	}, []);

	// When user logs in: sync localStorage favourites to DB, then load DB favourites
	useEffect(() => {
		if (!user) {
			// User logged out — revert to localStorage only
			if (prevUserIdRef.current) {
				// They were logged in before, keep localStorage as-is
				syncedRef.current = false;
			}
			prevUserIdRef.current = null;
			return;
		}

		// Already synced for this user
		if (syncedRef.current && prevUserIdRef.current === user.id) return;

		const syncFavourites = async () => {
			try {
				const localFavs = readLocalStorage();

				if (localFavs.size > 0) {
					// Merge local favourites into DB
					const res = await fetch("/api/favourites", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							userId: user.id,
							propertyIds: [...localFavs],
						}),
					});
					if (res.ok) {
						const data = await res.json();
						const merged = new Set<string>(data.propertyIds);
						setFavourites(merged);
						writeLocalStorage(merged);
					}
				} else {
					// No local favourites — just load from DB
					const res = await fetch(
						`/api/favourites?userId=${encodeURIComponent(user.id)}`,
					);
					if (res.ok) {
						const data = await res.json();
						const dbFavs = new Set<string>(data.propertyIds);
						setFavourites(dbFavs);
						writeLocalStorage(dbFavs);
					}
				}
			} catch (err) {
				console.error("Failed to sync favourites:", err);
			}

			syncedRef.current = true;
			prevUserIdRef.current = user.id;
		};

		syncFavourites();
	}, [user]);

	const isFavourite = useCallback(
		(propertyId: string) => favourites.has(propertyId),
		[favourites],
	);

	const toggleFavourite = useCallback(
		(propertyId: string) => {
			setFavourites((prev) => {
				const next = new Set(prev);
				if (next.has(propertyId)) next.delete(propertyId);
				else next.add(propertyId);

				// Persist to localStorage immediately
				writeLocalStorage(next);

				// If logged in, also persist to DB (fire-and-forget)
				if (user) {
					fetch("/api/favourites", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							userId: user.id,
							propertyId,
						}),
					}).catch((err) =>
						console.error("Failed to sync favourite to DB:", err),
					);
				}

				return next;
			});
		},
		[user],
	);

	return (
		<FavouritesContext.Provider
			value={{ favourites, isFavourite, toggleFavourite, loading }}
		>
			{children}
		</FavouritesContext.Provider>
	);
}

export function useFavourites() {
	const ctx = useContext(FavouritesContext);
	if (!ctx)
		throw new Error("useFavourites must be used within FavouritesProvider");
	return ctx;
}
