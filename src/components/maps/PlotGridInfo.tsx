import { Info, X } from "lucide-react";
import { useState } from "react";

interface PlotGridInfoProps {
	className?: string;
}

export default function PlotGridInfo({ className = "" }: PlotGridInfoProps) {
	const [isVisible, setIsVisible] = useState(true);

	if (!isVisible) {
		return (
			<button
				onClick={() => setIsVisible(true)}
				className={`absolute bottom-4 left-4 bg-white rounded-full p-2 shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors ${className}`}
				style={{ zIndex: 1000 }}
				title="Show grid info"
			>
				<Info className="w-4 h-4 text-gray-600" />
			</button>
		);
	}

	return (
		<div
			className={`absolute bottom-4 left-4 bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-xs ${className}`}
			style={{ zIndex: 1000 }}
		>
			<div className="flex items-start justify-between mb-2">
				<div className="flex items-center gap-2">
					<div className="w-3 h-3 bg-green-600 rounded-sm"></div>
					<h3 className="text-sm font-semibold text-gray-900">Plot Grid</h3>
				</div>
				<button
					onClick={() => setIsVisible(false)}
					className="p-1 hover:bg-gray-100 rounded"
				>
					<X className="w-3 h-3 text-gray-400" />
				</button>
			</div>

			<div className="text-xs text-gray-600 space-y-1">
				<p>• Each grid cell ≈ 900 sqm (30m × 30m)</p>
				<p>• Typical Nigerian residential plots: 600-1000 sqm</p>
				<p>• Grid appears at zoom level 13+</p>
				<p>
					• Use <span className="font-mono bg-gray-100 px-1 rounded">⊞</span>{" "}
					for optimal plot view
				</p>
			</div>
		</div>
	);
}
