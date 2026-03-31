"use client";

import AppShell from "@/components/layout/AppShell";
import { type Theme, useTheme } from "@/components/ThemeProvider";
import { Monitor, Moon, Sun } from "lucide-react";

const THEME_OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
	{ value: "light", label: "Light", icon: Sun },
	{ value: "dark", label: "Dark", icon: Moon },
	{ value: "system", label: "System", icon: Monitor },
];

export default function SettingsPage() {
	const { theme, setTheme } = useTheme();

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
				<section className="bg-card rounded-2xl border border-outline-variant p-6">
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
			</div>
		</AppShell>
	);
}
