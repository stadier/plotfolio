"use client";

import { useAuth } from "@/components/AuthContext";
import AppShell from "@/components/layout/AppShell";
import BackButton from "@/components/ui/BackButton";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { VerificationAPI } from "@/lib/salesApi";
import { cn } from "@/lib/utils";
import { VerificationStatus } from "@/types/sale";
import {
	BadgeCheck,
	Clock,
	Loader2,
	ShieldAlert,
	ShieldCheck,
	XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";

const STATUS_VISUAL: Record<
	VerificationStatus,
	{ icon: any; label: string; color: string }
> = {
	[VerificationStatus.UNVERIFIED]: {
		icon: ShieldAlert,
		label: "Not verified",
		color: "text-on-surface-variant",
	},
	[VerificationStatus.PENDING]: {
		icon: Clock,
		label: "Pending review",
		color: "text-amber-500",
	},
	[VerificationStatus.VERIFIED]: {
		icon: BadgeCheck,
		label: "Verified",
		color: "text-emerald-500",
	},
	[VerificationStatus.REJECTED]: {
		icon: XCircle,
		label: "Rejected",
		color: "text-rose-500",
	},
};

export default function VerificationSettingsPage() {
	const { user } = useAuth();
	const [status, setStatus] = useState<VerificationStatus>(
		VerificationStatus.UNVERIFIED,
	);
	const [rejectionReason, setRejectionReason] = useState<string | undefined>();
	const [docUrl, setDocUrl] = useState("");
	const [docType, setDocType] = useState("national_id");
	const [notes, setNotes] = useState("");
	const [busy, setBusy] = useState(false);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const refresh = async () => {
		setLoading(true);
		const data = await VerificationAPI.getStatus();
		if (data) {
			setStatus(data.status);
			setRejectionReason(data.rejectionReason);
		}
		setLoading(false);
	};

	useEffect(() => {
		refresh();
	}, []);

	const handleSubmit = async () => {
		setBusy(true);
		setError(null);
		const { error: err } = await VerificationAPI.submit({
			documentUrl: docUrl || undefined,
			documentType: docType,
			notes: notes || undefined,
		});
		setBusy(false);
		if (err) {
			setError(err);
			return;
		}
		setDocUrl("");
		setNotes("");
		await refresh();
	};

	const visual = STATUS_VISUAL[status];
	const Icon = visual.icon;
	const canSubmit =
		status === VerificationStatus.UNVERIFIED ||
		status === VerificationStatus.REJECTED;

	if (loading) {
		return (
			<AppShell>
				<div className="flex flex-1 items-center justify-center">
					<Loader2 className="w-6 h-6 animate-spin text-on-surface-variant" />
				</div>
			</AppShell>
		);
	}

	return (
		<AppShell scrollable>
			<div className="bg-background border-b border-border px-4 sm:px-8 py-3 sm:py-4">
				<div className="flex items-center gap-3 max-w-3xl">
					<BackButton fallbackHref="/settings" label="Settings" />
					<span className="text-outline-variant hidden sm:inline">/</span>
					<h1 className="font-headline text-sm font-semibold text-primary truncate">
						Identity verification
					</h1>
				</div>
			</div>

			<div className="px-4 sm:px-8 py-6 max-w-2xl mx-auto w-full space-y-6">
				<div className="bg-card border border-border rounded-xl p-6">
					<div className={cn("flex items-center gap-3", visual.color)}>
						<Icon className="w-8 h-8" />
						<div>
							<div className="font-headline font-bold text-lg">
								{visual.label}
							</div>
							{rejectionReason && status === VerificationStatus.REJECTED && (
								<div className="text-xs font-body mt-1 text-rose-500">
									Reason: {rejectionReason}
								</div>
							)}
						</div>
					</div>
					<p className="mt-4 text-sm text-on-surface-variant font-body">
						Verified users can place bids in auctions and submit offers.
						Verification gives buyers and sellers confidence in your identity.
					</p>
				</div>

				{canSubmit && (
					<div className="bg-card border border-border rounded-xl p-6 space-y-4">
						<h2 className="font-headline font-bold text-on-surface flex items-center gap-2">
							<ShieldCheck className="w-5 h-5 text-blue-600" />
							Submit verification
						</h2>
						<div>
							<label className="block text-xs font-headline font-bold uppercase tracking-widest text-on-surface-variant mb-1">
								Document type
							</label>
							<select
								value={docType}
								onChange={(e) => setDocType(e.target.value)}
								className="w-full bg-card border border-border rounded-md px-3 py-2 text-on-surface font-body"
							>
								<option value="national_id">National ID</option>
								<option value="passport">Passport</option>
								<option value="drivers_license">Driver's License</option>
								<option value="utility_bill">Utility Bill</option>
							</select>
						</div>
						<div>
							<label className="block text-xs font-headline font-bold uppercase tracking-widest text-on-surface-variant mb-1">
								Document URL (upload elsewhere first)
							</label>
							<input
								type="url"
								value={docUrl}
								onChange={(e) => setDocUrl(e.target.value)}
								placeholder="https://…"
								className="w-full bg-card border border-border rounded-md px-3 py-2 text-on-surface font-body"
							/>
						</div>
						<div>
							<label className="block text-xs font-headline font-bold uppercase tracking-widest text-on-surface-variant mb-1">
								Notes (optional)
							</label>
							<textarea
								value={notes}
								onChange={(e) => setNotes(e.target.value)}
								rows={3}
								className="w-full bg-card border border-border rounded-md px-3 py-2 text-on-surface font-body"
							/>
						</div>
						{error && (
							<div className="text-xs text-rose-500 font-body">{error}</div>
						)}
						<PrimaryButton onClick={handleSubmit} disabled={busy}>
							{busy ? (
								<Loader2 className="w-4 h-4 animate-spin" />
							) : (
								<ShieldCheck className="w-4 h-4" />
							)}
							Submit for review
						</PrimaryButton>
					</div>
				)}
			</div>
		</AppShell>
	);
}
