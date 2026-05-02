import { cn } from "@/lib/utils";

type Shape = "rect" | "text" | "circle" | "card" | "pill";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
	/**
	 * Visual shape — drives the default border radius.
	 * - `rect`   (default): rounded-md, suits inputs / inline blocks
	 * - `text`            : rounded-sm, suits text-line placeholders
	 * - `circle`          : rounded-full, avatars / dots
	 * - `card`            : rounded-xl, card bodies / large blocks
	 * - `pill`            : rounded-full, badges / chips
	 */
	shape?: Shape;
}

const shapeClass: Record<Shape, string> = {
	rect: "rounded-md",
	text: "rounded-sm",
	circle: "rounded-full",
	card: "rounded-xl",
	pill: "rounded-full",
};

/**
 * Base skeleton primitive. Uses the shimmering `.skeleton` class defined in
 * globals.css so dark/light mode inherit semantic surface tokens automatically.
 *
 * Compose this primitive into domain skeletons (PropertyCardSkeleton, etc.)
 * rather than recreating loading placeholders inline.
 */
export default function Skeleton({
	shape = "rect",
	className,
	...rest
}: SkeletonProps) {
	return (
		<div
			aria-hidden="true"
			className={cn("skeleton block", shapeClass[shape], className)}
			{...rest}
		/>
	);
}

/** Common helper for a single line of placeholder text. */
export function SkeletonText({
	className,
	width = "w-full",
}: {
	className?: string;
	width?: string;
}) {
	return <Skeleton shape="text" className={cn("h-3", width, className)} />;
}

/** Convenience: stacked text lines (e.g. paragraph placeholder). */
export function SkeletonLines({
	count = 3,
	className,
}: {
	count?: number;
	className?: string;
}) {
	return (
		<div className={cn("space-y-2", className)}>
			{Array.from({ length: count }).map((_, i) => (
				<SkeletonText key={i} width={i === count - 1 ? "w-2/3" : "w-full"} />
			))}
		</div>
	);
}
