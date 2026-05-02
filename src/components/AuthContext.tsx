"use client";

import {
	clearClientCacheScope,
	getClientCacheScope,
	getReactQueryCacheStorageKey,
	setClientCacheScope,
} from "@/lib/cacheScope";
import { invalidateCachedGet } from "@/lib/clientCache";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
	createContext,
	ReactNode,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";

export interface AuthUser {
	id: string;
	name: string;
	username: string;
	displayName: string;
	email: string;
	avatar?: string;
	banner?: string;
	phone?: string;
	type: "individual" | "company" | "trust";
	joinDate?: string;
	salesCount?: number;
	followerCount?: number;
	allowBookings?: boolean;
	displayCurrency?: string;
	isAdmin?: boolean;
	verificationStatus?: string;
	settings?: {
		aiDocumentProcessing?: boolean;
	};
}

interface AuthContextValue {
	user: AuthUser | null;
	loading: boolean;
	login: (email: string, password: string) => Promise<{ error?: string }>;
	signup: (
		name: string,
		email: string,
		password: string,
	) => Promise<{ error?: string }>;
	googleLogin: (credential: string) => Promise<{ error?: string }>;
	logout: () => Promise<void>;
	refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
	children,
	initialUser,
}: {
	children: ReactNode;
	/**
	 * Server-resolved user (from the root layout). Passing this prevents the
	 * "log in button flashes briefly on refresh" problem by hydrating the
	 * client with the correct auth state on the first paint, instead of
	 * waiting for the client-side `/api/auth/me` round trip.
	 */
	initialUser?: AuthUser | null;
}) {
	const [user, setUser] = useState<AuthUser | null>(initialUser ?? null);
	// If we already resolved the user on the server, we are not in a
	// loading state from the consumer's perspective. The background
	// `refresh()` call below will silently revalidate without forcing
	// the UI to re-show skeletons / login button.
	const [loading, setLoading] = useState(initialUser === undefined);
	const router = useRouter();
	const queryClient = useQueryClient();
	const previousUserIdRef = useRef<string | null | undefined>(undefined);

	const clearAuthScopedCaches = useCallback(
		(previousScope: string, removeActivePortfolio = false) => {
			invalidateCachedGet();
			queryClient.clear();
			if (typeof window !== "undefined") {
				localStorage.removeItem(getReactQueryCacheStorageKey(previousScope));
				if (removeActivePortfolio) {
					localStorage.removeItem("plotfolio-active-portfolio");
				}
			}
		},
		[queryClient],
	);

	const transitionAuthCacheScope = useCallback(
		(nextUserId: string | null, removeActivePortfolio = false) => {
			const previousScope = getClientCacheScope();
			const nextScope = nextUserId ?? "guest";
			if (previousScope === nextScope) {
				return;
			}

			clearAuthScopedCaches(previousScope, removeActivePortfolio);
			if (nextUserId) {
				setClientCacheScope(nextUserId);
			} else {
				clearClientCacheScope();
			}
		},
		[clearAuthScopedCaches],
	);

	const refresh = useCallback(async () => {
		try {
			const res = await fetch("/api/auth/me");
			if (res.ok) {
				const data = await res.json();
				transitionAuthCacheScope(data.user?.id ?? null);
				setUser(data.user ?? null);
			} else {
				transitionAuthCacheScope(null, true);
				setUser(null);
			}
		} catch {
			transitionAuthCacheScope(null, true);
			setUser(null);
		} finally {
			setLoading(false);
		}
	}, [transitionAuthCacheScope]);

	useEffect(() => {
		refresh();
	}, [refresh]);

	useEffect(() => {
		const currentUserId = user?.id ?? null;
		if (
			previousUserIdRef.current !== undefined &&
			previousUserIdRef.current !== currentUserId
		) {
			transitionAuthCacheScope(currentUserId, true);
		}
		previousUserIdRef.current = currentUserId;
	}, [user?.id, transitionAuthCacheScope]);

	const login = useCallback(
		async (email: string, password: string) => {
			const res = await fetch("/api/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email, password }),
			});
			const data = await res.json();
			if (!res.ok) return { error: data.error || "Login failed" };
			transitionAuthCacheScope(data.user?.id ?? null, true);
			setUser(data.user);
			return {};
		},
		[transitionAuthCacheScope],
	);

	const signup = useCallback(
		async (name: string, email: string, password: string) => {
			const res = await fetch("/api/auth/signup", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name, email, password }),
			});
			const data = await res.json();
			if (!res.ok) return { error: data.error || "Signup failed" };
			transitionAuthCacheScope(data.user?.id ?? null, true);
			setUser(data.user);
			return {};
		},
		[transitionAuthCacheScope],
	);

	const googleLogin = useCallback(
		async (credential: string) => {
			const res = await fetch("/api/auth/google", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ credential }),
			});
			const data = await res.json();
			if (!res.ok) return { error: data.error || "Google sign-in failed" };
			transitionAuthCacheScope(data.user?.id ?? null, true);
			setUser(data.user);
			return {};
		},
		[transitionAuthCacheScope],
	);

	const logout = useCallback(async () => {
		await fetch("/api/auth/logout", { method: "POST" });
		transitionAuthCacheScope(null, true);
		setUser(null);
		// Hard navigation so the root layout re-runs and the QueryProvider's
		// persister is recreated with the guest-scoped storage key. A soft
		// router.push would leave the persister bound to the previous user.
		if (typeof window !== "undefined") {
			window.location.assign("/login");
		} else {
			router.push("/login");
		}
	}, [router, transitionAuthCacheScope]);

	return (
		<AuthContext.Provider
			value={{ user, loading, login, signup, googleLogin, logout, refresh }}
		>
			{children}
		</AuthContext.Provider>
	);
}

export function useAuth() {
	const ctx = useContext(AuthContext);
	if (!ctx) throw new Error("useAuth must be used within AuthProvider");
	return ctx;
}

/**
 * Redirect to /login if not authenticated.
 * Returns { user, loading } — `user` is null while loading or when redirecting.
 */
export function useRequireAuth() {
	const { user, loading, ...rest } = useAuth();
	const router = useRouter();

	useEffect(() => {
		if (!loading && !user) {
			router.replace("/login");
		}
	}, [loading, user, router]);

	return { user, loading, ...rest };
}
