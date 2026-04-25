"use client";

import { AdvancedMarker, APIProvider, Map } from "@vis.gl/react-google-maps";

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

interface GoogleLocationPreviewMapProps {
	lat: number;
	lng: number;
	onClick?: () => void;
}

export default function GoogleLocationPreviewMap({
	lat,
	lng,
	onClick,
}: GoogleLocationPreviewMapProps) {
	if (!GOOGLE_MAPS_API_KEY) {
		return (
			<div
				onClick={onClick}
				className="relative w-full h-full rounded-md overflow-hidden cursor-pointer bg-surface-container flex items-center justify-center"
			>
				<p className="text-xs text-outline">
					Google Maps key is not configured
				</p>
			</div>
		);
	}

	return (
		<div
			onClick={onClick}
			className="relative w-full h-full rounded-md overflow-hidden cursor-pointer"
		>
			<APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
				<Map
					mapId="plotfolio-location-preview"
					center={{ lat, lng }}
					zoom={14}
					gestureHandling="none"
					disableDefaultUI={true}
					draggable={false}
					scrollwheel={false}
					disableDoubleClickZoom={true}
					keyboardShortcuts={false}
					clickableIcons={false}
					style={{ width: "100%", height: "100%" }}
				>
					<AdvancedMarker position={{ lat, lng }} />
				</Map>
			</APIProvider>
		</div>
	);
}
