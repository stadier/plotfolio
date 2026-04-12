"use client";

import { useRequireAuth } from "@/components/AuthContext";
import { usePortfolio } from "@/components/PortfolioContext";
import AppShell from "@/components/layout/AppShell";
import BackButton from "@/components/ui/BackButton";
import { PortfolioAPI } from "@/lib/api";
import { Briefcase, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewPortfolioPage() {
	const { loading: authLoading } = useRequireAuth();
	const { refresh } = usePortfolio();
	const router = useRouter();

	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!name.trim()) {
			setError("Portfolio name is required");
			return;
		}

		setSaving(true);
		setError(null);

		const result = await PortfolioAPI.create({
			name: name.trim(),
			description: description.trim() || undefined,
		});

		if (!result) {
			setError("Failed to create portfolio. Please try again.");
			setSaving(false);
			return;
		}

		await refresh();
		router.push("/portfolio");
	}

	if (authLoading) {
		return (
			<AppShell>
				<div className="flex items-center justify-center h-[60vh]">
					<Loader2 className="w-6 h-6 animate-spin text-primary" />
				</div>
			</AppShell>
		);
	}

	return (
		<AppShell>
			{/* Header */}
			<div className="bg-background border-b border-border px-8 py-4 sticky top-0 z-10">
				<div className="flex items-center gap-3">
					<BackButton fallbackHref="/portfolio" label="Dashboard" />
					<span className="text-outline">/</span>
					<h1 className="font-headline text-lg font-bold text-on-surface">
						New Portfolio
					</h1>
				</div>
			</div>

			{/* Body */}
			<div className="px-8 pt-8 pb-16">
				<form onSubmit={handleSubmit} className="max-w-lg space-y-6">
					{/* Icon */}
					<div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
						<Briefcase className="w-7 h-7 text-primary" />
					</div>

					<div>
						<h2 className="font-headline text-xl font-bold text-on-surface mb-1">
							Create a new portfolio
						</h2>
						<p className="text-sm text-on-surface-variant">
							Portfolios let you organize properties and collaborate with
							agents, managers, and team members.
						</p>
					</div>

					{/* Name */}
					<div>
						<label
							htmlFor="portfolio-name"
							className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-1.5"
						>
							Portfolio Name
						</label>
						<input
							id="portfolio-name"
							type="text"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder='e.g. "Emekoba Realty" or "Lagos Properties"'
							maxLength={80}
							className="w-full px-4 py-3 rounded-lg border border-border bg-card text-on-surface placeholder:text-outline text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
							autoFocus
						/>
					</div>

					{/* Description */}
					<div>
						<label
							htmlFor="portfolio-desc"
							className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-1.5"
						>
							Description{" "}
							<span className="text-outline font-normal normal-case tracking-normal">
								(optional)
							</span>
						</label>
						<textarea
							id="portfolio-desc"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="A short description of what this portfolio is for"
							rows={3}
							maxLength={300}
							className="w-full px-4 py-3 rounded-lg border border-border bg-card text-on-surface placeholder:text-outline text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow resize-none"
						/>
					</div>

					{/* Error */}
					{error && (
						<p className="text-sm text-red-600 dark:text-red-400">{error}</p>
					)}

					{/* Submit */}
					<div className="flex items-center gap-3 pt-2">
						<button
							type="submit"
							disabled={saving || !name.trim()}
							className="signature-gradient text-white font-headline font-bold text-xs uppercase tracking-widest px-6 py-3 rounded-lg shadow active:scale-95 transition-all flex items-center gap-2 btn-press disabled:opacity-50 disabled:pointer-events-none"
						>
							{saving && <Loader2 className="w-4 h-4 animate-spin" />}
							Create Portfolio
						</button>
						<Link
							href="/portfolio"
							className="text-sm text-on-surface-variant hover:text-primary transition-colors"
						>
							Cancel
						</Link>
					</div>
				</form>
			</div>
		</AppShell>
	);
}
