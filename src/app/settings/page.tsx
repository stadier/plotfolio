"use client";

import { useAuth } from "@/components/AuthContext";
import LetterheadEditor from "@/components/branding/LetterheadEditor";
import SealCreator, { SealPreview } from "@/components/branding/SealCreator";
import AppShell from "@/components/layout/AppShell";
import { useSubscription } from "@/components/SubscriptionContext";
import { type Theme, useTheme } from "@/components/ThemeProvider";
import { queryKeys, useProviderSettings } from "@/hooks/usePropertyQueries";
import {
	PROVIDER_CATEGORIES,
	PROVIDER_DEFAULTS,
	ProviderSettings,
} from "@/types/providers";
import { LetterheadConfig, SealConfig, WatermarkType } from "@/types/seal";
import { useQueryClient } from "@tanstack/react-query";
import {
	AlertTriangle,
	Camera,
	Check,
	CreditCard,
	Eye,
	EyeOff,
	Globe,
	Loader2,
	Monitor,
	Moon,
	Palette,
	Server,
	Shield,
	Stamp,
	Sun,
	Trash2,
	User,
} from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";

/* ─── Constants ───────────────────────────────────────────────── */

type Tab =
	| "profile"
	| "appearance"
	| "branding"
	| "billing"
	| "privacy"
	| "advanced"
	| "danger";

const TABS: { key: Tab; label: string; icon: typeof User }[] = [
	{ key: "profile", label: "Profile", icon: User },
	{ key: "appearance", label: "Appearance", icon: Palette },
	{ key: "branding", label: "Branding", icon: Stamp },
	{ key: "billing", label: "Billing", icon: CreditCard },
	{ key: "privacy", label: "Security", icon: Shield },
	{ key: "advanced", label: "Advanced", icon: Server },
	{ key: "danger", label: "Danger zone", icon: AlertTriangle },
];

const THEME_OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
	{ value: "light", label: "Light", icon: Sun },
	{ value: "dark", label: "Dark", icon: Moon },
	{ value: "system", label: "System", icon: Monitor },
];

const ACCOUNT_TYPES = [
	{ value: "individual", label: "Individual" },
	{ value: "company", label: "Company" },
	{ value: "trust", label: "Trust" },
] as const;

const MEASUREMENT_UNITS = [
	{ value: "metric", label: "Metric (m², km)" },
	{ value: "imperial", label: "Imperial (ft², mi)" },
] as const;

const CURRENCY_OPTIONS = [
	{ value: "USD", label: "USD — US Dollar" },
	{ value: "EUR", label: "EUR — Euro" },
	{ value: "GBP", label: "GBP — British Pound" },
	{ value: "NGN", label: "NGN — Nigerian Naira" },
	{ value: "ZAR", label: "ZAR — South African Rand" },
	{ value: "INR", label: "INR — Indian Rupee" },
	{ value: "AUD", label: "AUD — Australian Dollar" },
	{ value: "CAD", label: "CAD — Canadian Dollar" },
	{ value: "JPY", label: "JPY — Japanese Yen" },
	{ value: "BRL", label: "BRL — Brazilian Real" },
] as const;

/* ─── Input helper ────────────────────────────────────────────── */

function SettingsInput({
	label,
	value,
	onChange,
	type = "text",
	placeholder,
	disabled,
	note,
}: {
	label: string;
	value: string;
	onChange: (v: string) => void;
	type?: string;
	placeholder?: string;
	disabled?: boolean;
	note?: string;
}) {
	return (
		<label className="block">
			<span className="typo-body-sm font-medium text-on-surface-variant mb-1.5 block">
				{label}
			</span>
			<input
				type={type}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder={placeholder}
				disabled={disabled}
				className="w-full typo-body bg-input border border-outline-variant sz-radius-md px-3 py-2 text-on-surface placeholder:text-outline focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
			/>
			{note && (
				<span className="typo-caption text-outline mt-1 block">{note}</span>
			)}
		</label>
	);
}

function SettingsSelect({
	label,
	value,
	onChange,
	options,
	note,
}: {
	label: string;
	value: string;
	onChange: (v: string) => void;
	options: readonly { value: string; label: string }[];
	note?: string;
}) {
	return (
		<label className="block">
			<span className="typo-body-sm font-medium text-on-surface-variant mb-1.5 block">
				{label}
			</span>
			<select
				value={value}
				onChange={(e) => onChange(e.target.value)}
				className="w-full typo-body bg-input border border-outline-variant sz-radius-md px-3 py-2 text-on-surface focus:outline-none focus:border-primary transition-colors appearance-none cursor-pointer"
			>
				{options.map((o) => (
					<option key={o.value} value={o.value}>
						{o.label}
					</option>
				))}
			</select>
			{note && (
				<span className="typo-caption text-outline mt-1 block">{note}</span>
			)}
		</label>
	);
}

function SettingsToggle({
	label,
	description,
	checked,
	onChange,
}: {
	label: string;
	description?: string;
	checked: boolean;
	onChange: (v: boolean) => void;
}) {
	return (
		<div className="flex items-start justify-between gap-4">
			<div>
				<span className="typo-body font-medium text-on-surface">{label}</span>
				{description && (
					<p className="typo-caption text-on-surface-variant mt-0.5">
						{description}
					</p>
				)}
			</div>
			<button
				type="button"
				role="switch"
				aria-checked={checked}
				onClick={() => onChange(!checked)}
				className={`relative shrink-0 w-10 h-[22px] rounded-full transition-colors cursor-pointer ${
					checked ? "bg-primary" : "bg-outline-variant"
				}`}
			>
				<span
					className={`absolute top-[3px] left-[3px] w-4 h-4 rounded-full bg-card transition-transform ${
						checked ? "translate-x-[18px]" : ""
					}`}
				/>
			</button>
		</div>
	);
}

