"use client";

import { useAuth } from "@/components/AuthContext";
import AppShell from "@/components/layout/AppShell";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { AdminAPI } from "@/lib/salesApi";
import { cn } from "@/lib/utils";
import {
	FeePaidBy,
	FeeType,
	PlatformSettings,
	VerificationRequest,
	VerificationStatus,
} from "@/types/sale";
import {
	BadgeCheck,
	Loader2,
	Settings as SettingsIcon,
	ShieldCheck,
	XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";

type Tab = "settings" | "verifications";

export default function AdminPage() {
	const { user, loading: authLoading } = useAuth();
	const [tab, setTab] = useState<Tab>("settings");
	const [settings, setSettings] = useState<PlatformSettings | null>(null);
	const [verifications, setVerifications] = useState<VerificationRequest[]>([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [busyId, setBusyId] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	const refresh = async () => {
		setLoading(true);
		const [s, v] = await Promise.all([
			AdminAPI.getPlatformSettings(),
			AdminAPI.listVerifications(VerificationStatus.PENDING),
		]);
		setSettings(s);
		setVerifications(v);
		setLoading(false);
	};

	useEffect(() => {
		if (!authLoading && user?.isAdmin) refresh();
	}, [authLoading, user]);

	if (authLoading) {
		return (
			<AppShell>
				<div className="flex flex-1 items-center justify-center">
					<Loader2 className="w-6 h-6 animate-spin text-on-surface-variant" />
				</div>
			</AppShell>
		);
	}

	if (!user?.isAdmin) {
		return (
			<AppShell>
				<div className="flex flex-1 items-center justify-center font-body text-on-surface-variant">
					Admin access required.
				</div>
			</AppShell>
		);
	}

	const updateSetting = (patch: Partial<PlatformSettings>) =>
		setSettings((s) => (s ? { ...s, ...patch } : s));

	const handleSaveSettings = async () => {
		if (!settings) return;
		setSaving(true);
		setError(null);
		const { data, error: err } =
			await AdminAPI.updatePlatformSettings(settings);
		setSaving(false);
		if (err) {
			setError(err);
			return;
		}
		if (data) setSettings(data);
	};

	const handleReview = async (id: string, action: "approve" | "reject") => {
		setBusyId(id);
		const reason =
			action === "reject"
				? (prompt("Reason for rejection (optional)?") ?? undefined)
				: undefined;
		await AdminAPI.reviewVerification(id, action, reason);
		setBusyId(null);
		await refresh();
	};

	return (
		<AppShell scrollable>
			<div className="bg-background border-b border-border px-4 sm:px-8 py-3 sm:py-4">
				<h1 className="font-headline text-sm font-semibold text-primary">
					Admin
				</h1>
			</div>

			<div className="px-4 sm:px-8 py-6 max-w-4xl mx-auto w-full">
				<div className="flex gap-2 mb-6">
					<button
						onClick={() => setTab("settings")}
						className={cn(
							"px-3 py-2 rounded-md text-xs uppercase tracking-widest font-headline font-bold border flex items-center gap-1.5",
							tab === "settings"
								? "bg-blue-600 text-white border-blue-600"
								: "bg-card text-on-surface-variant border-border",
						)}
					>
						<SettingsIcon className="w-3.5 h-3.5" />
						Platform settings
					</button>
					<button
						onClick={() => setTab("verifications")}
						className={cn(
							"px-3 py-2 rounded-md text-xs uppercase tracking-widest font-headline font-bold border flex items-center gap-1.5",
							tab === "verifications"
								? "bg-blue-600 text-white border-blue-600"
								: "bg-card text-on-surface-variant border-border",
						)}
					>
						<ShieldCheck className="w-3.5 h-3.5" />
						Verifications ({verifications.length})
					</button>
				</div>

				{loading ? (
					<div className="flex items-center justify-center py-12">
						<Loader2 className="w-6 h-6 animate-spin text-on-surface-variant" />
					</div>
				) : tab === "settings" && settings ? (
					<div className="bg-card border border-border rounded-xl p-6 max-w-2xl space-y-4">
						{error && (
							<div className="text-xs text-rose-500 font-body">{error}</div>
						)}

						<div>
							<label className="block text-xs font-headline font-bold uppercase tracking-widest text-on-surface-variant mb-1">
								Default currency
							</label>
							<input
								type="text"
								value={settings.defaultCurrency ?? "USD"}
								onChange={(e) =>
									updateSetting({ defaultCurrency: e.target.value })
								}
								className="w-full bg-card border border-border rounded-md px-3 py-2 text-on-surface font-body max-w-32"
							/>
						</div>

						<div>
							<label className="block text-xs font-headline font-bold uppercase tracking-widest text-on-surface-variant mb-1">
								Fee type
							</label>
							<select
								value={settings.feeType}
								onChange={(e) =>
									updateSetting({ feeType: e.target.value as FeeType })
								}
								className="w-full bg-card border border-border rounded-md px-3 py-2 text-on-surface font-body max-w-xs"
							>
								<option value={FeeType.PERCENTAGE}>Percentage</option>
								<option value={FeeType.FLAT}>Flat fee</option>
								<option value={FeeType.TIERED}>Tiered</option>
							</select>
						</div>

						{settings.feeType === FeeType.PERCENTAGE && (
							<div>
								<label className="block text-xs font-headline font-bold uppercase tracking-widest text-on-surface-variant mb-1">
									Fee percent
								</label>
								<input
									type="number"
									step="0.1"
									value={settings.feePercent ?? 0}
									onChange={(e) =>
										updateSetting({ feePercent: parseFloat(e.target.value) })
									}
									className="w-full bg-card border border-border rounded-md px-3 py-2 text-on-surface font-body max-w-32"
								/>
							</div>
						)}

						{settings.feeType === FeeType.FLAT && (
							<div>
								<label className="block text-xs font-headline font-bold uppercase tracking-widest text-on-surface-variant mb-1">
									Flat fee amount
								</label>
								<input
									type="number"
									value={settings.flatFeeAmount ?? 0}
									onChange={(e) =>
										updateSetting({
											flatFeeAmount: parseFloat(e.target.value),
										})
									}
									className="w-full bg-card border border-border rounded-md px-3 py-2 text-on-surface font-body max-w-32"
								/>
							</div>
						)}

						<div>
							<label className="block text-xs font-headline font-bold uppercase tracking-widest text-on-surface-variant mb-1">
								Fee paid by
							</label>
							<select
								value={settings.feePaidBy}
								onChange={(e) =>
									updateSetting({ feePaidBy: e.target.value as FeePaidBy })
								}
								className="w-full bg-card border border-border rounded-md px-3 py-2 text-on-surface font-body max-w-xs"
							>
								<option value={FeePaidBy.BUYER}>Buyer</option>
								<option value={FeePaidBy.SELLER}>Seller</option>
								<option value={FeePaidBy.SPLIT}>Split</option>
							</select>
						</div>

						{settings.feePaidBy === FeePaidBy.SPLIT && (
							<div>
								<label className="block text-xs font-headline font-bold uppercase tracking-widest text-on-surface-variant mb-1">
									Buyer share %
								</label>
								<input
									type="number"
									value={settings.splitBuyerPercent ?? 50}
									onChange={(e) =>
										updateSetting({
											splitBuyerPercent: parseFloat(e.target.value),
										})
									}
									className="w-full bg-card border border-border rounded-md px-3 py-2 text-on-surface font-body max-w-32"
								/>
							</div>
						)}

						<div className="grid grid-cols-2 gap-3 max-w-md">
							<div>
								<label className="block text-xs font-headline font-bold uppercase tracking-widest text-on-surface-variant mb-1">
									Min fee
								</label>
								<input
									type="number"
									value={settings.minFeeAmount ?? 0}
									onChange={(e) =>
										updateSetting({ minFeeAmount: parseFloat(e.target.value) })
									}
									className="w-full bg-card border border-border rounded-md px-3 py-2 text-on-surface font-body"
								/>
							</div>
							<div>
								<label className="block text-xs font-headline font-bold uppercase tracking-widest text-on-surface-variant mb-1">
									Max fee
								</label>
								<input
									type="number"
									value={settings.maxFeeAmount ?? 0}
									onChange={(e) =>
										updateSetting({ maxFeeAmount: parseFloat(e.target.value) })
									}
									className="w-full bg-card border border-border rounded-md px-3 py-2 text-on-surface font-body"
								/>
							</div>
						</div>

						<label className="flex items-center gap-2 text-sm font-body text-on-surface">
							<input
								type="checkbox"
								checked={!!settings.autoApproveVerifications}
								onChange={(e) =>
									updateSetting({
										autoApproveVerifications: e.target.checked,
									})
								}
							/>
							Auto-approve verification requests (for testing)
						</label>

						<PrimaryButton onClick={handleSaveSettings} disabled={saving}>
							{saving ? (
								<Loader2 className="w-4 h-4 animate-spin" />
							) : (
								<SettingsIcon className="w-4 h-4" />
							)}
							Save settings
						</PrimaryButton>
					</div>
				) : tab === "verifications" ? (
					<div className="bg-card border border-border rounded-xl p-6 max-w-3xl">
						{verifications.length === 0 ? (
							<div className="text-sm text-on-surface-variant font-body italic">
								No pending verification requests.
							</div>
						) : (
							<ul className="space-y-3">
								{verifications.map((v) => (
									<li
										key={v.id}
										className="bg-surface-container rounded-md p-4 border border-border"
									>
										<div className="flex items-start justify-between gap-3 flex-wrap">
											<div className="min-w-0">
												<div className="font-headline font-bold text-on-surface">
													{v.userName}
												</div>
												<div className="text-xs text-on-surface-variant font-body">
													{v.userEmail} · {v.documentType ?? "no doc type"}
												</div>
												{v.documentUrl && (
													<a
														href={v.documentUrl}
														target="_blank"
														rel="noreferrer"
														className="text-xs text-blue-600 hover:text-blue-700 font-body underline"
													>
														View document
													</a>
												)}
												{v.notes && (
													<div className="text-xs text-on-surface-variant font-body mt-1 italic">
														{v.notes}
													</div>
												)}
											</div>
											<div className="flex gap-2">
												<button
													onClick={() => handleReview(v.id, "approve")}
													disabled={busyId === v.id}
													className="bg-emerald-600 hover:bg-emerald-700 text-white font-headline font-bold text-xs uppercase tracking-widest py-1.5 px-3 rounded-md flex items-center gap-1 disabled:opacity-50"
												>
													<BadgeCheck className="w-3 h-3" />
													Approve
												</button>
												<button
													onClick={() => handleReview(v.id, "reject")}
													disabled={busyId === v.id}
													className="bg-rose-600 hover:bg-rose-700 text-white font-headline font-bold text-xs uppercase tracking-widest py-1.5 px-3 rounded-md flex items-center gap-1 disabled:opacity-50"
												>
													<XCircle className="w-3 h-3" />
													Reject
												</button>
											</div>
										</div>
									</li>
								))}
							</ul>
						)}
					</div>
				) : null}
			</div>
		</AppShell>
	);
}
