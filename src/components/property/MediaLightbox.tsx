"use client";

import { MediaType, type PropertyMedia } from "@/types/property";
import { Mic } from "lucide-react";
import Image from "next/image";

interface MediaLightboxProps {
	media: PropertyMedia[];
	currentIndex: number;
	name: string;
	onClose: () => void;
	onPrev: () => void;
	onNext: () => void;
}

export default function MediaLightbox({
	media,
	currentIndex,
	name,
	onClose,
	onPrev,
	onNext,
}: MediaLightboxProps) {
	const item = media[currentIndex];
	if (!item) return null;

	return (
		<div
			className="fixed inset-0 z-1000 bg-black/80 flex items-center justify-center p-8"
			onClick={onClose}
		>
			<div
				className="relative max-w-4xl max-h-[80vh] w-full h-full"
				onClick={(e) => e.stopPropagation()}
			>
				{item.type === MediaType.VIDEO ? (
					<video
						src={item.url}
						controls
						autoPlay
						className="w-full h-full object-contain"
					/>
				) : item.type === MediaType.AUDIO ? (
					<div className="w-full h-full flex flex-col items-center justify-center text-white gap-4">
						<Mic className="w-16 h-16" />
						<p className="text-lg">{item.caption ?? "Audio Track"}</p>
						<audio
							src={item.url}
							controls
							autoPlay
							className="w-full max-w-lg"
						/>
					</div>
				) : (
					<Image
						src={item.url}
						alt={name}
						fill
						className="object-contain"
						sizes="90vw"
					/>
				)}
			</div>
			<button
				type="button"
				className="absolute top-6 right-6 text-white/80 hover:text-white text-2xl"
				onClick={onClose}
			>
				✕
			</button>
			{currentIndex > 0 && (
				<button
					type="button"
					className="absolute left-6 top-1/2 -translate-y-1/2 text-white/80 hover:text-white text-3xl"
					onClick={(e) => {
						e.stopPropagation();
						onPrev();
					}}
				>
					‹
				</button>
			)}
			{currentIndex < media.length - 1 && (
				<button
					type="button"
					className="absolute right-6 top-1/2 -translate-y-1/2 text-white/80 hover:text-white text-3xl"
					onClick={(e) => {
						e.stopPropagation();
						onNext();
					}}
				>
					›
				</button>
			)}
		</div>
	);
}
