"use client";

import { useAuth } from "@/components/AuthContext";
import { Check, Loader2, LogIn, UserPlus, X } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

interface InvitationInfo {
	email: string;
	role: string;
	portfolioName: string;
	inviterName: string;
}

const ROLE_LABELS: Record<string, string> = {
	manager: "Manager",
	agent: "Agent",
	viewer: "Viewer",
};

export default function AcceptInvitePage() {
	const { token } = useParams<{ token: string }>();
	const router = useRouter();
	const { user, loading: authLoading, login, signup } = useAuth();

	const [invitation, setInvitation] = useState<InvitationInfo | null>(null);
	const [fetchError, setFetchError] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);

	// Auth form state
	const [mode, setMode] = useState<"login" | "signup">("signup");
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [authError, setAuthError] = useState<string | null>(null);
	const [authLoading2, setAuthLoading2] = useState(false);

	// Accept state
	const [accepting, setAccepting] = useState(false);
	const [accepted, setAccepted] = useState(false);
	const [acceptError, setAcceptError] = useState<string | null>(null);

	// Fetch invitation details
	useEffect(() => {
		async function fetchInvitation() {
			try {
				const res = await fetch(`/api/invitations/${token}`);
				if (!res.ok) {
					const data = await res.json().catch(() => ({}));
					setFetchError(data.error || "This invitation is no longer valid.");
					setLoading(false);
					return;
				}
				const data = await res.json();
				setInvitation(data);
				setEmail(data.email);
			} catch {
				setFetchError("Failed to load invitation.");
			}
			setLoading(false);
		}
		if (token) fetchInvitation();
	}, [token]);

	// Accept invitation (called when user is logged in)
	const acceptInvitation = useCallback(async () => {
		if (accepting || accepted) return;
		setAccepting(true);
		setAcceptError(null);

		try {
			const res = await fetch(`/api/invitations/${token}`, {
				method: "POST",
			});
			const data = await res.json();
			if (!res.ok) {
				setAcceptError(data.error || "Failed to accept invitation");
				setAccepting(false);
				return;
			}
			setAccepted(true);
			// Hard navigation so the root layout re-runs and the QueryProvider
			// persister picks up the new user-scoped storage key (the user just
			// signed up / logged in via this flow).
			setTimeout(() => {
				if (typeof window !== "undefined") {
					window.location.assign("/portfolio/team");
				} else {
					router.push("/portfolio/team");
				}
			}, 2000);
		} catch {
			setAcceptError("Network error");
		}
		setAccepting(false);
	}, [token, accepting, accepted, router]);

	// Auto-accept when user is logged in and invitation is loaded
	useEffect(() => {
		if (user && invitation && !accepted && !accepting && !acceptError) {
			acceptInvitation();
		}
	}, [user, invitation, accepted, accepting, acceptError, acceptInvitation]);

	// Handle auth form submit
	async function handleAuth(e: React.FormEvent) {
		e.preventDefault();
		setAuthLoading2(true);
		setAuthError(null);

		let result: { error?: string };
		if (mode === "signup") {
			if (!name.trim()) {
				setAuthError("Name is required");
				setAuthLoading2(false);
				return;
			}
			result = await signup(name, email, password);
		} else {
			result = await login(email, password);
		}

		if (result.error) {
			setAuthError(result.error);
		}
		// On success, the useEffect above will trigger acceptInvitation
		setAuthLoading2(false);
	}

	// Loading state
	if (loading || authLoading) {
		return (
			<div className="min-h-screen bg-background flex items-center justify-center">
				<Loader2 className="w-6 h-6 animate-spin text-primary" />
			</div>
		);
	}

	// Invalid invitation
	if (fetchError) {
		return (
			<div className="min-h-screen bg-background flex items-center justify-center px-4">
				<div className="bg-card border border-border rounded-xl p-8 max-w-sm w-full text-center">
					<div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
						<X className="w-6 h-6 text-red-600 dark:text-red-400" />
					</div>
					<h1 className="font-headline text-lg font-bold text-on-surface mb-2">
						Invalid Invitation
					</h1>
					<p className="text-sm text-on-surface-variant mb-6">{fetchError}</p>
					<button
						onClick={() => router.push("/login")}
						className="signature-gradient text-white font-headline font-bold text-xs uppercase tracking-widest px-6 py-3 rounded-lg shadow"
					>
						Go to Login
					</button>
				</div>
			</div>
		);
	}

	if (!invitation) return null;

	const roleLabel = ROLE_LABELS[invitation.role] || invitation.role;

	// Accepted state
	if (accepted) {
		return (
			<div className="min-h-screen bg-background flex items-center justify-center px-4">
				<div className="bg-card border border-border rounded-xl p-8 max-w-sm w-full text-center">
					<div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
						<Check className="w-6 h-6 text-green-600 dark:text-green-400" />
					</div>
					<h1 className="font-headline text-lg font-bold text-on-surface mb-2">
						You're in!
					</h1>
					<p className="text-sm text-on-surface-variant mb-2">
						You've joined{" "}
						<strong className="text-on-surface">
							{invitation.portfolioName}
						</strong>{" "}
						as a <strong className="text-on-surface">{roleLabel}</strong>.
					</p>
					<p className="text-xs text-outline">
						Redirecting to your team page...
					</p>
				</div>
			</div>
		);
	}

	// User is logged in — show accepting state
	if (user) {
		return (
			<div className="min-h-screen bg-background flex items-center justify-center px-4">
				<div className="bg-card border border-border rounded-xl p-8 max-w-sm w-full text-center">
					{acceptError ? (
						<>
							<div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
								<X className="w-6 h-6 text-red-600 dark:text-red-400" />
							</div>
							<h1 className="font-headline text-lg font-bold text-on-surface mb-2">
								Could not accept
							</h1>
							<p className="text-sm text-on-surface-variant mb-6">
								{acceptError}
							</p>
							<button
								onClick={() => router.push("/portfolio/team")}
								className="signature-gradient text-white font-headline font-bold text-xs uppercase tracking-widest px-6 py-3 rounded-lg shadow"
							>
								Go to Team
							</button>
						</>
					) : (
						<>
							<Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-4" />
							<p className="text-sm text-on-surface-variant">
								Accepting invitation...
							</p>
						</>
					)}
				</div>
			</div>
		);
	}

	// Not logged in — show auth form with invitation context
	return (
		<div className="min-h-screen bg-background flex items-center justify-center px-4">
			<div className="bg-card border border-border rounded-xl overflow-hidden max-w-sm w-full">
				{/* Invitation banner */}
				<div className="p-5 border-b border-border bg-surface-container">
					<p className="text-xs text-on-surface-variant uppercase tracking-widest font-bold mb-2">
						You've been invited
					</p>
					<h1 className="font-headline text-lg font-bold text-on-surface mb-1">
						Join "{invitation.portfolioName}"
					</h1>
					<p className="text-sm text-on-surface-variant">
						<strong className="text-on-surface">
							{invitation.inviterName}
						</strong>{" "}
						invited you as a{" "}
						<strong className="text-on-surface">{roleLabel}</strong>
					</p>
				</div>

				{/* Auth form */}
				<div className="p-5">
					{/* Toggle */}
					<div className="flex gap-1 p-1 bg-surface-container rounded-lg mb-5">
						<button
							type="button"
							onClick={() => {
								setMode("signup");
								setAuthError(null);
							}}
							className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-colors ${
								mode === "signup"
									? "bg-card text-on-surface shadow-sm"
									: "text-on-surface-variant"
							}`}
						>
							<UserPlus className="w-3.5 h-3.5" />
							Create Account
						</button>
						<button
							type="button"
							onClick={() => {
								setMode("login");
								setAuthError(null);
							}}
							className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-colors ${
								mode === "login"
									? "bg-card text-on-surface shadow-sm"
									: "text-on-surface-variant"
							}`}
						>
							<LogIn className="w-3.5 h-3.5" />
							Sign In
						</button>
					</div>

					<form onSubmit={handleAuth} className="space-y-3">
						{mode === "signup" && (
							<input
								type="text"
								placeholder="Full Name"
								value={name}
								onChange={(e) => setName(e.target.value)}
								className="w-full px-3 py-2.5 rounded-lg border border-border bg-card text-on-surface text-sm placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/30"
								required
							/>
						)}

						<input
							type="email"
							placeholder="Email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							className="w-full px-3 py-2.5 rounded-lg border border-border bg-card text-on-surface text-sm placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/30"
							required
						/>

						<input
							type="password"
							placeholder="Password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							className="w-full px-3 py-2.5 rounded-lg border border-border bg-card text-on-surface text-sm placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/30"
							minLength={6}
							required
						/>

						{authError && (
							<p className="text-sm text-red-600 dark:text-red-400">
								{authError}
							</p>
						)}

						<button
							type="submit"
							disabled={authLoading2}
							className="w-full signature-gradient text-white font-headline font-bold text-xs uppercase tracking-widest py-3 rounded-lg shadow flex items-center justify-center gap-2 disabled:opacity-50"
						>
							{authLoading2 ? (
								<Loader2 className="w-4 h-4 animate-spin" />
							) : mode === "signup" ? (
								<>
									<UserPlus className="w-4 h-4" />
									Create Account & Join
								</>
							) : (
								<>
									<LogIn className="w-4 h-4" />
									Sign In & Join
								</>
							)}
						</button>
					</form>
				</div>
			</div>
		</div>
	);
}
