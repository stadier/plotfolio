"use client";

import { Property, PropertyStatus, PropertyType } from "@/types/property";
import { MapPin, Search } from "lucide-react";
import { useState } from "react";

interface MapPropertySidebarProps {
	properties: Property[];
	selectedPropertyId: string | null;
	onPropertySelect: (property: Property) => void;
	searchQuery: string;
	onSearch: (query: string) => void;
}

function getStatusDot(status: PropertyStatus): string {
	switch (status) {
		case PropertyStatus.OWNED:
			return "bg-green-500";
		case PropertyStatus.FOR_SALE:
			return "bg-blue-500";
		case PropertyStatus.DEVELOPMENT:
			return "bg-yellow-500";
		case PropertyStatus.UNDER_CONTRACT:
			return "bg-orange-500";
		case PropertyStatus.RENTED:
			return "bg-purple-500";
		default:
			return "bg-outline";
	}
}

function getPropertyTypeLabel(type: PropertyType): string {
	switch (type) {
		case PropertyType.RESIDENTIAL:
			return "Residential";
		case PropertyType.COMMERCIAL:
			return "Commercial";
		case PropertyType.INDUSTRIAL:
			return "Industrial";
		case PropertyType.AGRICULTURAL:
			return "Agricultural";
		case PropertyType.VACANT_LAND:
			return "Vacant Land";
		case PropertyType.MIXED_USE:
			return "Mixed Use";
		default:
			return type;
	}
}

function formatArea(area: number): string {
	if (area >= 10000) {
		return `${(area / 10000).toFixed(1)} ha`;
	}
	return `${area.toLocaleString()} m²`;
}

export default function MapPropertySidebar({
	properties,
	selectedPropertyId,
	onPropertySelect,
	searchQuery,
	onSearch,
}: MapPropertySidebarProps) {
	const [statusFilter, setStatusFilter] = useState<PropertyStatus | "all">(
		"all",
	);

	const filtered =
		statusFilter === "all"
			? properties
			: properties.filter((p) => p.status === statusFilter);

	return (
		<div className="h-full flex flex-col bg-card border-r border-border m-2 mx-1">
			{/* Header */}
			<div className="shrink-0 px-4 pt-4 pb-3">
				<h2 className="text-lg font-semibold text-on-surface mb-3">
					Properties
				</h2>

				{/* Search */}
				<div className="relative mb-3">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
					<input
						type="text"
						value={searchQuery}
						onChange={(e) => onSearch(e.target.value)}
						placeholder="Search properties..."
						className="w-full pl-9 pr-3 py-2 text-sm bg-card border border-border rounded-4xl text-on-surface placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-primary/40"
					/>
				</div>

				{/* Status filter pills */}
				<div className="flex items-center gap-2 overflow-x-auto pt-1 text-xs pb-5">
					<button
						onClick={() => setStatusFilter("all")}
						className={`shrink-0 px-2.5 py-1 rounded-full transition-colors ${
							statusFilter === "all"
								? "bg-primary text-white"
								: "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"
						}`}
					>
						All
					</button>
					{Object.values(PropertyStatus).map((s) => (
						<button
							key={s}
							onClick={() => setStatusFilter(s)}
							className={`shrink-0 px-2.5 py-1 rounded-full capitalize transition-colors ${
								statusFilter === s
									? "bg-primary text-white"
									: "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"
							}`}
						>
							{s.replace("_", " ")}
						</button>
					))}
				</div>
			</div>

			{/* Property count */}
			<div className="shrink-0 px-4 py-2 text-xs text-outline border-b border-border">
				{filtered.length} {filtered.length === 1 ? "property" : "properties"}
			</div>

			{/* Scrollable list */}
			<div className="flex-1 overflow-y-auto">
				{filtered.length === 0 ? (
					<div className="p-6 text-center text-on-surface-variant text-sm">
						No properties found.
					</div>
				) : (
					filtered.map((property) => {
						const isSelected = property.id === selectedPropertyId;
						const thumb =
							property.media?.[0]?.thumbnail ||
							property.media?.[0]?.url ||
							property.images?.[0];

						return (
							<button
								key={property.id}
								onClick={() => onPropertySelect(property)}
								className={`w-full text-left px-4 py-3 border-b border-border transition-colors ${
									isSelected
										? "bg-nav-active"
										: "hover:bg-surface-container-high"
								}`}
							>
								<div className="flex gap-3">
									{/* Thumbnail */}
									<div className="shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-surface-container-highest">
										{thumb ? (
											<img
												src={thumb}
												alt=""
												className="w-full h-full object-cover"
											/>
										) : (
											<div className="w-full h-full flex items-center justify-center">
												<MapPin className="w-5 h-5 text-outline" />
											</div>
										)}
									</div>

									{/* Info */}
									<div className="min-w-0 flex-1">
										<div className="flex items-center gap-2">
											<span className="text-sm font-medium text-on-surface truncate">
												{property.name}
											</span>
											<span
												className={`shrink-0 w-2 h-2 rounded-full ${getStatusDot(property.status)}`}
												title={property.status}
											/>
										</div>
										<p className="text-xs text-on-surface-variant truncate mt-0.5">
											{property.address}
										</p>
										<div className="flex items-center gap-2 mt-1 text-xs text-outline">
											<span>{getPropertyTypeLabel(property.propertyType)}</span>
											<span>·</span>
											<span>{formatArea(property.area)}</span>
											{property.currentValue != null && (
												<>
													<span>·</span>
													<span className="text-secondary font-medium">
														${property.currentValue.toLocaleString()}
													</span>
												</>
											)}
										</div>
									</div>
								</div>
							</button>
						);
					})
				)}
			</div>
		</div>
	);
}
