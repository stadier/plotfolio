"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import {
	forwardRef,
	type AnchorHTMLAttributes,
	type ButtonHTMLAttributes,
} from "react";

const base =
	"bg-blue-600 hover:bg-blue-700 text-white font-headline font-bold text-xs uppercase tracking-widest py-2.5 px-4 rounded-md shadow-lg active:scale-95 transition-all flex items-center gap-2 btn-press disabled:opacity-50 disabled:cursor-not-allowed";

/* ── Button variant ─────────────────────────────────────── */

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
	href?: undefined;
};

/* ── Link variant ───────────────────────────────────────── */

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
	href: string;
};

export type PrimaryButtonProps = (ButtonProps | LinkProps) & {
	className?: string;
};

const PrimaryButton = forwardRef<
	HTMLButtonElement | HTMLAnchorElement,
	PrimaryButtonProps
>(function PrimaryButton({ className, href, ...rest }, ref) {
	if (href !== undefined) {
		const { ...linkRest } = rest as Omit<LinkProps, "href">;
		return (
			<Link
				ref={ref as React.Ref<HTMLAnchorElement>}
				href={href}
				className={cn(base, className)}
				{...linkRest}
			/>
		);
	}

	const { type = "button", ...btnRest } = rest as ButtonProps;
	return (
		<button
			ref={ref as React.Ref<HTMLButtonElement>}
			type={type}
			className={cn(base, className)}
			{...btnRest}
		/>
	);
});

export default PrimaryButton;