/* ─── Section wrapper ─────────────────────────────────────────── */

function Section({
	title,
	description,
	children,
	className,
}: {
	title: string;
	description?: string;
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<section
			className={`bg-card sz-card border border-outline-variant ${className ?? ""}`}
		>
			<h2 className="font-headline typo-section-title font-bold text-on-surface mb-1">
				{title}
			</h2>
			{description && (
				<p className="typo-body-sm text-on-surface-variant mb-5">
					{description}
				</p>
			)}
			{children}
		</section>
	);
}

/* ─── Profile tab ─────────────────────────────────────────────── */

function ProfileSection() {
	const { user, refresh } = useAuth();
	const [name, setName] = useState(user?.name ?? "");
	const [displayName, setDisplayName] = useState(user?.displayName ?? "");
	const [username, setUsername] = useState(user?.username ?? "");
	const [phone, setPhone] = useState(user?.phone ?? "");
	const [accountType, setAccountType] = useState(user?.type ?? "individual");
	const [saving, setSaving] = useState(false);
	const [saved, setSaved] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [avatarUploading, setAvatarUploading] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleAvatarChange = async (file: File) => {
		setAvatarUploading(true);
		setError(null);
		try {
			const fd = new FormData();
			fd.append("file", file);
			const res = await fetch("/api/settings/avatar", {
				method: "PUT",
				body: fd,
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Upload failed");
			await refresh();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to upload avatar");
		} finally {
			setAvatarUploading(false);
		}
	};

	useEffect(() => {
		if (user) {
			setName(user.name);
			setDisplayName(user.displayName);
			setUsername(user.username);
			setPhone(user.phone ?? "");
			setAccountType(user.type);
		}
	}, [user]);

	const handleSave = async (e: FormEvent) => {
		e.preventDefault();
		setSaving(true);
		setError(null);
		setSaved(false);

		try {
			const res = await fetch("/api/settings/profile", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name,
					displayName,
					username,
					phone: phone || undefined,
					type: accountType,
				}),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Save failed");
			await refresh();
			setSaved(true);
			setTimeout(() => setSaved(false), 3000);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to save");
		} finally {
			setSaving(false);
		}
	};

	return (
		<>
			<Section title="Profile" description="Your public identity on Plotfolio.">
				{/* Avatar upload */}
				<div className="flex items-center gap-4 mb-6">
					<div className="relative group">
						{user?.avatar ? (
							<img
								src={user.avatar}
								alt={user.displayName}
								className="w-16 h-16 rounded-full object-cover"
							/>
						) : (
							<div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center">
								<span className="text-xl font-bold text-primary">
									{user?.displayName?.charAt(0)?.toUpperCase() ?? "?"}
								</span>
							</div>
						)}
						<button
							type="button"
							onClick={() => fileInputRef.current?.click()}
							disabled={avatarUploading}
							className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
						>
							{avatarUploading ? (
								<Loader2 className="w-5 h-5 text-white animate-spin" />
							) : (
								<Camera className="w-5 h-5 text-white" />
							)}
						</button>
						<input
							ref={fileInputRef}
							type="file"
							accept="image/jpeg,image/png,image/webp"
							className="hidden"
							onChange={(e) => {
								const f = e.target.files?.[0];
								if (f) handleAvatarChange(f);
								e.target.value = "";
							}}
						/>
					</div>
					<div>
						<p className="typo-body font-medium text-on-surface">
							Profile picture
						</p>
						<p className="typo-caption text-on-surface-variant">
							JPEG, PNG, or WebP. Max 5 MB.
						</p>
					</div>
				</div>

				<form
					onSubmit={handleSave}
					className="grid grid-cols-1 sm:grid-cols-2 gap-4"
				>
					<SettingsInput
						label="Full name"
						value={name}
						onChange={setName}
						placeholder="Your full name"
					/>
					<SettingsInput
						label="Display name"
						value={displayName}
						onChange={setDisplayName}
						placeholder="How you appear to others"
					/>
					<SettingsInput
						label="Username"
						value={username}
						onChange={setUsername}
						placeholder="your-username"
						note="Letters, numbers, underscores, dots, and hyphens. 3–30 characters."
					/>
					<SettingsInput
						label="Email"
						value={user?.email ?? ""}
						onChange={() => {}}
						disabled
						note="Email cannot be changed at this time."
					/>
					<SettingsInput
						label="Phone"
						value={phone}
						onChange={setPhone}
						type="tel"
						placeholder="+1 234 567 8900"
						note="International format accepted."
					/>
					<SettingsSelect
						label="Account type"
						value={accountType}
						onChange={(v) =>
							setAccountType(v as "individual" | "company" | "trust")
						}
						options={ACCOUNT_TYPES}
					/>

					{error && (
						<p className="typo-body-sm text-error font-medium sm:col-span-2">
							{error}
						</p>
					)}

					<div className="flex items-center gap-3 pt-2 sm:col-span-2">
						<button
							type="submit"
							disabled={saving}
							className="sz-btn bg-primary text-on-primary typo-btn font-bold uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
						>
							{saving ? (
								<Loader2 className="w-4 h-4 animate-spin mx-auto" />
							) : (
								"Save changes"
							)}
						</button>
						{saved && (
							<span className="flex items-center gap-1 typo-body-sm text-secondary font-medium">
								<Check className="w-3.5 h-3.5" /> Saved
							</span>
						)}
					</div>
				</form>
			</Section>

			<Section
				title="Preferences"
				description="Regional and display preferences."
			>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<SettingsSelect
						label="Default currency"
						value={
							typeof window !== "undefined"
								? (localStorage.getItem("plotfolio-currency") ?? "USD")
								: "USD"
						}
						onChange={(v) => {
							localStorage.setItem("plotfolio-currency", v);
						}}
						options={CURRENCY_OPTIONS}
						note="Used for displaying property values."
					/>
					<SettingsSelect
						label="Measurement units"
						value={
							typeof window !== "undefined"
								? (localStorage.getItem("plotfolio-units") ?? "metric")
								: "metric"
						}
						onChange={(v) => {
							localStorage.setItem("plotfolio-units", v);
						}}
						options={MEASUREMENT_UNITS}
					/>
					<div className="sm:col-span-2">
						<SettingsToggle
							label="Allow bookings"
							description="Let marketplace users request visits to your listed properties."
							checked={user?.allowBookings ?? false}
							onChange={async (v) => {
								// Quick save — no form needed
								await fetch("/api/settings/profile", {
									method: "PUT",
									headers: { "Content-Type": "application/json" },
									body: JSON.stringify({ allowBookings: v }),
								});
							}}
						/>
					</div>
				</div>
			</Section>
		</>
	);
}

/* ─── Appearance tab ──────────────────────────────────────────── */

function AppearanceSection() {
	const { theme, setTheme } = useTheme();

	return (
		<Section
			title="Appearance"
			description="Choose how Plotfolio looks to you."
		>
			<div className="flex gap-3 flex-wrap">
				{THEME_OPTIONS.map(({ value, label, icon: Icon }) => {
					const active = theme === value;
					return (
						<button
							key={value}
							onClick={() => setTheme(value)}
							className={`flex flex-col items-center sz-gap sz-btn-lg sz-radius-lg border-2 transition-all cursor-pointer ${
								active
									? "border-primary bg-primary/10"
									: "border-outline-variant hover:border-outline bg-surface-container-lowest"
							}`}
						>
							<Icon
								className={`w-5 h-5 ${active ? "text-primary" : "text-on-surface-variant"}`}
							/>
							<span
								className={`typo-btn font-bold uppercase tracking-widest ${active ? "text-primary" : "text-on-surface-variant"}`}
							>
								{label}
							</span>
						</button>
					);
				})}
			</div>

			<div className="mt-6 space-y-4">
				<SettingsToggle
					label="Compact sidebar"
					description="Show collapsed sidebar by default."
					checked={
						typeof window !== "undefined"
							? localStorage.getItem("sidebar-collapsed") === "true"
							: false
					}
					onChange={(v) => {
						localStorage.setItem("sidebar-collapsed", String(v));
						window.location.reload();
					}}
				/>
			</div>
		</Section>
	);
}

/* ─── Security tab ────────────────────────────────────────────── */

function SecuritySection() {
	const { user, logout } = useAuth();
	const [loggingOut, setLoggingOut] = useState(false);
	const [currentPw, setCurrentPw] = useState("");
	const [newPw, setNewPw] = useState("");
	const [confirmPw, setConfirmPw] = useState("");
	const [showCurrent, setShowCurrent] = useState(false);
	const [showNew, setShowNew] = useState(false);
	const [saving, setSaving] = useState(false);
	const [saved, setSaved] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleChangePassword = async (e: FormEvent) => {
		e.preventDefault();
		setError(null);
		setSaved(false);

		if (newPw !== confirmPw) {
			setError("New passwords do not match.");
			return;
		}
		if (newPw.length < 8) {
			setError("Password must be at least 8 characters.");
			return;
		}

		setSaving(true);
		try {
			const res = await fetch("/api/settings/password", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					currentPassword: currentPw,
					newPassword: newPw,
				}),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Failed");
			setCurrentPw("");
			setNewPw("");
			setConfirmPw("");
			setSaved(true);
			setTimeout(() => setSaved(false), 3000);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to change password",
			);
		} finally {
			setSaving(false);
		}
	};

	return (
		<>
			<Section
				title="Change password"
				description="Update the password for your account."
			>
				<form
					onSubmit={handleChangePassword}
					className="grid grid-cols-1 sm:grid-cols-2 gap-4"
				>
					<div className="relative">
						<SettingsInput
							label="Current password"
							value={currentPw}
							onChange={setCurrentPw}
							type={showCurrent ? "text" : "password"}
						/>
						<button
							type="button"
							onClick={() => setShowCurrent((s) => !s)}
							className="absolute right-2 top-[30px] text-outline hover:text-on-surface-variant cursor-pointer"
						>
							{showCurrent ? (
								<EyeOff className="w-4 h-4" />
							) : (
								<Eye className="w-4 h-4" />
							)}
						</button>
					</div>
					<div className="relative">
						<SettingsInput
							label="New password"
							value={newPw}
							onChange={setNewPw}
							type={showNew ? "text" : "password"}
							note="Minimum 8 characters."
						/>
						<button
							type="button"
							onClick={() => setShowNew((s) => !s)}
							className="absolute right-2 top-[30px] text-outline hover:text-on-surface-variant cursor-pointer"
						>
							{showNew ? (
								<EyeOff className="w-4 h-4" />
							) : (
								<Eye className="w-4 h-4" />
							)}
						</button>
					</div>
					<SettingsInput
						label="Confirm new password"
						value={confirmPw}
						onChange={setConfirmPw}
						type="password"
					/>

					{error && (
						<p className="typo-body-sm text-error font-medium sm:col-span-2">
							{error}
						</p>
					)}

					<div className="flex items-center gap-3 pt-2 sm:col-span-2">
						<button
							type="submit"
							disabled={saving}
							className="sz-btn bg-primary text-on-primary typo-btn font-bold uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
						>
							{saving ? (
								<Loader2 className="w-4 h-4 animate-spin mx-auto" />
							) : (
								"Update password"
							)}
						</button>
						{saved && (
							<span className="flex items-center gap-1 typo-body-sm text-secondary font-medium">
								<Check className="w-3.5 h-3.5" /> Password updated
							</span>
						)}
					</div>
				</form>
			</Section>

			<Section title="Sessions" description="Manage where you're signed in.">
				<div className="flex items-center gap-3">
					<Globe className="w-5 h-5 text-on-surface-variant shrink-0" />
					<div className="min-w-0">
						<p className="typo-body text-on-surface font-medium">
							Current session
						</p>
						<p className="typo-caption text-on-surface-variant">
							Logged in as {user?.email}
						</p>
					</div>
					<span className="ml-auto typo-badge font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-secondary/15 text-secondary">
						Active
					</span>
				</div>
				<div className="mt-4 pt-4 border-t border-outline-variant">
					<button
						type="button"
						onClick={async () => {
							setLoggingOut(true);
							await logout();
						}}
						disabled={loggingOut}
						className="sz-btn bg-error/10 text-error typo-btn font-bold uppercase tracking-widest hover:bg-error/20 transition-colors disabled:opacity-50 cursor-pointer"
					>
						{loggingOut ? (
							<Loader2 className="w-4 h-4 animate-spin mx-auto" />
						) : (
							"Log out"
						)}
					</button>
				</div>
			</Section>
		</>
	);
}

