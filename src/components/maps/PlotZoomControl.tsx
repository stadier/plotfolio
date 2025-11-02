import { Grid3X3, ZoomIn, ZoomOut } from "lucide-react";
import { useEffect } from "react";
import { useMap } from "react-leaflet";

interface PlotZoomControlProps {
	minZoom?: number;
	maxZoom?: number;
	plotViewZoom?: number;
	onGridToggle?: () => void;
	showGrid?: boolean;
	className?: string;
}

export default function PlotZoomControl({
	minZoom = 12,
	maxZoom = 19,
	plotViewZoom = 16,
	onGridToggle,
	showGrid = false,
	className = "",
}: PlotZoomControlProps) {
	const map = useMap();

	useEffect(() => {
		// Set zoom limits
		map.setMinZoom(minZoom);
		map.setMaxZoom(maxZoom);
	}, [map, minZoom, maxZoom]);

	const handleZoomIn = () => {
		const currentZoom = map.getZoom();
		if (currentZoom < maxZoom) {
			map.setZoom(currentZoom + 1);
		}
	};

	const handleZoomOut = () => {
		const currentZoom = map.getZoom();
		if (currentZoom > minZoom) {
			map.setZoom(currentZoom - 1);
		}
	};

	const handlePlotView = () => {
		map.setZoom(plotViewZoom);
	};

	const handleGridToggle = () => {
		if (onGridToggle) {
			onGridToggle();
		}
	};

	return (
		<div
			className={`absolute top-4 left-4 flex flex-col gap-2 ${className}`}
			style={{ zIndex: 1000 }}
		>
			<div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
				<button
					onClick={handleZoomIn}
					className="flex items-center justify-center w-10 h-10 hover:bg-gray-100 transition-colors border-b border-gray-200"
					title="Zoom In"
				>
					<ZoomIn className="w-4 h-4 text-gray-600" />
				</button>

				<button
					onClick={handleGridToggle}
					className={`flex items-center justify-center w-10 h-10 transition-colors border-b border-gray-200 ${
						showGrid ? "bg-green-50 hover:bg-green-100" : "hover:bg-gray-100"
					}`}
					title={showGrid ? "Hide Grid" : "Show Grid"}
				>
					<Grid3X3
						className={`w-4 h-4 ${
							showGrid ? "text-green-600" : "text-gray-600"
						}`}
					/>
				</button>

				<button
					onClick={handleZoomOut}
					className="flex items-center justify-center w-10 h-10 hover:bg-gray-100 transition-colors"
					title="Zoom Out"
				>
					<ZoomOut className="w-4 h-4 text-gray-600" />
				</button>
			</div>

			{/* Zoom Level Indicator */}
			<div className="bg-white rounded-lg shadow-lg border border-gray-200 px-3 py-2">
				<div className="text-xs text-gray-600 text-center">Plot Level</div>
				<div className="text-xs font-mono text-gray-800 text-center">
					Z{Math.round(map.getZoom())}
				</div>
			</div>
		</div>
	);
}
