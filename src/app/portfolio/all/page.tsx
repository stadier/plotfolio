"use client";

import { useRequireAuth } from "@/components/AuthContext";
import {
	type PortfolioWithRole,
	usePortfolio,
} from "@/components/PortfolioContext";
import AppShell from "@/components/layout/AppShell";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { PortfolioAPI } from "@/lib/api";
import {
	Briefcase,
	Camera,
	Check,
	Loader2,
	Lock,
	MoreVertical,
	Pencil,
	Plus,
	Search,
	Users,
	X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/* ── Tabs ──────────────────────────────────────────────────────── */

type Tab = "mine" | "shared";

/* ── Page ──────────────────────────────────────────────────────── */

export default function AllPortfoliosPage() {
	const { user, loading: authLoading } = useRequireAuth();
	const {
		portfolios,
		loading: ctxLoading,
		setActivePortfolioId,
		refresh,
	} = usePortfolio();
	const router = useRouter();

	const [tab, setTab] = useState<Tab>("mine");
	const [search, setSearch] = useState("");
	const [editingPortfolio, setEditingPortfolio] =
		useState<PortfolioWithRole | null>(null);

	const mine = portfolios.filter((p) => p.createdBy === user?.id);
	const shared = portfolios.filter((p) => p.createdBy !== user?.id);
	const list = tab === "mine" ? mine : shared;

	const filtered = search.trim()
		? list.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
		: list;

	const loading = authLoading || ctxLoading;

	function handleSelectPortfolio(p: PortfolioWithRole) {
		setActivePortfolioId(p.id);
		router.push("/portfolio");
	}

	return (
		<AppShell hideAddProperty>
			{/* Header */}
			<div className="bg-background border-b border-border px-4 sm:px-8 py-3 sm:py-4 sticky top-0 z-10">
				<div className="flex items-center justify-between gap-4">
					<h1 className="font-headline text-lg font-bold text-on-surface">
						Portfolios
					</h1>
					<PrimaryButton href="/portfolio/new">
						<Plus className="w-4 h-4" />
						New portfolio
					</PrimaryButton>
				</div>
			</div>

			<div className="px-4 sm:px-8 pt-6 pb-16">
				{/* Tabs + Search */}
				<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
					<div className="flex gap-1 bg-surface-container rounded-lg p-1">
						<button
							onClick={() => setTab("mine")}
							className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
								tab === "mine"
									? "bg-card text-on-surface shadow-sm"
									: "text-on-surface-variant hover:text-on-surface"
							}`}
						>
							My Portfolios
						</button>
						<button
							onClick={() => setTab("shared")}
							className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
								tab === "shared"
									? "bg-card text-on-surface shadow-sm"
									: "text-on-surface-variant hover:text-on-surface"
							}`}
						>
							Shared with me
							{shared.length > 0 && (
								<span className="ml-1.5 text-xs text-outline">
									{shared.length}
								</span>
							)}
						</button>
					</div>

					<div className="relative w-full sm:w-64">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
						<input
							type="text"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="Search portfolios"
							className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-card text-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/30"
						/>
					</div>
				</div>

				{/* Loading */}
				{loading && (
					<div className="flex items-center justify-center py-20">
						<Loader2 className="w-6 h-6 animate-spin text-primary" />
					</div>
				)}

				{/* Empty state */}
				{!loading && filtered.length === 0 && (
					<div className="text-center py-20">
						<Briefcase className="w-10 h-10 text-outline mx-auto mb-3" />
						<p className="text-on-surface-variant text-sm">
							{search
								? "No portfolios match your search."
								: tab === "shared"
									? "No one has shared a portfolio with you yet."
									: "You haven't created any portfolios yet."}
						</p>
						{tab === "mine" && !search && (
							<PrimaryButton href="/portfolio/new" className="mt-4">
								<Plus className="w-4 h-4" />
								Create your first portfolio
							</PrimaryButton>
						)}
					</div>
				)}

				{/* Grid */}
				{!loading && filtered.length > 0 && (
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
						{filtered.map((p) => (
							<PortfolioCard
								key={p.id}
								portfolio={p}
								isOwner={p.createdBy === user?.id}
								onSelect={() => handleSelectPortfolio(p)}
								onEdit={() => setEditingPortfolio(p)}
							/>
						))}

						{/* New portfolio card */}
						{tab === "mine" && !search && (
							<Link
								href="/portfolio/new"
								className="flex flex-col items-center justify-center gap-2 min-h-[200px] rounded-xl border-2 border-dashed border-border hover:border-primary/40 text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
							>
								<div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center">
									<Plus className="w-5 h-5" />
								</div>
								<span className="text-sm font-medium">New portfolio</span>
								<span className="text-xs text-outline">
									Organize and share your assets
								</span>
							</Link>
						)}
					</div>
				)}
			</div>

			{/* Edit modal */}
			{editingPortfolio && (
				<EditPortfolioModal
					portfolio={editingPortfolio}
					onClose={() => setEditingPortfolio(null)}
					onSaved={async () => {
						await refresh();
						setEditingPortfolio(null);
					}}
				/>
			)}
		</AppShell>
	);
}

