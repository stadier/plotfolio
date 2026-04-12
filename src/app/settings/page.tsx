"use client";

import { useAuth } from "@/components/AuthContext";
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
	AlertTriangle,
	Camera,
	Check,
	Eye,
	EyeOff,
	Globe,
	Loader2,
	Monitor,
	Moon,
	Palette,
	Server,
	Shield,
	Sun,
	User,
} from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";

/* ─── Constants ───────────────────────────────────────────────── */

type Tab = "profile" | "appearance" | "privacy" | "advanced" | "danger";

const TABS: { key: Tab; label: string; icon: typeof User }[] = [
	{ key: "profile", label: "Profile", icon: User },
	{ key: "appearance", label: "Appearance", icon: Palette },
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
				className="w-full max-w-sm typo-body bg-input border border-outline-variant sz-radius-md px-3 py-2 text-on-surface placeholder:text-outline focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
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
				className="w-full max-w-sm typo-body bg-input border border-outline-variant sz-radius-md px-3 py-2 text-on-surface focus:outline-none focus:border-primary transition-colors appearance-none cursor-pointer"
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
		<div className="flex items-start justify-between gap-4 max-w-lg">
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
}: {
	title: string;
	description?: string;
	children: React.ReactNode;
}) {
	return (
		<section className="bg-card sz-card border border-outline-variant mb-6 max-w-2xl">
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

				<form onSubmit={handleSave} className="space-y-4">
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
						<p className="typo-body-sm text-error font-medium">{error}</p>
					)}

					<div className="flex items-center gap-3 pt-2">
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
				<div className="space-y-4">
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
	const { user } = useAuth();
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
				<form onSubmit={handleChangePassword} className="space-y-4">
					<div className="relative max-w-sm">
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
					<div className="relative max-w-sm">
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
						<p className="typo-body-sm text-error font-medium">{error}</p>
					)}

					<div className="flex items-center gap-3 pt-2">
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
				<div className="flex items-center gap-3 max-w-lg">
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
		>
			{loadingProviders ? (
				<div className="flex items-center gap-2 typo-body-sm text-on-surface-variant py-4">
					<Loader2 className="w-4 h-4 animate-spin" />
					Loading provider settings…
				</div>
			) : (
				<div className="space-y-6">
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
		<section className="bg-card sz-card border-2 border-error/30 sz-radius-card mb-6 max-w-2xl">
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

/* ─── Main page ───────────────────────────────────────────────── */

export default function SettingsPage() {
	const [activeTab, setActiveTab] = useState<Tab>("profile");

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
					<div className="flex-1 min-w-0">
						{activeTab === "profile" && <ProfileSection />}
						{activeTab === "appearance" && <AppearanceSection />}
						{activeTab === "privacy" && <SecuritySection />}
						{activeTab === "advanced" && <AdvancedSection />}
						{activeTab === "danger" && <DangerSection />}
					</div>
				</div>
			</div>
		</AppShell>
	);
}
