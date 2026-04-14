"use client";

import { LetterheadConfig, LetterheadLayout } from "@/types/seal";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

/* ─── colour presets ──────────────────────────────────────────── */
const ACCENT_PRESETS = [
	"#1e3a5f",
	"#0f766e",
	"#7c3aed",
	"#b91c1c",
	"#0369a1",
	"#15803d",
	"#92400e",
	"#1e1e1e",
];

const LAYOUT_OPTIONS: { value: LetterheadLayout; label: string }[] = [
	{ value: "centered", label: "Centered" },
	{ value: "left-aligned", label: "Left-aligned" },
	{ value: "split", label: "Split" },
];

const FONT_OPTIONS = [
	{ value: "", label: "Default (Georgia)" },
	{
		value: "'Helvetica Neue', Helvetica, Arial, sans-serif",
		label: "Helvetica",
	},
	{ value: "'Times New Roman', Times, serif", label: "Times" },
	{ value: "'Courier New', Courier, monospace", label: "Courier" },
	{ value: "'Trebuchet MS', sans-serif", label: "Trebuchet" },
	{ value: "'Palatino Linotype', Palatino, serif", label: "Palatino" },
];

/* ─── default config ──────────────────────────────────────────── */
function defaultConfig(): LetterheadConfig {
	return {
		companyName: "",
		tagline: "",
		logoUrl: "",
		address: "",
		phone: "",
		email: "",
		website: "",
		registrationNumber: "",
		accentColor: "#1e3a5f",
		fontFamily: "",
		layout: "centered",
		showDivider: true,
		showFooter: true,
	};
}