/* ── Portfolio Card ────────────────────────────────────────────── */

function PortfolioCard({
	portfolio,
	isOwner,
	onSelect,
	onEdit,
}: {
	portfolio: PortfolioWithRole;
	isOwner: boolean;
	onSelect: () => void;
	onEdit: () => void;
}) {
	const [menuOpen, setMenuOpen] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!menuOpen) return;
		function handleClick(e: MouseEvent) {
			if (menuRef.current && !menuRef.current.contains(e.target as Node))
				setMenuOpen(false);
		}
		document.addEventListener("mousedown", handleClick);
		return () => document.removeEventListener("mousedown", handleClick);
	}, [menuOpen]);

	return (
		<div
			onClick={onSelect}
			className="rounded-xl border border-border bg-card overflow-hidden cursor-pointer transition-shadow hover:shadow-lg group"
		>
			{/* Cover / avatar area */}
			<div className="h-32 relative bg-linear-to-br from-amber-400 via-orange-400 to-pink-400 overflow-hidden">
				{portfolio.avatar && (
					<img
						src={portfolio.avatar}
						alt=""
						className="w-full h-full object-cover"
					/>
				)}
			</div>

			{/* Details */}
			<div className="px-4 py-3">
				<div className="flex items-start justify-between gap-2">
					<div className="flex items-center gap-2 min-w-0">
						{portfolio.type === "personal" && (
							<Lock className="w-3.5 h-3.5 text-outline shrink-0" />
						)}
						<h3 className="text-sm font-semibold text-on-surface truncate">
							{portfolio.name}
						</h3>
					</div>

					{/* Actions menu */}
					{isOwner && (
						<div ref={menuRef} className="relative shrink-0">
							<button
								onClick={(e) => {
									e.stopPropagation();
									setMenuOpen((v) => !v);
								}}
								className="p-1 rounded-md text-on-surface-variant hover:bg-surface-container-high transition-colors"
							>
								<MoreVertical className="w-4 h-4" />
							</button>
							{menuOpen && (
								<div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg py-1 w-40 z-50">
									<button
										onClick={(e) => {
											e.stopPropagation();
											setMenuOpen(false);
											onEdit();
										}}
										className="w-full flex items-center gap-2 px-3 py-2 text-sm text-on-surface hover:bg-surface-container-high transition-colors"
									>
										<Pencil className="w-3.5 h-3.5" />
										Edit
									</button>
								</div>
							)}
						</div>
					)}
				</div>

				{portfolio.description && (
					<p className="text-xs text-outline mt-1 line-clamp-2">
						{portfolio.description}
					</p>
				)}

				{/* Meta row */}
				<div className="flex items-center gap-3 mt-2 text-xs text-outline">
					{!isOwner && (
						<span className="flex items-center gap-1">
							<Users className="w-3 h-3" />
							{portfolio.role}
						</span>
					)}
					{portfolio.memberCount != null && portfolio.memberCount > 1 && (
						<span className="flex items-center gap-1">
							<Users className="w-3 h-3" />
							{portfolio.memberCount} members
						</span>
					)}
				</div>
			</div>
		</div>
	);
}

/* ── Edit Modal ────────────────────────────────────────────────── */