/* ─── Advanced / Providers tab ────────────────────────────────── */

function AdvancedSection() {
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
		queryClient.setQueryData(queryKeys.settings.providers, next);

		try {
			const res = await fetch("/api/settings/providers", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ providerSettings: next }),
			});
			if (!res.ok) throw new Error("Save failed");
			const data = await res.json();
			queryClient.setQueryData(
				queryKeys.settings.providers,
				data.providerSettings,
			);
			setSavedKey(key);
			setTimeout(() => setSavedKey(null), 2000);
		} catch {
			setLocalProviders(prev);
			queryClient.setQueryData(queryKeys.settings.providers, prev);
		} finally {
			setSavingKey(null);
		}
	};

	return (
		<Section
			title="Service providers"
			description="Configure the service providers Plotfolio uses under the hood."
			className="md:col-span-2 xl:col-span-3"
		>
			{loadingProviders ? (
				<div className="flex items-center gap-2 typo-body-sm text-on-surface-variant py-4">
					<Loader2 className="w-4 h-4 animate-spin" />
					Loading provider settings…
				</div>
			) : (
				<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
					{PROVIDER_CATEGORIES.map((category) => {
						const currentValue =
							providers[category.key] ?? PROVIDER_DEFAULTS[category.key];
						return (
							<div key={category.key}>
								<div className="flex items-center gap-2 mb-1">
									<h3 className="typo-body font-semibold text-on-surface">
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
												onClick={() => updateProvider(category.key, opt.value)}
												className={`flex items-start gap-3 w-full text-left px-4 py-3 rounded-xl border-2 transition-all cursor-pointer ${
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
															<span className="typo-badge font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-secondary/15 text-secondary">
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
					})}
				</div>
			)}
		</Section>
	);
}

/* ─── Branding / Seal tab ─────────────────────────────────────── */

interface SealData {
	id: string;
	name: string;
	config: SealConfig;
	imageUrl?: string;
	isDefault: boolean;
}

function BrandingSection() {
	const [seals, setSeals] = useState<SealData[]>([]);
	const [loading, setLoading] = useState(true);
	const [showCreator, setShowCreator] = useState(false);
	const [saving, setSaving] = useState(false);
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const [sealError, setSealError] = useState<string | null>(null);
	const [watermarkPosition, setWatermarkPosition] =
		useState<string>("bottom-right");
	const [watermarkOpacity, setWatermarkOpacity] = useState(0.15);
	const [watermarkBrand, setWatermarkBrand] = useState(true);
	const [letterhead, setLetterhead] = useState<LetterheadConfig | null>(null);
	const [letterheadLoading, setLetterheadLoading] = useState(true);

	useEffect(() => {
		fetchSeals();
		fetchLetterhead();
	}, []);

	const fetchSeals = async () => {
		try {
			const res = await fetch("/api/settings/seal");
			if (res.ok) {
				const data = await res.json();
				setSeals(data.seals ?? []);
				if (data.defaultWatermark) {
					setWatermarkPosition(
						data.defaultWatermark.position ?? "bottom-right",
					);
					setWatermarkOpacity(data.defaultWatermark.opacity ?? 0.15);
					setWatermarkBrand(data.defaultWatermark.includePlatformBrand ?? true);
				}
			}
		} catch {
			// ignore
		} finally {
			setLoading(false);
		}
	};

	const fetchLetterhead = async () => {
		try {
			const res = await fetch("/api/settings/letterhead");
			if (res.ok) {
				const data = await res.json();
				setLetterhead(data.letterhead ?? null);
			}
		} catch {
			// ignore
		} finally {
			setLetterheadLoading(false);
		}
	};

	const handleSaveSeal = async (
		config: SealConfig,
		name: string,
		imageDataUrl: string,
	) => {
		setSaving(true);
		setSealError(null);
		try {
			const res = await fetch("/api/settings/seal", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name, config, imageUrl: imageDataUrl }),
			});
			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || "Save failed");
			}
			await fetchSeals();
			setShowCreator(false);
		} catch (err) {
			const msg = err instanceof Error ? err.message : "Failed to save seal";
			setSealError(msg);
			console.error("Seal save error:", err);
		} finally {
			setSaving(false);
		}
	};

	const handleDeleteSeal = async (sealId: string) => {
		setDeletingId(sealId);
		try {
			await fetch(`/api/settings/seal?id=${encodeURIComponent(sealId)}`, {
				method: "DELETE",
			});
			await fetchSeals();
		} finally {
			setDeletingId(null);
		}
	};

	const handleSetDefault = async (sealId: string) => {
		await fetch("/api/settings/seal", {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ sealId, isDefault: true }),
		});
		await fetchSeals();
	};

	const handleSaveWatermark = async () => {
		await fetch("/api/settings/seal", {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				defaultWatermark: {
					type: seals.find((s) => s.isDefault)
						? WatermarkType.SEAL
						: WatermarkType.PLATFORM,
					sealId: seals.find((s) => s.isDefault)?.id,
					position: watermarkPosition,
					opacity: watermarkOpacity,
					includePlatformBrand: watermarkBrand,
				},
			}),
		});
	};

	return (
		<>
			<Section
				title="Seals"
				description="Create seals to sign and stamp documents. Your default seal will be used for watermarks."
			>
				{loading ? (
					<div className="flex items-center gap-2 typo-body-sm text-on-surface-variant py-4">
						<Loader2 className="w-4 h-4 animate-spin" />
						Loading seals…
					</div>
				) : showCreator ? (
					<>
						{sealError && (
							<div className="mb-3 px-3 py-2 sz-radius-md bg-error/10 border border-error/30 typo-body-sm text-error">
								{sealError}
							</div>
						)}
						<SealCreator
							onSave={handleSaveSeal}
							onCancel={() => {
								setShowCreator(false);
								setSealError(null);
							}}
							saving={saving}
						/>
					</>
				) : (
					<>
						{seals.length === 0 ? (
							<p className="typo-body-sm text-on-surface-variant mb-4">
								No seals created yet. Create one to sign and watermark your
								documents.
							</p>
						) : (
							<div
								className="grid gap-3 mb-4"
								style={{
									gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
								}}
							>
								{seals.map((seal) => (
									<div
										key={seal.id}
										className={`relative bg-surface-container-lowest border-2 sz-radius-lg p-4 flex flex-col items-center gap-2 max-w-xs ${
											seal.isDefault
												? "border-primary"
												: "border-outline-variant"
										}`}
									>
										{seal.imageUrl ? (
											<img
												src={seal.imageUrl}
												alt={seal.name}
												className="w-20 h-20 object-contain"
											/>
										) : (
											<SealPreview config={seal.config} size={80} />
										)}
										<span className="typo-body-sm font-medium text-on-surface text-center">
											{seal.name}
										</span>
										{seal.isDefault && (
											<span className="typo-badge font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/15 text-primary">
												Default
											</span>
										)}
										<div className="flex gap-2 mt-1">
											{!seal.isDefault && (
												<button
													type="button"
													onClick={() => handleSetDefault(seal.id)}
													className="typo-caption text-primary hover:underline cursor-pointer"
												>
													Set default
												</button>
											)}
											<button
												type="button"
												onClick={() => handleDeleteSeal(seal.id)}
												disabled={deletingId === seal.id}
												className="typo-caption text-outline hover:text-error cursor-pointer"
											>
												{deletingId === seal.id ? (
													<Loader2 className="w-3 h-3 animate-spin" />
												) : (
													<Trash2 className="w-3 h-3" />
												)}
											</button>
										</div>
									</div>
								))}
							</div>
						)}
						<button
							type="button"
							onClick={() => setShowCreator(true)}
							className="sz-btn bg-primary text-on-primary typo-btn font-bold uppercase tracking-widest hover:opacity-90 transition-opacity cursor-pointer"
						>
							Create new seal
						</button>
					</>
				)}
			</Section>

			<Section
				title="Watermark preferences"
				description="Configure default watermark applied to exported documents and images. Plotfolio branding helps promote the platform."
			>
				<div className="space-y-4">
					<div>
						<span className="typo-body-sm font-medium text-on-surface-variant mb-1.5 block">
							Position
						</span>
						<div className="flex gap-2 flex-wrap">
							{(
								[
									["bottom-right", "Bottom right"],
									["bottom-left", "Bottom left"],
									["center", "Center"],
									["tiled", "Tiled"],
								] as const
							).map(([val, label]) => (
								<button
									key={val}
									type="button"
									onClick={() => {
										setWatermarkPosition(val);
										handleSaveWatermark();
									}}
									className={`px-3 py-1.5 sz-radius-md typo-body-sm font-medium border-2 transition-all cursor-pointer ${
										watermarkPosition === val
											? "border-primary bg-primary/10 text-primary"
											: "border-outline-variant text-on-surface-variant hover:border-outline"
									}`}
								>
									{label}
								</button>
							))}
						</div>
					</div>

					<label className="block">
						<span className="typo-body-sm font-medium text-on-surface-variant mb-1.5 block">
							Opacity ({Math.round(watermarkOpacity * 100)}%)
						</span>
						<input
							type="range"
							min={0.02}
							max={0.4}
							step={0.01}
							value={watermarkOpacity}
							onChange={(e) => {
								setWatermarkOpacity(Number(e.target.value));
							}}
							onMouseUp={() => handleSaveWatermark()}
							className="w-full max-w-sm"
						/>
					</label>

					<SettingsToggle
						label="Include Plotfolio branding"
						description="Adds a subtle Plotfolio watermark alongside your seal to help promote the platform."
						checked={watermarkBrand}
						onChange={(v) => {
							setWatermarkBrand(v);
							handleSaveWatermark();
						}}
					/>
				</div>
			</Section>

			<Section
				title="Letterhead"
				description="Design branded stationery with your company details, logo, and contact info. Your letterhead is applied to generated contracts."
				className="md:col-span-2 xl:col-span-3"
			>
				{letterheadLoading ? (
					<div className="flex items-center gap-2 typo-body-sm text-on-surface-variant py-4">
						<Loader2 className="w-4 h-4 animate-spin" />
						Loading letterhead…
					</div>
				) : (
					<LetterheadEditor
						initial={letterhead}
						sealImageUrl={seals.find((s) => s.isDefault)?.imageUrl}
						onSaved={(cfg) => setLetterhead(cfg)}
					/>
				)}
			</Section>
		</>
	);
}

/* ─── Danger zone tab ─────────────────────────────────────────── */

function DangerSection() {
	const { logout } = useAuth();
	const [deletePassword, setDeletePassword] = useState("");
	const [confirmText, setConfirmText] = useState("");
	const [deleting, setDeleting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const canDelete =
		confirmText.toLowerCase() === "delete my account" &&
		deletePassword.length > 0;

	const handleDelete = async (e: FormEvent) => {
		e.preventDefault();
		if (!canDelete) return;
		setDeleting(true);
		setError(null);

		try {
			const res = await fetch("/api/settings/account", {
				method: "DELETE",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ password: deletePassword }),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Deletion failed");
			await logout();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to delete account");
		} finally {
			setDeleting(false);
		}
	};

	return (
		<section className="bg-card sz-card border-2 border-error/30 sz-radius-card">
			<div className="flex items-center gap-2 mb-1">
				<AlertTriangle className="w-4 h-4 text-error" />
				<h2 className="font-headline typo-section-title font-bold text-error">
					Delete account
				</h2>
			</div>
			<p className="typo-body-sm text-on-surface-variant mb-5">
				Permanently delete your account and all associated data. This action
				cannot be undone. Portfolios where you are the sole admin will also be
				deleted.
			</p>

			<form onSubmit={handleDelete} className="space-y-4">
				<SettingsInput
					label="Enter your password"
					value={deletePassword}
					onChange={setDeletePassword}
					type="password"
				/>
				<SettingsInput
					label='Type "delete my account" to confirm'
					value={confirmText}
					onChange={setConfirmText}
					placeholder="delete my account"
				/>

				{error && (
					<p className="typo-body-sm text-error font-medium">{error}</p>
				)}

				<button
					type="submit"
					disabled={!canDelete || deleting}
					className="sz-btn bg-error text-on-primary typo-btn font-bold uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
				>
					{deleting ? (
						<Loader2 className="w-4 h-4 animate-spin mx-auto" />
					) : (
						"Permanently delete account"
					)}
				</button>
			</form>
		</section>
	);
}

/* ─── Billing tab ─────────────────────────────────────────────── */

function BillingSection() {
	const sub = useSubscription();
	const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">(
		"monthly",
	);
	const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
	const [actionLoading, setActionLoading] = useState(false);

	const currentTier = sub.subscription?.tier ?? "free";
	const cancelAtPeriodEnd = sub.subscription?.cancelAtPeriodEnd ?? false;
	const periodEnd = sub.subscription?.currentPeriodEnd;

	const tiers = [
		{
			key: "free" as const,
			name: "Free",
			desc: "Get started with basic property management",
			price: { monthly: 0, yearly: 0 },
			highlights: [
				"1 portfolio",
				"5 properties",
				"Basic maps",
				"Marketplace access",
				"100 MB storage",
			],
		},
		{
			key: "pro" as const,
			name: "Pro",
			desc: "For growing property portfolios",
			price: { monthly: 19, yearly: 190 },
			highlights: [
				"5 portfolios",
				"50 properties",
				"5 team members",
				"Document AI",
				"Advanced analytics",
				"Bulk operations",
				"2 GB storage",
			],
			popular: true,
		},
		{
			key: "business" as const,
			name: "Business",
			desc: "For teams and agencies",
			price: { monthly: 49, yearly: 490 },
			highlights: [
				"Unlimited portfolios",
				"Unlimited properties",
				"25 team members",
				"Custom branding",
				"API access",
				"10 GB storage",
			],
		},
		{
			key: "enterprise" as const,
			name: "Enterprise",
			desc: "Custom solutions for large organizations",
			price: { monthly: 149, yearly: 1490 },
			highlights: [
				"Everything in Business",
				"Unlimited team members",
				"Unlimited storage",
				"Priority support",
			],
		},
	];

	const handleUpgrade = async (tier: string) => {
		if (tier === "free" || tier === currentTier) return;
		setCheckoutLoading(tier);
		try {
			await sub.checkout(tier as any, billingInterval);
		} catch {
			// Error handled by context
		} finally {
			setCheckoutLoading(null);
		}
	};

	const handleCancel = async () => {
		setActionLoading(true);
		try {
			await sub.cancel();
		} finally {
			setActionLoading(false);
		}
	};

	const handleResume = async () => {
		setActionLoading(true);
		try {
			await sub.resume();
		} finally {
			setActionLoading(false);
		}
	};

	const handlePortal = async () => {
		setActionLoading(true);
		try {
			await sub.openPortal();
		} finally {
			setActionLoading(false);
		}
	};

	if (sub.loading) {
		return (
			<Section
				title="Billing"
				description="Manage your subscription and billing"
			>
				<div className="flex items-center gap-2 text-outline py-8">
					<Loader2 className="w-4 h-4 animate-spin" />
					<span className="typo-body">Loading billing info…</span>
				</div>
			</Section>
		);
	}

	return (
		<div className="contents">
			{/* Current plan banner */}
			<Section
				title="Current plan"
				description="Your active subscription"
				className="md:col-span-2 xl:col-span-3"
			>
				<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
					<div>
						<div className="flex items-center gap-2">
							<span className="font-headline text-lg font-bold text-on-surface capitalize">
								{currentTier}
							</span>
							{currentTier !== "free" && (
								<span className="typo-caption bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 px-2 py-0.5 rounded-md font-medium">
									Active
								</span>
							)}
							{cancelAtPeriodEnd && (
								<span className="typo-caption bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 px-2 py-0.5 rounded-md font-medium">
									Cancels{" "}
									{periodEnd
										? new Date(periodEnd).toLocaleDateString()
										: "at period end"}
								</span>
							)}
						</div>
						<p className="typo-body-sm text-on-surface-variant mt-0.5">
							{sub.tierConfig.description}
						</p>
					</div>
					{currentTier !== "free" && (
						<div className="flex items-center gap-2">
							{cancelAtPeriodEnd ? (
								<button
									onClick={handleResume}
									disabled={actionLoading}
									className="typo-btn text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-md border border-outline-variant text-on-surface hover:bg-surface-container-low transition-colors cursor-pointer disabled:opacity-50"
								>
									{actionLoading ? (
										<Loader2 className="w-3.5 h-3.5 animate-spin" />
									) : (
										"Resume"
									)}
								</button>
							) : (
								<button
									onClick={handleCancel}
									disabled={actionLoading}
									className="typo-btn text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-md border border-outline-variant text-on-surface-variant hover:text-error hover:border-error transition-colors cursor-pointer disabled:opacity-50"
								>
									{actionLoading ? (
										<Loader2 className="w-3.5 h-3.5 animate-spin" />
									) : (
										"Cancel plan"
									)}
								</button>
							)}
							<button
								onClick={handlePortal}
								disabled={actionLoading}
								className="typo-btn text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-md border border-outline-variant text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer disabled:opacity-50"
							>
								Manage billing
							</button>
						</div>
					)}
				</div>
			</Section>

			{/* Billing interval toggle */}
			<div className="flex items-center gap-3 md:col-span-2 xl:col-span-3">
				<span
					className={`typo-body-sm font-medium ${billingInterval === "monthly" ? "text-on-surface" : "text-outline"}`}
				>
					Monthly
				</span>
				<button
					type="button"
					role="switch"
					aria-checked={billingInterval === "yearly"}
					onClick={() =>
						setBillingInterval(
							billingInterval === "monthly" ? "yearly" : "monthly",
						)
					}
					className={`relative shrink-0 w-10 h-[22px] rounded-full transition-colors cursor-pointer ${
						billingInterval === "yearly" ? "bg-primary" : "bg-outline-variant"
					}`}
				>
					<span
						className={`absolute top-[3px] left-[3px] w-4 h-4 rounded-full bg-card transition-transform ${
							billingInterval === "yearly" ? "translate-x-[18px]" : ""
						}`}
					/>
				</button>
				<span
					className={`typo-body-sm font-medium ${billingInterval === "yearly" ? "text-on-surface" : "text-outline"}`}
				>
					Yearly
				</span>
				{billingInterval === "yearly" && (
					<span className="typo-caption text-secondary font-medium">
						Save ~17%
					</span>
				)}
			</div>

			{/* Plan cards */}
			<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:col-span-2 xl:col-span-3">
				{tiers.map((tier) => {
					const isCurrent = currentTier === tier.key;
					const price =
						billingInterval === "monthly"
							? tier.price.monthly
							: tier.price.yearly;
					const perMonth =
						billingInterval === "yearly" && tier.price.yearly > 0
							? Math.round(tier.price.yearly / 12)
							: tier.price.monthly;

					return (
						<div
							key={tier.key}
							className={`bg-card border rounded-md p-5 flex flex-col ${
								tier.popular
									? "border-primary ring-1 ring-primary"
									: "border-outline-variant"
							} ${isCurrent ? "ring-2 ring-primary/30" : ""}`}
						>
							<div className="flex items-center gap-2 mb-1">
								<h3 className="font-headline text-base font-bold text-on-surface">
									{tier.name}
								</h3>
								{tier.popular && (
									<span className="typo-caption bg-primary/10 text-primary px-1.5 py-0.5 rounded-md font-medium text-badge uppercase tracking-wider">
										Popular
									</span>
								)}
							</div>
							<p className="typo-caption text-on-surface-variant mb-3">
								{tier.desc}
							</p>

							<div className="mb-4">
								{price === 0 ? (
									<span className="font-headline text-2xl font-bold text-on-surface">
										Free
									</span>
								) : (
									<>
										<span className="font-headline text-2xl font-bold text-on-surface">
											${perMonth}
										</span>
										<span className="typo-body-sm text-outline">/mo</span>
										{billingInterval === "yearly" && (
											<p className="typo-caption text-outline mt-0.5">
												${price}/yr billed annually
											</p>
										)}
									</>
								)}
							</div>

							<ul className="space-y-1.5 mb-5 flex-1">
								{tier.highlights.map((h) => (
									<li
										key={h}
										className="flex items-start gap-2 typo-body-sm text-on-surface-variant"
									>
										<Check className="w-3.5 h-3.5 text-secondary mt-0.5 shrink-0" />
										{h}
									</li>
								))}
							</ul>

							{isCurrent ? (
								<span className="typo-btn text-xs font-bold uppercase tracking-widest text-center py-2 px-4 rounded-md bg-surface-container-high text-on-surface-variant">
									Current plan
								</span>
							) : tier.key === "free" ? (
								<span className="typo-btn text-xs text-center py-2 px-4 rounded-md text-outline">
									—
								</span>
							) : (
								<button
									onClick={() => handleUpgrade(tier.key)}
									disabled={!!checkoutLoading}
									className="bg-blue-600 hover:bg-blue-700 text-white font-headline font-bold text-xs uppercase tracking-widest py-2 px-4 rounded-md shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 btn-press disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
								>
									{checkoutLoading === tier.key ? (
										<Loader2 className="w-3.5 h-3.5 animate-spin" />
									) : currentTier === "free" ? (
										"Upgrade"
									) : (
										"Switch plan"
									)}
								</button>
							)}
						</div>
					);
				})}
			</div>

			{/* Usage summary */}
			<Section
				title="Usage"
				description="Current resource usage against your plan limits"
			>
				<div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
					{[
						{ label: "Portfolios", limit: sub.tierConfig.limits.maxPortfolios },
						{ label: "Properties", limit: sub.tierConfig.limits.maxProperties },
						{
							label: "Team members",
							limit: sub.tierConfig.limits.maxTeamMembers,
						},
						{
							label: "Docs per property",
							limit: sub.tierConfig.limits.maxDocumentsPerProperty,
						},
						{
							label: "Storage",
							limit: sub.tierConfig.limits.maxFileStorageMB,
							suffix: " MB",
						},
					].map((item) => (
						<div key={item.label} className="flex flex-col">
							<span className="typo-caption text-outline font-medium">
								{item.label}
							</span>
							<span className="typo-body font-bold text-on-surface">
								{item.limit === -1
									? "Unlimited"
									: `${item.limit}${item.suffix ?? ""}`}
							</span>
						</div>
					))}
				</div>
			</Section>

			{/* Feature list */}
			<Section title="Features" description="What's included in your plan">
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
					{[
						{ label: "Basic maps", enabled: sub.tierConfig.features.basicMaps },
						{
							label: "Marketplace",
							enabled: sub.tierConfig.features.marketplace,
						},
						{
							label: "Team management",
							enabled: sub.tierConfig.features.teamManagement,
						},
						{
							label: "Document AI",
							enabled: sub.tierConfig.features.documentAI,
						},
						{
							label: "Advanced analytics",
							enabled: sub.tierConfig.features.advancedAnalytics,
						},
						{
							label: "Bulk operations",
							enabled: sub.tierConfig.features.bulkOperations,
						},
						{
							label: "Custom branding",
							enabled: sub.tierConfig.features.customBranding,
						},
						{ label: "API access", enabled: sub.tierConfig.features.apiAccess },
						{
							label: "Priority support",
							enabled: sub.tierConfig.features.prioritySupport,
						},
					].map((f) => (
						<div key={f.label} className="flex items-center gap-2 py-1">
							{f.enabled ? (
								<Check className="w-4 h-4 text-secondary shrink-0" />
							) : (
								<span className="w-4 h-4 flex items-center justify-center text-outline shrink-0">
									—
								</span>
							)}
							<span
								className={`typo-body-sm ${f.enabled ? "text-on-surface" : "text-outline"}`}
							>
								{f.label}
							</span>
						</div>
					))}
				</div>
			</Section>
		</div>
	);
}

/* ─── Main page ───────────────────────────────────────────────── */

export default function SettingsPage() {
	const [activeTab, setActiveTab] = useState<Tab>("profile");

	// Auto-switch to billing tab when returning from checkout
	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		if (
			params.get("subscription") === "success" ||
			params.get("subscription") === "cancelled"
		) {
			setActiveTab("billing");
		}
	}, []);

	return (
		<AppShell>
			<div className="sz-page">
				<h1 className="font-headline typo-page-title font-bold text-on-surface mb-1">
					Settings
				</h1>
				<p className="typo-body text-on-surface-variant mb-6">
					Manage your account, appearance, and preferences.
				</p>

				<div className="flex flex-col md:flex-row gap-4 md:gap-8 items-start">
					{/* Sidebar navigation */}
					<nav className="hidden md:flex flex-col gap-1 min-w-[180px] sticky top-4">
						{TABS.map(({ key, label, icon: Icon }) => {
							const active = activeTab === key;
							return (
								<button
									key={key}
									onClick={() => setActiveTab(key)}
									className={`flex items-center gap-2.5 px-3 py-2 sz-radius-md typo-body font-medium transition-colors text-left cursor-pointer ${
										active
											? "bg-nav-active text-primary border border-outline-variant"
											: "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low border border-transparent"
									} ${key === "danger" ? "mt-4" : ""}`}
								>
									<Icon
										className={`w-4 h-4 ${active ? "text-primary" : "text-outline"}`}
									/>
									{label}
								</button>
							);
						})}
					</nav>

					{/* Mobile tab bar */}
					<div className="flex md:hidden gap-1 overflow-x-auto pb-4 -mx-2 px-2 w-full">
						{TABS.map(({ key, label, icon: Icon }) => {
							const active = activeTab === key;
							return (
								<button
									key={key}
									onClick={() => setActiveTab(key)}
									className={`flex items-center gap-1.5 px-3 py-1.5 sz-radius-md typo-body-sm font-medium whitespace-nowrap transition-colors cursor-pointer ${
										active
											? "bg-nav-active text-primary border border-outline-variant"
											: "text-on-surface-variant hover:text-on-surface border border-transparent"
									}`}
								>
									<Icon className="w-3.5 h-3.5" />
									{label}
								</button>
							);
						})}
					</div>

					{/* Content area */}
					<div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-start">
						{activeTab === "profile" && <ProfileSection />}
						{activeTab === "appearance" && <AppearanceSection />}
						{activeTab === "branding" && <BrandingSection />}
						{activeTab === "billing" && <BillingSection />}
						{activeTab === "privacy" && <SecuritySection />}
						{activeTab === "advanced" && <AdvancedSection />}
						{activeTab === "danger" && <DangerSection />}
					</div>
				</div>
			</div>
		</AppShell>
	);
}
