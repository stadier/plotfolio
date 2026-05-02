"use client";

import { cn } from "@/lib/utils";
import Image, { type ImageProps } from "next/image";
import { useState } from "react";

/**
 * <ImageWithSkeleton>
 *
 * Drop-in wrapper around `next/image` that shows a shimmering skeleton until
 * the image fires `onLoad`. Designed for property/marketplace card images,
 * avatars, and gallery thumbnails so loading feels intentional rather than a
 * blank box.
 *
 * Usage:
 *   <div className="relative w-full aspect-4/3">
 *     <ImageWithSkeleton src={url} alt="..." fill />
 *   </div>
 */
export default function ImageWithSkeleton({
	className,
	onLoad,
	...rest
}: ImageProps) {
	const [loaded, setLoaded] = useState(false);

	return (
		<>
			{!loaded && (
				<div
					aria-hidden="true"
					className="skeleton absolute inset-0 w-full h-full"
				/>
			)}
			<Image
				{...rest}
				className={cn(
					"transition-opacity duration-300",
					loaded ? "opacity-100" : "opacity-0",
					className,
				)}
				onLoad={(e) => {
					setLoaded(true);
					onLoad?.(e);
				}}
			/>
		</>
	);
}