function EditPortfolioModal({
	portfolio,
	onClose,
	onSaved,
}: {
	portfolio: PortfolioWithRole;
	onClose: () => void;
	onSaved: () => void;
}) {
	const [name, setName] = useState(portfolio.name);
	const [description, setDescription] = useState(portfolio.description ?? "");
	const [avatarPreview, setAvatarPreview] = useState(portfolio.avatar ?? "");
	const [avatarFile, setAvatarFile] = useState<File | null>(null);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const fileRef = useRef<HTMLInputElement>(null);

	function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (!file) return;
		setAvatarFile(file);
		setAvatarPreview(URL.createObjectURL(file));
	}

	async function handleSave(e: React.FormEvent) {
		e.preventDefault();
		if (!name.trim()) {
			setError("Name is required");
			return;
		}

		setSaving(true);
		setError(null);

		try {
			// Upload avatar first if changed
			let avatarUrl: string | undefined = portfolio.avatar;
			if (avatarFile) {
				const uploadResult = await PortfolioAPI.uploadAvatar(
					portfolio.id,
					avatarFile,
				);
				if (uploadResult.error) {
					setError(uploadResult.error);
					setSaving(false);
					return;
				}
				avatarUrl = uploadResult.avatar;
			}

			// Build update payload — skip avatar if just uploaded (already saved by upload endpoint)
			const updatePayload: Record<string, unknown> = {
				name: name.trim(),
				description: description.trim() || undefined,
			};
			if (!avatarFile) {
				// Only send avatar in the update if we didn't just upload (upload endpoint already saved it)
				updatePayload.avatar = avatarUrl;
			}

			const updated = await PortfolioAPI.update(
				portfolio.id,
				updatePayload as any,
			);

			if (!updated) {
				setError("Failed to save changes");
				setSaving(false);
				return;
			}

			await onSaved();
		} catch {
			setError("Something went wrong");
		} finally {
			setSaving(false);
		}
	}

	// Close on Escape
	useEffect(() => {
		function onKey(e: KeyboardEvent) {
			if (e.key === "Escape") onClose();
		}
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [onClose]);

	return (
		<>
			{/* Backdrop */}
			<div onClick={onClose} className="fixed inset-0 bg-black/40 z-50" />

			{/* Modal */}
			<div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
				<form
					onSubmit={handleSave}
					onClick={(e) => e.stopPropagation()}
					className="pointer-events-auto w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
				>
					{/* Header */}
					<div className="flex items-center justify-between px-6 py-4 border-b border-border">
						<h2 className="font-headline text-lg font-bold text-on-surface">
							Edit Portfolio
						</h2>
						<button
							type="button"
							onClick={onClose}
							className="p-1.5 rounded-lg hover:bg-surface-container-high text-on-surface-variant transition-colors"
						>
							<X className="w-5 h-5" />
						</button>
					</div>

					{/* Body */}
					<div className="px-6 py-5 space-y-5">
						{/* Avatar */}
						<div>
							<label className="block text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-2">
								Cover image
							</label>
							<div
								onClick={() => fileRef.current?.click()}
								className="relative h-36 rounded-xl overflow-hidden cursor-pointer group border border-border"
							>
								{avatarPreview ? (
									<img
										src={avatarPreview}
										alt=""
										className="w-full h-full object-cover"
									/>
								) : (
									<div className="w-full h-full bg-linear-to-br from-amber-400 via-orange-400 to-pink-400" />
								)}
								<div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
									<Camera className="w-7 h-7 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
								</div>
							</div>
							<input
								ref={fileRef}
								type="file"
								accept="image/jpeg,image/png,image/webp"
								onChange={handleFileChange}
								className="hidden"
							/>
						</div>

						{/* Name */}
						<div>
							<label className="block text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-1.5">
								Name
							</label>
							<input
								type="text"
								value={name}
								onChange={(e) => setName(e.target.value)}
								className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/30"
								placeholder="My Portfolio"
							/>
						</div>

						{/* Description */}
						<div>
							<label className="block text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-1.5">
								Description
							</label>
							<textarea
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								rows={3}
								className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
								placeholder="A brief description of this portfolio"
							/>
						</div>

						{error && (
							<p className="text-sm text-red-600 dark:text-red-400">{error}</p>
						)}
					</div>

					{/* Footer */}
					<div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border">
						<button
							type="button"
							onClick={onClose}
							className="px-4 py-2 rounded-lg text-sm font-medium text-on-surface-variant hover:bg-surface-container-high transition-colors"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={saving || !name.trim()}
							className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
						>
							{saving ? (
								<Loader2 className="w-4 h-4 animate-spin" />
							) : (
								<Check className="w-4 h-4" />
							)}
							Save changes
						</button>
					</div>
				</form>
			</div>
		</>
	);
}
