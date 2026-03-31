"use client";

import { useRouter } from "next/navigation";
import {
	createContext,
	ReactNode,
	useCallback,
	useContext,
	useEffect,
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
	logout: () => Promise<void>;
	refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<AuthUser | null>(null);
	const [loading, setLoading] = useState(true);
	const router = useRouter();

	const refresh = useCallback(async () => {
		try {
			const res = await fetch("/api/auth/me");
			if (res.ok) {
				const data = await res.json();
				setUser(data.user ?? null);
			} else {
				setUser(null);
			}
		} catch {
			setUser(null);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		refresh();
	}, [refresh]);

	const login = useCallback(async (email: string, password: string) => {
		const res = await fetch("/api/auth/login", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email, password }),
		});
		const data = await res.json();
		if (!res.ok) return { error: data.error || "Login failed" };
		setUser(data.user);
		return {};
	}, []);

	const signup = useCallback(
		async (name: string, email: string, password: string) => {
			const res = await fetch("/api/auth/signup", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name, email, password }),
			});
			const data = await res.json();
			if (!res.ok) return { error: data.error || "Signup failed" };
			setUser(data.user);
			return {};
		},
		[],
	);

	const logout = useCallback(async () => {
		await fetch("/api/auth/logout", { method: "POST" });
		setUser(null);
		router.push("/login");
	}, [router]);

	return (
		<AuthContext.Provider
			value={{ user, loading, login, signup, logout, refresh }}
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
