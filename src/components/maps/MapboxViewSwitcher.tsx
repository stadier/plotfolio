"use client";

import { Globe, Map as MapIcon, Mountain, Satellite } from "lucide-react";

export type MapViewMode = "standard" | "satellite" | "terrain" | "hybrid";

interface MapboxViewSwitcherProps {
	currentView: MapViewMode;
	onViewChange: (view: MapViewMode) => void;
	className?: string;
}

const MAPBOX_VIEWS = [
	{
		type: "standard" as MapViewMode,
		label: "Streets",
		icon: MapIcon,
		description: "Standard street map",
	},
	{
		type: "satellite" as MapViewMode,
		label: "Satellite",
		icon: Satellite,
		description: "Satellite imagery",
	},
	{
		type: "terrain" as MapViewMode,
		label: "Terrain",
		icon: Mountain,
		description: "Outdoor/terrain map",
	},
	{
		type: "hybrid" as MapViewMode,
		label: "Hybrid",
		icon: Globe,
		description: "Satellite with streets",
	},
];

export default function MapboxViewSwitcher({
	currentView,
	onViewChange,
	className = "",
}: MapboxViewSwitcherProps) {
	return (
		<div
			className={`bg-white rounded-lg shadow-lg border border-gray-200 ${className}`}
		>
			<div className="p-2">
				<div className="text-xs font-semibold text-gray-700 px-2 py-1 mb-1">
					Map Style
				</div>
				<div className="grid grid-cols-2 gap-1">
					{MAPBOX_VIEWS.map((view) => {
						const Icon = view.icon;
						const isActive = currentView === view.type;
						return (
							<button
								key={view.type}
								onClick={() => onViewChange(view.type)}
								className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
									isActive
										? "bg-blue-100 text-blue-700 border-2 border-blue-500"
										: "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200"
								}`}
								title={view.description}
							>
								<Icon className="w-4 h-4" />
								<span className="text-xs font-medium">{view.label}</span>
							</button>
						);
					})}
				</div>
			</div>
		</div>
	);
}
