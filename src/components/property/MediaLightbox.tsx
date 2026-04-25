"use client";

import UnifiedMediaViewer from "@/components/ui/UnifiedMediaViewer";
import { MediaType, type PropertyMedia } from "@/types/property";

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

	const mimeType =
		item.type === MediaType.VIDEO
			? "video/mp4"
			: item.type === MediaType.AUDIO
				? "audio/mpeg"
				: "image/jpeg";

	const mediaName = item.caption?.trim() || name;

	return (
		<UnifiedMediaViewer
			source={{
				url: item.url,
				name: mediaName,
				mimeType,
			}}
			subtitle={`${currentIndex + 1} of ${media.length}`}
			hasPrev={currentIndex > 0}
			hasNext={currentIndex < media.length - 1}
			onPrev={onPrev}
			onNext={onNext}
			onClose={onClose}
		/>
	);
}
