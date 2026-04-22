"use client";

import { Property, PropertySettings } from "@/types/property";
import {
	BookOpen,
	Check,
	DollarSign,
	History,
	Loader2,
	MapPin,
	Phone,
	Settings,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface SettingRow {
	key: keyof PropertySettings;
	icon: React.ComponentType<{ className?: string }>;
	label: string;
	description: string;
	defaultValue: boolean;
}

const SETTINGS_ROWS: SettingRow[] = [
	{
		key: "showOwnershipHistory",
		icon: History,
		label: "Show ownership history",
		description: "Visitors can see the full chain-of-title timeline",
		defaultValue: false,
	},
	{
		key: "showPricing",
		icon: DollarSign,
		label: "Show pricing publicly",
		description: "Purchase price and current value are visible to visitors",
		defaultValue: true,
	},
	{
		key: "showContactInfo",
		icon: Phone,
		label: "Show contact info",
		description: "Your email and phone are visible on the public listing",
		defaultValue: true,
	},
	{
		key: "allowBookings",
		icon: BookOpen,
		label: "Allow booking requests",
		description: "Visitors can request a viewing or appointment",
		defaultValue: false,
	},
	{
		key: "showLocation",
		icon: MapPin,
		label: "Show exact location",
		description: "Map coordinates and address are visible to visitors",
		defaultValue: true,
	},
];

function SettingToggle({
	value,
	onChange,
	saving,
}: {
	value: boolean;
	onChange: (v: boolean) => void;
	saving: boolean;
}) {
	return (
		<button
			type="button"
			onClick={() => onChange(!value)}
			disabled={saving}
			className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none disabled:opacity-50 ${
				value ? "bg-blue-600" : "bg-surface-container-high"
			}`}
			aria-pressed={value}
		>
			<span
				className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
					value ? "translate-x-4" : "translate-x-0.5"
				}`}
			/>
		</button>
	);
}

export default function PropertySettingsPanel({
	property,
	onSettingsChanged,
}: {
	property: Property;
	onSettingsChanged?: (settings: PropertySettings) => void;
}) {
	const [settings, setSettings] = useState<PropertySettings>(
		property.settings ?? {},
	);
	const [savingKey, setSavingKey] = useState<keyof PropertySettings | null>(
		null,
	);
	const [savedKey, setSavedKey] = useState<keyof PropertySettings | null>(null);
	const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Sync if property prop changes
	useEffect(() => {
		setSettings(property.settings ?? {});
	}, [property.settings]);

	const getValue = useCallback(
		(row: SettingRow): boolean => {
			return settings[row.key] ?? row.defaultValue;
		},
		[settings],
	);

	const handleToggle = useCallback(
		async (row: SettingRow, newValue: boolean) => {
			const updated = { ...settings, [row.key]: newValue };
			setSettings(updated);
			setSavingKey(row.key);

			try {
				const res = await fetch(`/api/properties/${property.id}`, {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ settings: updated }),
				});

				if (res.ok) {
					onSettingsChanged?.(updated);
					setSavedKey(row.key);
					if (savedTimer.current) clearTimeout(savedTimer.current);
					savedTimer.current = setTimeout(() => setSavedKey(null), 1500);
				} else {
					// Revert on failure
					setSettings(settings);
				}
			} catch {
				setSettings(settings);
			} finally {
				setSavingKey(null);
			}
		},
		[property.id, settings, onSettingsChanged],
	);

	return (
		<div className="space-y-1 max-w-lg">
			<p className="text-xs text-outline mb-3">
				Control what visitors see on your public property listing.
			</p>

			{SETTINGS_ROWS.map((row) => {
				const Icon = row.icon;
				const value = getValue(row);
				const isSaving = savingKey === row.key;
				const isSaved = savedKey === row.key;

				return (
					<div
						key={row.key}
						className="flex items-center justify-between gap-4 py-3 border-b border-border last:border-0"
					>
						<div className="flex items-start gap-3 min-w-0">
							<div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-surface-container-high">
								<Icon className="w-3.5 h-3.5 text-on-surface-variant" />
							</div>
							<div className="min-w-0">
								<p className="text-sm font-medium text-on-surface leading-tight">
									{row.label}
								</p>
								<p className="text-xs text-outline mt-0.5">{row.description}</p>
							</div>
						</div>

						<div className="flex items-center gap-2 shrink-0">
							{isSaving && (
								<Loader2 className="w-3.5 h-3.5 text-outline animate-spin" />
							)}
							{isSaved && !isSaving && (
								<Check className="w-3.5 h-3.5 text-emerald-500" />
							)}
							<SettingToggle
								value={value}
								onChange={(v) => handleToggle(row, v)}
								saving={isSaving}
							/>
						</div>
					</div>
				);
			})}
		</div>
	);
}

export function PropertySettingsSectionHeader() {
	return (
		<span className="flex items-center gap-2">
			<Settings className="w-4 h-4" />
			Property Settings
		</span>
	);
}
