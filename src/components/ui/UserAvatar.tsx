"use client";

import { User } from "lucide-react";
import Link from "next/link";

/* ─── size presets ────────────────────────────────────────────── */

const SIZES = {
	xs: { px: 20, img: "w-5 h-5", icon: "w-3 h-3", text: "text-[8px]" },
	sm: { px: 24, img: "w-6 h-6", icon: "w-3 h-3", text: "text-[9px]" },
	md: { px: 32, img: "w-8 h-8", icon: "w-4 h-4", text: "text-xs" },
	lg: { px: 40, img: "w-10 h-10", icon: "w-4 h-4", text: "text-sm" },
} as const;

type AvatarSize = keyof typeof SIZES;

/* ─── label layout ────────────────────────────────────────────── */

const LABEL_SIZES = {
	xs: { name: "text-xs", username: "text-[10px]" },
	sm: { name: "text-xs", username: "text-[10px]" },
	md: { name: "text-xs font-medium", username: "text-[10px]" },
	lg: { name: "text-sm font-medium", username: "text-xs" },
} as const;

/* ─── component ───────────────────────────────────────────────── */

interface UserAvatarProps {
	/** Full name (used for initial fallback) */
	name: string;
	/** Friendly display name shown in labels */
	displayName?: string;
	/** @handle */
	username?: string;
	/** Avatar image URL */
	avatar?: string;
	/** Owner id — used for the profile link */
	ownerId?: string;
	/** Preset size */
	size?: AvatarSize;
	/** Show name + username beside the avatar */
	showLabel?: boolean;
	/** Extra classes on the outer wrapper */
	className?: string;
}

export default function UserAvatar({
	name,
	displayName,
	username,
	avatar,
	ownerId,
	size = "md",
	showLabel = false,
	className = "",
}: UserAvatarProps) {
	const s = SIZES[size];
	const label = LABEL_SIZES[size];
	const initial = (displayName || name || "?").charAt(0).toUpperCase();

	const avatarCircle = avatar ? (
		/* eslint-disable-next-line @next/next/no-img-element */
		<img
			src={avatar}
			alt={displayName || name}
			width={s.px}
			height={s.px}
			className={`${s.img} rounded-full shrink-0 object-cover`}
		/>
	) : (
		<div
			className={`${s.img} rounded-full shrink-0 signature-gradient flex items-center justify-center`}
		>
			{size === "xs" || size === "sm" ? (
				<User className={`${s.icon} text-white`} />
			) : (
				<span className={`${s.text} font-medium text-white`}>{initial}</span>
			)}
		</div>
	);

	const labelBlock = showLabel ? (
		<div className="min-w-0 leading-tight">
			<p className={`${label.name} text-on-surface truncate`}>
				{displayName || name}
			</p>
			{username && (
				<p className={`${label.username} text-on-surface-variant truncate`}>
					@{username}
				</p>
			)}
		</div>
	) : null;

	const content = (
		<div className={`flex items-center gap-2 ${className}`}>
			{avatarCircle}
			{labelBlock}
		</div>
	);

	if (ownerId) {
		return (
			<Link
				href={`/profile/${ownerId}`}
				className="hover:opacity-80 transition-opacity"
				onClick={(e) => e.stopPropagation()}
			>
				{content}
			</Link>
		);
	}

	return content;
}
