"use client";

import { useAuth } from "@/components/AuthContext";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

declare global {
	interface Window {
		google?: {
			accounts: {
				id: {
					initialize: (config: {
						client_id: string;
						callback: (response: { credential: string }) => void;
						auto_select?: boolean;
					}) => void;
					renderButton: (
						element: HTMLElement,
						config: {
							theme?: string;
							size?: string;
							width?: number;
							text?: string;
							shape?: string;
						},
					) => void;
				};
			};
		};
	}
}

type Mode = "login" | "signup";

export default function LoginPage() {
	const { user, loading: authLoading, login, signup, googleLogin } = useAuth();
	const router = useRouter();

	const [mode, setMode] = useState<Mode>("login");
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const [googleReady, setGoogleReady] = useState(false);
	const googleBtnRef = useRef<HTMLDivElement>(null);

	// Handle Google credential response
	const handleGoogleResponse = useCallback(
		async (response: { credential: string }) => {
			setError(null);
			setSubmitting(true);
			try {
				const result = await googleLogin(response.credential);
				if (result.error) {
					setError(result.error);
				} else {
					// Hard navigation so the root layout re-runs and the
					// QueryProvider persister picks up the new user-scoped
					// storage key.
					if (typeof window !== "undefined") {
						window.location.assign("/portfolio");
					} else {
						router.replace("/portfolio");
					}
				}
			} catch {
				setError("Google sign-in failed. Please try again.");
			} finally {
				setSubmitting(false);
			}
		},
		[googleLogin, router],
	);

	// Load Google Identity Services script and render button
	useEffect(() => {
		let cancelled = false;

		async function initGoogle() {
			// Fetch client ID from our API
			try {
				const res = await fetch("/api/auth/google-client-id");
				if (!res.ok) return;
				const { clientId } = await res.json();
				if (!clientId || cancelled) return;

				// Load GSI script if not already loaded
				if (!document.getElementById("google-gsi-script")) {
					const script = document.createElement("script");
					script.id = "google-gsi-script";
					script.src = "https://accounts.google.com/gsi/client";
					script.async = true;
					script.defer = true;
					script.onload = () => {
						if (!cancelled) renderGoogleButton(clientId);
					};
					document.head.appendChild(script);
				} else {
					renderGoogleButton(clientId);
				}
			} catch {
				// Google sign-in not available — silently degrade
			}
		}

		function renderGoogleButton(clientId: string) {
			if (!window.google || !googleBtnRef.current) return;

			window.google.accounts.id.initialize({
				client_id: clientId,
				callback: handleGoogleResponse,
			});

			window.google.accounts.id.renderButton(googleBtnRef.current, {
				theme: "outline",
				size: "large",
				width: 320,
				text: "continue_with",
				shape: "rectangular",
			});

			setGoogleReady(true);
		}

		initGoogle();
		return () => {
			cancelled = true;
		};
	}, [handleGoogleResponse]);

	// Redirect if already logged in
	useEffect(() => {
		if (!authLoading && user) {
			router.replace("/portfolio");
		}
	}, [authLoading, user, router]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		setSubmitting(true);

		try {
			let result: { error?: string };

			if (mode === "signup") {
				if (!name.trim()) {
					setError("Name is required");
					setSubmitting(false);
					return;
				}
				result = await signup(name.trim(), email.trim(), password);
			} else {
				result = await login(email.trim(), password);
			}

			if (result.error) {
				setError(result.error);
			} else {
				// Hard navigation so the root layout re-runs and the
				// QueryProvider persister picks up the new user-scoped
				// storage key. router.replace would keep the previous
				// persister scope.
				if (typeof window !== "undefined") {
					window.location.assign("/portfolio");
				} else {
					router.replace("/portfolio");
				}
			}
		} catch {
			setError("Something went wrong. Please try again.");
		} finally {
			setSubmitting(false);
		}
	};

	// Show nothing while checking auth state
	if (authLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-background">
				<Loader2 className="w-6 h-6 animate-spin text-primary" />
			</div>
		);
	}

	// Already logged in — will redirect
	if (user) return null;

	return (
		<div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-background px-4">
			<div className="w-full max-w-sm">
				{/* Logo */}
				<div className="flex flex-col items-center mb-8">
					<Image
						src="/plotfolio-logo-l.png"
						alt="Plotfolio"
						width={48}
						height={48}
						className="w-12 h-12 mb-3"
					/>
					<h1 className="text-2xl font-bold tracking-tighter text-primary font-headline">
						Plotfolio
					</h1>
					<p className="text-xs text-slate-500 dark:text-on-surface-variant mt-1">
						Property Portfolio Management
					</p>
				</div>

				{/* Card */}
				<div className="bg-card rounded-xl border border-border shadow-sm p-6">
					{/* Mode tabs */}
					<div className="flex bg-slate-100 dark:bg-surface-container-low rounded-lg p-1 mb-6">
						<button
							type="button"
							onClick={() => {
								setMode("login");
								setError(null);
							}}
							className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-md transition-all ${
								mode === "login"
									? "bg-card text-primary shadow-sm"
									: "text-slate-500 dark:text-on-surface-variant"
							}`}
						>
							Log In
						</button>
						<button
							type="button"
							onClick={() => {
								setMode("signup");
								setError(null);
							}}
							className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-md transition-all ${
								mode === "signup"
									? "bg-card text-primary shadow-sm"
									: "text-slate-500 dark:text-on-surface-variant"
							}`}
						>
							Sign Up
						</button>
					</div>

					{/* Form */}
					<form onSubmit={handleSubmit} className="flex flex-col gap-4">
						{mode === "signup" && (
							<div>
								<label
									htmlFor="name"
									className="block text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-on-surface-variant mb-1.5"
								>
									Full Name
								</label>
								<input
									id="name"
									type="text"
									value={name}
									onChange={(e) => setName(e.target.value)}
									placeholder="Your full name"
									autoComplete="name"
									className="w-full px-3 py-2.5 rounded-lg border border-border bg-slate-50 dark:bg-surface-container-low text-sm text-on-surface placeholder:text-slate-400 dark:placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
								/>
							</div>
						)}

						<div>
							<label
								htmlFor="email"
								className="block text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-on-surface-variant mb-1.5"
							>
								{mode === "login" ? "Email or Username" : "Email"}
							</label>
							<input
								id="email"
								type={mode === "login" ? "text" : "email"}
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								placeholder={
									mode === "login"
										? "you@example.com or username"
										: "you@example.com"
								}
								autoComplete={mode === "login" ? "username" : "email"}
								required
								className="w-full px-3 py-2.5 rounded-lg border border-border bg-slate-50 dark:bg-surface-container-low text-sm text-on-surface placeholder:text-slate-400 dark:placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
							/>
						</div>

						<div>
							<label
								htmlFor="password"
								className="block text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-on-surface-variant mb-1.5"
							>
								Password
							</label>
							<div className="relative">
								<input
									id="password"
									type={showPassword ? "text" : "password"}
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									placeholder={
										mode === "signup" ? "Min. 6 characters" : "Your password"
									}
									autoComplete={
										mode === "signup" ? "new-password" : "current-password"
									}
									required
									className="w-full px-3 py-2.5 pr-10 rounded-lg border border-border bg-slate-50 dark:bg-surface-container-low text-sm text-on-surface placeholder:text-slate-400 dark:placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
								/>
								<button
									type="button"
									onClick={() => setShowPassword(!showPassword)}
									className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-on-surface-variant"
								>
									{showPassword ? (
										<EyeOff className="w-4 h-4" />
									) : (
										<Eye className="w-4 h-4" />
									)}
								</button>
							</div>
						</div>

						{error && (
							<p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
								{error}
							</p>
						)}

						<button
							type="submit"
							disabled={submitting}
							className="signature-gradient text-white font-headline font-bold text-xs uppercase tracking-widest py-3 rounded-lg shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed mt-1"
						>
							{submitting ? (
								<Loader2 className="w-4 h-4 animate-spin" />
							) : mode === "login" ? (
								"Log In"
							) : (
								"Create Account"
							)}
						</button>
					</form>

					{/* Divider */}
					<div className="flex items-center gap-3 my-5">
						<div className="flex-1 h-px bg-border" />
						<span className="text-[11px] font-medium uppercase tracking-widest text-outline">
							or
						</span>
						<div className="flex-1 h-px bg-border" />
					</div>

					{/* Google Sign-In button */}
					<div className="flex justify-center">
						<div ref={googleBtnRef} className={googleReady ? "" : "hidden"} />
						{!googleReady && (
							<button
								type="button"
								disabled
								className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border border-border bg-card text-sm text-on-surface-variant opacity-50"
							>
								<Loader2 className="w-4 h-4 animate-spin" />
								Loading Google Sign-In…
							</button>
						)}
					</div>
				</div>

				{/* Footer */}
				<p className="text-center text-[11px] text-slate-400 dark:text-on-surface-variant/60 mt-6">
					{mode === "login"
						? "Don't have an account? "
						: "Already have an account? "}
					<button
						onClick={() => {
							setMode(mode === "login" ? "signup" : "login");
							setError(null);
						}}
						className="text-primary font-semibold hover:underline"
					>
						{mode === "login" ? "Sign up" : "Log in"}
					</button>
				</p>
			</div>
		</div>
	);
}