/* ─── escapers ────────────────────────────────────────────────── */
function esc(s: string): string {
	return s
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

/* ─── live preview HTML ───────────────────────────────────────── */
export function buildLetterheadHtml(cfg: LetterheadConfig): string {
	const font = cfg.fontFamily || "'Georgia', 'Times New Roman', serif";
	const c = cfg.accentColor || "#1e3a5f";

	const logoHtml = cfg.logoUrl
		? `<img src="${esc(cfg.logoUrl)}" alt="" style="max-height:56px;max-width:120px;object-fit:contain;" />`
		: "";

	const contactParts = [cfg.phone, cfg.email, cfg.website, cfg.address].filter(
		Boolean,
	);
	const contactLine = contactParts
		.map((p) => esc(p!))
		.join("&nbsp;&nbsp;·&nbsp;&nbsp;");

	const regLine = cfg.registrationNumber
		? `<div style="font-size:10px;color:#999;margin-top:2px;">Reg: ${esc(cfg.registrationNumber)}</div>`
		: "";

	/* header alignment styles */
	let headerAlign = "center";
	let headerFlex = "center";
	if (cfg.layout === "left-aligned") {
		headerAlign = "left";
		headerFlex = "flex-start";
	}

	let innerHtml: string;
	if (cfg.layout === "split") {
		innerHtml = `
			<div style="display:flex;justify-content:space-between;align-items:center;gap:16px;">
				<div style="display:flex;align-items:center;gap:12px;">
					${logoHtml}
					<div>
						<div style="font-family:${font};font-size:20px;font-weight:700;color:${c};letter-spacing:1px;">${esc(cfg.companyName)}</div>
						${cfg.tagline ? `<div style="font-size:11px;color:#777;letter-spacing:0.5px;">${esc(cfg.tagline)}</div>` : ""}
					</div>
				</div>
				<div style="text-align:right;font-size:11px;color:#555;line-height:1.6;">
					${cfg.address ? `<div>${esc(cfg.address)}</div>` : ""}
					${cfg.phone ? `<div>${esc(cfg.phone)}</div>` : ""}
					${cfg.email ? `<div>${esc(cfg.email)}</div>` : ""}
					${cfg.website ? `<div>${esc(cfg.website)}</div>` : ""}
				</div>
			</div>
			${regLine}
		`;
	} else {
		innerHtml = `
			<div style="display:flex;flex-direction:column;align-items:${headerFlex};gap:6px;">
				${logoHtml}
				<div style="font-family:${font};font-size:22px;font-weight:700;color:${c};letter-spacing:2px;text-align:${headerAlign};">${esc(cfg.companyName)}</div>
				${cfg.tagline ? `<div style="font-size:11px;color:#777;letter-spacing:0.5px;">${esc(cfg.tagline)}</div>` : ""}
				${contactLine ? `<div style="font-size:11px;color:#555;">${contactLine}</div>` : ""}
				${regLine}
			</div>
		`;
	}

	const divider = cfg.showDivider
		? `<div style="border-bottom:2px solid ${c};margin-top:14px;"></div>`
		: "";

	const footerHtml = cfg.showFooter
		? `
		<div style="position:absolute;bottom:0;left:0;right:0;padding:12px 40px;border-top:1px solid #e2e8f0;font-size:10px;color:#999;text-align:center;">
			${contactLine ? contactLine : esc(cfg.companyName)}
			${cfg.registrationNumber ? ` · Reg: ${esc(cfg.registrationNumber)}` : ""}
		</div>`
		: "";

	return `<!DOCTYPE html>
<html><head><meta charset="UTF-8" />
<style>
	@page { margin: 2cm; size: A4; }
	* { margin:0; padding:0; box-sizing:border-box; }
	body {
		font-family: 'Georgia','Times New Roman',serif;
		max-width:210mm; margin:0 auto;
		padding:40px; position:relative;
		min-height:297mm; color:#1a1a1a;
		line-height:1.7;
	}
</style>
</head><body>
<div style="padding-bottom:16px;">
	${innerHtml}
	${divider}
</div>

<!-- document body area -->
<div style="padding:24px 0;font-size:14px;color:#888;font-style:italic;">
	Your document content will appear here…
</div>

${footerHtml}
</body></html>`;
}

/* ═══════════════════════════════════════════════════════════════ */
/*  LetterheadEditor – form + live preview                       */
/* ═══════════════════════════════════════════════════════════════ */

interface Props {
	initial?: LetterheadConfig | null;
	sealImageUrl?: string;
	onSaved?: (cfg: LetterheadConfig) => void;
}

export default function LetterheadEditor({
	initial,
	sealImageUrl,
	onSaved,
}: Props) {
	const [cfg, setCfg] = useState<LetterheadConfig>(initial ?? defaultConfig());
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);
	const previewRef = useRef<HTMLIFrameElement>(null);

	/* populate logo from seal if no logo set */
	useEffect(() => {
		if (!cfg.logoUrl && sealImageUrl) {
			setCfg((p) => ({ ...p, logoUrl: sealImageUrl }));
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [sealImageUrl]);

	const update = useCallback(
		<K extends keyof LetterheadConfig>(key: K, val: LetterheadConfig[K]) => {
			setCfg((p) => ({ ...p, [key]: val }));
			setSuccess(false);
		},
		[],
	);

	const handleSave = async () => {
		if (!cfg.companyName.trim()) {
			setError("Company or personal name is required");
			return;
		}
		setSaving(true);
		setError(null);
		setSuccess(false);
		try {
			const res = await fetch("/api/settings/letterhead", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ letterhead: cfg }),
			});
			if (!res.ok) {
				const d = await res.json();
				throw new Error(d.error || "Save failed");
			}
			const d = await res.json();
			setSuccess(true);
			onSaved?.(d.letterhead);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to save");
		} finally {
			setSaving(false);
		}
	};

	const handlePrint = () => {
		previewRef.current?.contentWindow?.print();
	};

	const handleDownload = () => {
		const html = buildLetterheadHtml(cfg);
		const blob = new Blob([html], { type: "text/html" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `${cfg.companyName.replace(/[^a-zA-Z0-9]/g, "_")}_letterhead.html`;
		a.click();
		URL.revokeObjectURL(url);
	};

	/* ─── render ──────────────────────────────────────────────── */
	return (
		<div className="flex flex-col lg:flex-row gap-6 max-w-4xl">
			{/* ── Form ─────────────────────────────────────────── */}
			<div className="flex-1 max-w-md space-y-4">
				{/* company name */}
				<label className="block">
					<span className="typo-body-sm font-medium text-on-surface-variant mb-1 block">
						Company / personal name <span className="text-error">*</span>
					</span>
					<input
						type="text"
						value={cfg.companyName}
						onChange={(e) => update("companyName", e.target.value)}
						placeholder="Acme Properties Ltd"
						className="w-full bg-input border border-outline-variant sz-radius-md px-3 py-2 typo-body text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/30"
					/>
				</label>

				{/* tagline */}
				<label className="block">
					<span className="typo-body-sm font-medium text-on-surface-variant mb-1 block">
						Tagline
					</span>
					<input
						type="text"
						value={cfg.tagline ?? ""}
						onChange={(e) => update("tagline", e.target.value)}
						placeholder="Your trusted property partner"
						className="w-full bg-input border border-outline-variant sz-radius-md px-3 py-2 typo-body text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/30"
					/>
				</label>

				{/* logo url */}
				<label className="block">
					<span className="typo-body-sm font-medium text-on-surface-variant mb-1 block">
						Logo URL
					</span>
					<input
						type="text"
						value={cfg.logoUrl ?? ""}
						onChange={(e) => update("logoUrl", e.target.value)}
						placeholder="https://example.com/logo.png or leave blank for seal"
						className="w-full bg-input border border-outline-variant sz-radius-md px-3 py-2 typo-body text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/30"
					/>
					{sealImageUrl && (
						<button
							type="button"
							onClick={() => update("logoUrl", sealImageUrl)}
							className="typo-caption text-primary hover:underline mt-1 cursor-pointer"
						>
							Use my default seal as logo
						</button>
					)}
				</label>

				{/* address */}
				<label className="block">
					<span className="typo-body-sm font-medium text-on-surface-variant mb-1 block">
						Address
					</span>
					<input
						type="text"
						value={cfg.address ?? ""}
						onChange={(e) => update("address", e.target.value)}
						placeholder="123 Main St, Cityville"
						className="w-full bg-input border border-outline-variant sz-radius-md px-3 py-2 typo-body text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/30"
					/>
				</label>

				{/* phone + email on one row */}
				<div className="grid grid-cols-2 gap-3">
					<label className="block">
						<span className="typo-body-sm font-medium text-on-surface-variant mb-1 block">
							Phone
						</span>
						<input
							type="text"
							value={cfg.phone ?? ""}
							onChange={(e) => update("phone", e.target.value)}
							placeholder="+1 234 567 890"
							className="w-full bg-input border border-outline-variant sz-radius-md px-3 py-2 typo-body text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/30"
						/>
					</label>
					<label className="block">
						<span className="typo-body-sm font-medium text-on-surface-variant mb-1 block">
							Email
						</span>
						<input
							type="email"
							value={cfg.email ?? ""}
							onChange={(e) => update("email", e.target.value)}
							placeholder="info@acme.com"
							className="w-full bg-input border border-outline-variant sz-radius-md px-3 py-2 typo-body text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/30"
						/>
					</label>
				</div>

				{/* website + reg number */}
				<div className="grid grid-cols-2 gap-3">
					<label className="block">
						<span className="typo-body-sm font-medium text-on-surface-variant mb-1 block">
							Website
						</span>
						<input
							type="text"
							value={cfg.website ?? ""}
							onChange={(e) => update("website", e.target.value)}
							placeholder="www.acme.com"
							className="w-full bg-input border border-outline-variant sz-radius-md px-3 py-2 typo-body text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/30"
						/>
					</label>
					<label className="block">
						<span className="typo-body-sm font-medium text-on-surface-variant mb-1 block">
							Registration No.
						</span>
						<input
							type="text"
							value={cfg.registrationNumber ?? ""}
							onChange={(e) => update("registrationNumber", e.target.value)}
							placeholder="RC-12345"
							className="w-full bg-input border border-outline-variant sz-radius-md px-3 py-2 typo-body text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/30"
						/>
					</label>
				</div>

				{/* accent colour */}
				<div>
					<span className="typo-body-sm font-medium text-on-surface-variant mb-1.5 block">
						Accent colour
					</span>
					<div className="flex items-center gap-2 flex-wrap">
						{ACCENT_PRESETS.map((preset) => (
							<button
								key={preset}
								type="button"
								onClick={() => update("accentColor", preset)}
								className="w-7 h-7 rounded-full border-2 transition-all cursor-pointer"
								style={{
									backgroundColor: preset,
									borderColor:
										cfg.accentColor === preset ? preset : "transparent",
									boxShadow:
										cfg.accentColor === preset
											? `0 0 0 2px ${preset}40`
											: "none",
								}}
							/>
						))}
						<input
							type="color"
							value={cfg.accentColor}
							onChange={(e) => update("accentColor", e.target.value)}
							className="w-7 h-7 cursor-pointer border-0 bg-transparent"
						/>
					</div>
				</div>

				{/* font */}
				<label className="block">
					<span className="typo-body-sm font-medium text-on-surface-variant mb-1 block">
						Font
					</span>
					<select
						value={cfg.fontFamily ?? ""}
						onChange={(e) => update("fontFamily", e.target.value)}
						className="w-full bg-input border border-outline-variant sz-radius-md px-3 py-2 typo-body text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
					>
						{FONT_OPTIONS.map((f) => (
							<option key={f.value} value={f.value}>
								{f.label}
							</option>
						))}
					</select>
				</label>

				{/* layout */}
				<div>
					<span className="typo-body-sm font-medium text-on-surface-variant mb-1.5 block">
						Layout
					</span>
					<div className="flex gap-2 flex-wrap">
						{LAYOUT_OPTIONS.map((o) => (
							<button
								key={o.value}
								type="button"
								onClick={() => update("layout", o.value)}
								className={`px-3 py-1.5 sz-radius-md typo-body-sm font-medium border-2 transition-all cursor-pointer ${
									cfg.layout === o.value
										? "border-primary bg-primary/10 text-primary"
										: "border-outline-variant text-on-surface-variant hover:border-outline"
								}`}
							>
								{o.label}
							</button>
						))}
					</div>
				</div>

				{/* toggles */}
				<div className="space-y-2">
					<label className="flex items-center gap-2 cursor-pointer">
						<input
							type="checkbox"
							checked={cfg.showDivider}
							onChange={(e) => update("showDivider", e.target.checked)}
							className="accent-primary"
						/>
						<span className="typo-body-sm text-on-surface">
							Show divider line
						</span>
					</label>
					<label className="flex items-center gap-2 cursor-pointer">
						<input
							type="checkbox"
							checked={cfg.showFooter}
							onChange={(e) => update("showFooter", e.target.checked)}
							className="accent-primary"
						/>
						<span className="typo-body-sm text-on-surface">
							Show page footer
						</span>
					</label>
				</div>

				{/* error / success */}
				{error && <p className="typo-body-sm text-error">{error}</p>}
				{success && (
					<p className="typo-body-sm text-secondary">Letterhead saved!</p>
				)}

				{/* actions */}
				<div className="flex gap-3 flex-wrap pt-2">
					<button
						type="button"
						onClick={handleSave}
						disabled={saving}
						className="sz-btn bg-primary text-on-primary typo-btn font-bold uppercase tracking-widest hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
					>
						{saving ? (
							<span className="flex items-center gap-2">
								<Loader2 className="w-4 h-4 animate-spin" /> Saving…
							</span>
						) : (
							"Save letterhead"
						)}
					</button>
					<button
						type="button"
						onClick={handlePrint}
						className="sz-btn border-2 border-outline-variant text-on-surface-variant typo-btn font-bold uppercase tracking-widest hover:border-outline transition-colors cursor-pointer"
					>
						Print
					</button>
					<button
						type="button"
						onClick={handleDownload}
						className="sz-btn border-2 border-outline-variant text-on-surface-variant typo-btn font-bold uppercase tracking-widest hover:border-outline transition-colors cursor-pointer"
					>
						Download HTML
					</button>
				</div>
			</div>

			{/* ── Live preview ─────────────────────────────────── */}
			<div className="flex-1 max-w-md">
				<span className="typo-body-sm font-medium text-on-surface-variant mb-2 block">
					Preview
				</span>
				<div
					className="border border-outline-variant sz-radius-md overflow-hidden bg-surface-container-lowest"
					style={{ aspectRatio: "210 / 148" }}
				>
					<iframe
						ref={previewRef}
						srcDoc={buildLetterheadHtml(cfg)}
						title="Letterhead preview"
						className="w-full h-full border-0"
						sandbox="allow-same-origin"
					/>
				</div>
			</div>
		</div>
	);
}
