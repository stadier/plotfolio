"use client";

import { useAuth } from "@/components/AuthContext";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Mode = "login" | "signup";

export default function LoginPage() {
	const { user, loading: authLoading, login, signup } = useAuth();
	const router = useRouter();

	const [mode, setMode] = useState<Mode>("login");
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

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
				router.replace("/portfolio");
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
						src="/plotfolio-logo.svg"
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
				<div className="bg-white dark:bg-surface-container rounded-xl border border-slate-200 dark:border-outline-variant shadow-sm p-6">
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
									? "bg-white dark:bg-surface-container-high text-primary shadow-sm"
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
									? "bg-white dark:bg-surface-container-high text-primary shadow-sm"
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
									className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-outline-variant bg-slate-50 dark:bg-surface-container-low text-sm text-on-surface placeholder:text-slate-400 dark:placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
								/>
							</div>
						)}

						<div>
							<label
								htmlFor="email"
								className="block text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-on-surface-variant mb-1.5"
							>
								Email
							</label>
							<input
								id="email"
								type="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								placeholder="you@example.com"
								autoComplete="email"
								required
								className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-outline-variant bg-slate-50 dark:bg-surface-container-low text-sm text-on-surface placeholder:text-slate-400 dark:placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
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
									className="w-full px-3 py-2.5 pr-10 rounded-lg border border-slate-200 dark:border-outline-variant bg-slate-50 dark:bg-surface-container-low text-sm text-on-surface placeholder:text-slate-400 dark:placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
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
