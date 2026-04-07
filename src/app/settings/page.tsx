"use client";

import AppShell from "@/components/layout/AppShell";
import { type Theme, useTheme } from "@/components/ThemeProvider";
import { queryKeys, useProviderSettings } from "@/hooks/usePropertyQueries";
import {
	PROVIDER_CATEGORIES,
	PROVIDER_DEFAULTS,
	ProviderSettings,
} from "@/types/providers";
import { useQueryClient } from "@tanstack/react-query";
import {
	Check,
	ChevronDown,
	ChevronUp,
	Loader2,
	Monitor,
	Moon,
	Sun,
} from "lucide-react";
import { useState } from "react";

const THEME_OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
	{ value: "light", label: "Light", icon: Sun },
	{ value: "dark", label: "Dark", icon: Moon },
	{ value: "system", label: "System", icon: Monitor },
];

export default function SettingsPage() {
	const { theme, setTheme } = useTheme();
	const [advancedOpen, setAdvancedOpen] = useState(false);
	const queryClient = useQueryClient();
	const { data: fetchedProviders, isLoading: loadingProviders } =
		useProviderSettings();
	const [localProviders, setLocalProviders] = useState<ProviderSettings | null>(
		null,
	);
	const providers = localProviders ?? fetchedProviders ?? PROVIDER_DEFAULTS;
	const [savingKey, setSavingKey] = useState<string | null>(null);
	const [savedKey, setSavedKey] = useState<string | null>(null);

	const updateProvider = async (key: keyof ProviderSettings, value: string) => {
		const prev = providers;
		const next = { ...providers, [key]: value };
		setLocalProviders(next);
		setSavingKey(key);
		setSavedKey(null);

		// Optimistically update the query cache so other pages see the change immediately
		queryClient.setQueryData(queryKeys.settings.providers, next);

		try {
			const res = await fetch("/api/settings/providers", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ providerSettings: next }),
			});
			if (!res.ok) throw new Error("Save failed");
			const data = await res.json();
			// Update cache with the server's merged response
			queryClient.setQueryData(
				queryKeys.settings.providers,
				data.providerSettings,
			);
			setSavedKey(key);
			setTimeout(() => setSavedKey(null), 2000);
		} catch {
			// revert on failure
			setLocalProviders(prev);
			queryClient.setQueryData(queryKeys.settings.providers, prev);
		} finally {
			setSavingKey(null);
		}
	};

	return (
		<AppShell>
			<div className="px-8 py-8 max-w-2xl">
				<h1 className="font-headline text-2xl font-bold text-on-surface mb-1">
					Settings
				</h1>
				<p className="text-sm text-on-surface-variant mb-8">
					Manage your preferences.
				</p>

				{/* Appearance section */}
				<section className="bg-card rounded-2xl border border-outline-variant p-6 mb-6">
					<h2 className="font-headline text-base font-bold text-on-surface mb-1">
						Appearance
					</h2>
					<p className="text-xs text-on-surface-variant mb-5">
						Choose how Plotfolio looks to you.
					</p>

					<div className="flex gap-3">
						{THEME_OPTIONS.map(({ value, label, icon: Icon }) => {
							const active = theme === value;
							return (
								<button
									key={value}
									onClick={() => setTheme(value)}
									className={`flex flex-col items-center gap-2 px-6 py-4 rounded-xl border-2 transition-all cursor-pointer ${
										active
											? "border-primary bg-primary/10 dark:bg-primary/20"
											: "border-outline-variant hover:border-outline bg-surface-container-lowest dark:bg-surface-container"
									}`}
								>
									<Icon
										className={`w-5 h-5 ${active ? "text-primary" : "text-on-surface-variant"}`}
									/>
									<span
										className={`text-xs font-bold uppercase tracking-widest ${active ? "text-primary" : "text-on-surface-variant"}`}
									>
										{label}
									</span>
								</button>
							);
						})}
					</div>
				</section>

				{/* Advanced — Service Providers */}
				<section className="bg-card rounded-2xl border border-outline-variant">
					<button
						onClick={() => setAdvancedOpen((o) => !o)}
						className="flex items-center justify-between w-full p-6 cursor-pointer"
					>
						<div className="text-left">
							<h2 className="font-headline text-base font-bold text-on-surface mb-0.5">
								Advanced
							</h2>
							<p className="text-xs text-on-surface-variant">
								Configure the service providers Plotfolio uses under the hood.
							</p>
						</div>
						{advancedOpen ? (
							<ChevronUp className="w-5 h-5 text-on-surface-variant shrink-0" />
						) : (
							<ChevronDown className="w-5 h-5 text-on-surface-variant shrink-0" />
						)}
					</button>

					{advancedOpen && (
						<div className="px-6 pb-6 space-y-6 border-t border-outline-variant pt-5">
							{loadingProviders ? (
								<div className="flex items-center gap-2 text-sm text-on-surface-variant py-4">
									<Loader2 className="w-4 h-4 animate-spin" />
									Loading provider settings…
								</div>
							) : (
								PROVIDER_CATEGORIES.map((category) => {
									const currentValue =
										providers[category.key] ?? PROVIDER_DEFAULTS[category.key];

									return (
										<div key={category.key}>
											<div className="flex items-center gap-2 mb-1">
												<h3 className="text-sm font-semibold text-on-surface">
													{category.label}
												</h3>
												{savingKey === category.key && (
													<Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
												)}
												{savedKey === category.key && (
													<Check className="w-3.5 h-3.5 text-secondary" />
												)}
											</div>
											<p className="text-xs text-on-surface-variant mb-3">
												{category.description}
											</p>

											<div className="space-y-2">
												{category.options.map((opt) => {
													const selected = currentValue === opt.value;
													return (
														<button
															key={opt.value}
															onClick={() =>
																updateProvider(category.key, opt.value)
															}
															className={`flex items-start gap-3 w-full max-w-lg text-left px-4 py-3 rounded-xl border-2 transition-all cursor-pointer ${
																selected
																	? "border-primary bg-primary/5"
																	: "border-outline-variant hover:border-outline bg-surface-container-lowest"
															}`}
														>
															<div
																className={`mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
																	selected
																		? "border-primary bg-primary"
																		: "border-outline"
																}`}
															>
																{selected && (
																	<div className="w-1.5 h-1.5 rounded-full bg-card" />
																)}
															</div>
															<div className="min-w-0">
																<div className="flex items-center gap-2">
																	<span
																		className={`text-sm font-medium ${selected ? "text-primary" : "text-on-surface"}`}
																	>
																		{opt.label}
																	</span>
																	{opt.free && (
																		<span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-secondary/15 text-secondary">
																			Free
																		</span>
																	)}
																</div>
																<p className="text-xs text-on-surface-variant mt-0.5 leading-relaxed">
																	{opt.description}
																</p>
															</div>
														</button>
													);
												})}
											</div>
										</div>
									);
								})
							)}
						</div>
					)}
				</section>
			</div>
		</AppShell>
	);
}
