"use client";

import { useAuth, useRequireAuth } from "@/components/AuthContext";
import { usePortfolio } from "@/components/PortfolioContext";
import AppShell from "@/components/layout/AppShell";
import BackButton from "@/components/ui/BackButton";
import { PortfolioAPI, type PortfolioMemberWithUser } from "@/lib/api";
import { PortfolioMemberStatus, PortfolioRole } from "@/types/property";
import {
	Check,
	ChevronDown,
	Crown,
	Loader2,
	MoreVertical,
	Shield,
	Trash2,
	UserPlus,
	Users,
	X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

/* ── Role metadata ─────────────────────────────────────────────────────────── */

const ROLE_META: Record<
	PortfolioRole,
	{ label: string; description: string; color: string; icon: typeof Crown }
> = {
	[PortfolioRole.ADMIN]: {
		label: "Admin",
		description: "Full access — manage team, properties, settings",
		color: "text-amber-600 dark:text-amber-400",
		icon: Crown,
	},
	[PortfolioRole.MANAGER]: {
		label: "Manager",
		description: "Edit properties, upload docs, manage bookings",
		color: "text-blue-600 dark:text-blue-400",
		icon: Shield,
	},
	[PortfolioRole.AGENT]: {
		label: "Agent",
		description: "Respond to inquiries, view schedules",
		color: "text-green-600 dark:text-green-400",
		icon: Users,
	},
	[PortfolioRole.VIEWER]: {
		label: "Viewer",
		description: "Read-only access to portfolio",
		color: "text-on-surface-variant",
		icon: Users,
	},
};

const ASSIGNABLE_ROLES = [
	PortfolioRole.MANAGER,
	PortfolioRole.AGENT,
	PortfolioRole.VIEWER,
] as const;

/* ── Main page ─────────────────────────────────────────────────────────────── */

export default function TeamPage() {
	const { loading: authLoading } = useRequireAuth();
	const { user } = useAuth();
	const { activePortfolio } = usePortfolio();

	const [members, setMembers] = useState<PortfolioMemberWithUser[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const isAdmin = activePortfolio?.role === PortfolioRole.ADMIN;

	const fetchMembers = useCallback(async () => {
		if (!activePortfolio) return;
		setLoading(true);
		const data = await PortfolioAPI.getMembers(activePortfolio.id);
		setMembers(data);
		setLoading(false);
	}, [activePortfolio]);

	useEffect(() => {
		fetchMembers();
	}, [fetchMembers]);

	if (authLoading || !user) {
		return (
			<AppShell>
				<div className="flex items-center justify-center h-[60vh]">
					<Loader2 className="w-6 h-6 animate-spin text-primary" />
				</div>
			</AppShell>
		);
	}

	if (!activePortfolio) {
		return (
			<AppShell>
				<div className="flex items-center justify-center h-[60vh]">
					<p className="text-on-surface-variant text-sm">
						No portfolio selected.
					</p>
				</div>
			</AppShell>
		);
	}

	const activeMembers = members.filter(
		(m) => m.status === PortfolioMemberStatus.ACTIVE,
	);
	const pendingMembers = members.filter(
		(m) => m.status === PortfolioMemberStatus.PENDING,
	);

	return (
		<AppShell>
			{/* Header */}
			<div className="bg-background border-b border-border px-8 py-4 sticky top-0 z-10">
				<div className="flex items-center gap-3">
					<BackButton fallbackHref="/portfolio" label="Dashboard" />
					<span className="text-outline">/</span>
					<h1 className="font-headline text-lg font-bold text-on-surface">
						Team
					</h1>
				</div>
			</div>

			{/* Body */}
			<div className="px-8 pt-8 pb-16 max-w-3xl">
				{/* Portfolio name + member count */}
				<div className="flex items-start justify-between mb-8">
					<div>
						<h2 className="font-headline text-2xl font-bold text-primary mb-1">
							{activePortfolio.name}
						</h2>
						<p className="text-sm text-on-surface-variant">
							{members.length} member{members.length !== 1 && "s"} ·{" "}
							{activePortfolio.type} portfolio
						</p>
					</div>
				</div>

				{/* Invite section (admin only) */}
				{isAdmin && (
					<InviteSection
						portfolioId={activePortfolio.id}
						onInvited={fetchMembers}
					/>
				)}

				{/* Loading */}
				{loading && (
					<div className="flex items-center justify-center py-16">
						<Loader2 className="w-5 h-5 animate-spin text-primary" />
					</div>
				)}

				{/* Pending invites */}
				{!loading && pendingMembers.length > 0 && (
					<div className="mb-8">
						<h3 className="font-headline text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-3">
							Pending Invites
						</h3>
						<div className="space-y-2">
							{pendingMembers.map((m) => (
								<MemberRow
									key={m.id}
									member={m}
									isAdmin={isAdmin}
									isSelf={m.userId === user.id}
									portfolioId={activePortfolio.id}
									onUpdated={fetchMembers}
									onError={setError}
								/>
							))}
						</div>
					</div>
				)}

				{/* Active members */}
				{!loading && activeMembers.length > 0 && (
					<div>
						<h3 className="font-headline text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-3">
							Members
						</h3>
						<div className="space-y-2">
							{activeMembers.map((m) => (
								<MemberRow
									key={m.id}
									member={m}
									isAdmin={isAdmin}
									isSelf={m.userId === user.id}
									portfolioId={activePortfolio.id}
									onUpdated={fetchMembers}
									onError={setError}
								/>
							))}
						</div>
					</div>
				)}

				{/* Error toast */}
				{error && (
					<div className="fixed bottom-6 right-6 bg-red-600 text-white text-sm px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 z-50 animate-fade-in">
						{error}
						<button onClick={() => setError(null)}>
							<X className="w-4 h-4" />
						</button>
					</div>
				)}
			</div>
		</AppShell>
	);
}

/* ── Invite Section ────────────────────────────────────────────────────────── */

function InviteSection({
	portfolioId,
	onInvited,
}: {
	portfolioId: string;
	onInvited: () => void;
}) {
	const [identifier, setIdentifier] = useState("");
	const [role, setRole] = useState<PortfolioRole>(PortfolioRole.AGENT);
	const [sending, setSending] = useState(false);
	const [feedback, setFeedback] = useState<{
		type: "success" | "error";
		message: string;
	} | null>(null);

	async function handleInvite(e: React.FormEvent) {
		e.preventDefault();
		if (!identifier.trim()) return;

		setSending(true);
		setFeedback(null);

		const { member, error } = await PortfolioAPI.inviteMember(portfolioId, {
			identifier: identifier.trim(),
			role,
		});

		if (error) {
			setFeedback({ type: "error", message: error });
		} else {
			const name = member?.user?.displayName || identifier.trim();
			setFeedback({
				type: "success",
				message: `Invite sent to ${name}`,
			});
			setIdentifier("");
			onInvited();
		}
		setSending(false);
	}

	return (
		<div className="mb-8 p-5 bg-card border border-border rounded-xl">
			<div className="flex items-center gap-2 mb-4">
				<UserPlus className="w-4 h-4 text-secondary" />
				<h3 className="font-headline text-sm font-bold text-on-surface">
					Invite a team member
				</h3>
			</div>

			<form onSubmit={handleInvite} className="flex flex-wrap gap-3">
				{/* Email / Username input */}
				<input
					type="text"
					value={identifier}
					onChange={(e) => {
						setIdentifier(e.target.value);
						setFeedback(null);
					}}
					placeholder="Email or username"
					className="flex-1 min-w-[200px] px-4 py-2.5 rounded-lg border border-border bg-card text-on-surface placeholder:text-outline text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
				/>

				{/* Role picker */}
				<select
					value={role}
					onChange={(e) => setRole(e.target.value as PortfolioRole)}
					className="px-3 py-2.5 rounded-lg border border-border bg-card text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
				>
					{ASSIGNABLE_ROLES.map((r) => (
						<option key={r} value={r}>
							{ROLE_META[r].label}
						</option>
					))}
				</select>

				{/* Submit */}
				<button
					type="submit"
					disabled={sending || !identifier.trim()}
					className="signature-gradient text-white font-headline font-bold text-xs uppercase tracking-widest px-5 py-2.5 rounded-lg shadow active:scale-95 transition-all flex items-center gap-2 btn-press disabled:opacity-50 disabled:pointer-events-none"
				>
					{sending ? (
						<Loader2 className="w-4 h-4 animate-spin" />
					) : (
						<UserPlus className="w-4 h-4" />
					)}
					Invite
				</button>
			</form>

			{/* Feedback */}
			{feedback && (
				<p
					className={`mt-3 text-sm ${
						feedback.type === "success"
							? "text-green-600 dark:text-green-400"
							: "text-red-600 dark:text-red-400"
					}`}
				>
					{feedback.message}
				</p>
			)}
		</div>
	);
}

/* ── Member Row ────────────────────────────────────────────────────────────── */

function MemberRow({
	member,
	isAdmin,
	isSelf,
	portfolioId,
	onUpdated,
	onError,
}: {
	member: PortfolioMemberWithUser;
	isAdmin: boolean;
	isSelf: boolean;
	portfolioId: string;
	onUpdated: () => void;
	onError: (msg: string) => void;
}) {
	const [menuOpen, setMenuOpen] = useState(false);
	const [rolePickerOpen, setRolePickerOpen] = useState(false);
	const [busy, setBusy] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);

	const meta = ROLE_META[member.role as PortfolioRole] ?? ROLE_META.viewer;
	const RoleIcon = meta.icon;
	const isPending = member.status === PortfolioMemberStatus.PENDING;

	// Close menu on outside click
	useEffect(() => {
		function handleClick(e: MouseEvent) {
			if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
				setMenuOpen(false);
				setRolePickerOpen(false);
			}
		}
		if (menuOpen) {
			document.addEventListener("mousedown", handleClick);
			return () => document.removeEventListener("mousedown", handleClick);
		}
	}, [menuOpen]);

	async function handleChangeRole(newRole: PortfolioRole) {
		setBusy(true);
		const { error } = await PortfolioAPI.updateMember(portfolioId, member.id, {
			role: newRole,
		});
		if (error) onError(error);
		else onUpdated();
		setBusy(false);
		setMenuOpen(false);
		setRolePickerOpen(false);
	}

	async function handleAcceptInvite() {
		setBusy(true);
		const { error } = await PortfolioAPI.updateMember(portfolioId, member.id, {
			status: PortfolioMemberStatus.ACTIVE,
		});
		if (error) onError(error);
		else onUpdated();
		setBusy(false);
	}

	async function handleRemove() {
		if (
			!confirm(
				isSelf
					? "Leave this portfolio?"
					: `Remove ${member.user?.displayName || "this member"}?`,
			)
		)
			return;

		setBusy(true);
		const { error } = await PortfolioAPI.removeMember(portfolioId, member.id);
		if (error) onError(error);
		else onUpdated();
		setBusy(false);
		setMenuOpen(false);
	}

	return (
		<div
			className={`flex items-center gap-3 p-3 rounded-lg border border-border bg-card transition-colors ${
				isPending ? "opacity-70" : ""
			}`}
		>
			{/* Avatar */}
			{member.user?.avatar ? (
				<img
					src={member.user.avatar}
					alt=""
					className="w-9 h-9 rounded-full object-cover shrink-0"
				/>
			) : (
				<span className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
					{(member.user?.name ?? "?").charAt(0).toUpperCase()}
				</span>
			)}

			{/* Name + role */}
			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-2">
					<p className="text-sm font-semibold text-on-surface truncate">
						{member.user?.displayName ?? member.user?.email ?? "Unknown"}
					</p>
					{isSelf && (
						<span className="text-[10px] font-bold text-on-surface-variant bg-surface-container-high px-1.5 py-0.5 rounded-full">
							You
						</span>
					)}
					{isPending && (
						<span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded-full">
							Pending
						</span>
					)}
				</div>
				<div className="flex items-center gap-1.5 mt-0.5">
					<RoleIcon className={`w-3 h-3 ${meta.color}`} />
					<span className={`text-xs ${meta.color} font-medium`}>
						{meta.label}
					</span>
					{member.user?.username && (
						<span className="text-xs text-outline">
							@{member.user.username}
						</span>
					)}
				</div>
			</div>

			{/* Accept button for own pending invites */}
			{isPending && isSelf && (
				<button
					onClick={handleAcceptInvite}
					disabled={busy}
					className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-green-600 text-white text-xs font-bold hover:bg-green-700 transition-colors disabled:opacity-50"
				>
					{busy ? (
						<Loader2 className="w-3 h-3 animate-spin" />
					) : (
						<Check className="w-3 h-3" />
					)}
					Accept
				</button>
			)}

			{/* Menu for admin actions or self-leave */}
			{(isAdmin || isSelf) && !busy && (
				<div ref={menuRef} className="relative">
					<button
						onClick={() => setMenuOpen((prev) => !prev)}
						className="p-1.5 rounded-md hover:bg-surface-container-high transition-colors text-on-surface-variant"
					>
						<MoreVertical className="w-4 h-4" />
					</button>

					{menuOpen && (
						<div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg py-1 w-52 z-50">
							{/* Role picker (admin only, not for self) */}
							{isAdmin && !isSelf && (
								<div>
									<button
										onClick={() => setRolePickerOpen((p) => !p)}
										className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-on-surface hover:bg-surface-container-high transition-colors"
									>
										<span>Change role</span>
										<ChevronDown
											className={`w-3.5 h-3.5 transition-transform ${
												rolePickerOpen ? "rotate-180" : ""
											}`}
										/>
									</button>
									{rolePickerOpen && (
										<div className="border-t border-border py-1">
											{(
												[
													PortfolioRole.ADMIN,
													...ASSIGNABLE_ROLES,
												] as PortfolioRole[]
											).map((r) => {
												const rm = ROLE_META[r];
												const Icon = rm.icon;
												return (
													<button
														key={r}
														onClick={() => handleChangeRole(r)}
														className={`w-full flex items-center gap-2.5 px-4 py-2 text-left hover:bg-surface-container-high transition-colors ${
															r === member.role
																? "bg-surface-container-high"
																: ""
														}`}
													>
														<Icon className={`w-3.5 h-3.5 ${rm.color}`} />
														<div className="flex-1 min-w-0">
															<p className="text-sm font-medium text-on-surface">
																{rm.label}
															</p>
															<p className="text-[10px] text-on-surface-variant">
																{rm.description}
															</p>
														</div>
														{r === member.role && (
															<Check className="w-3.5 h-3.5 text-secondary shrink-0" />
														)}
													</button>
												);
											})}
										</div>
									)}
								</div>
							)}

							{/* Remove / Leave */}
							<button
								onClick={handleRemove}
								className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
							>
								<Trash2 className="w-3.5 h-3.5" />
								{isSelf ? "Leave portfolio" : "Remove member"}
							</button>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
