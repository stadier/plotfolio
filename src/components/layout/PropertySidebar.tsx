"use client";

import { getStatusColor } from "@/components/property/propertyDisplayHelpers";
import { formatCurrency } from "@/lib/utils";
import { Property, PropertyStatus } from "@/types/property";
import { Filter, Search } from "lucide-react";
import { useState } from "react";

interface PropertySidebarProps {
	properties: Property[];
	selectedProperty: Property | null;
	onPropertySelect: (property: Property) => void;
	searchQuery: string;
	onSearch: (query: string) => void;
}

export default function PropertySidebar({
	properties,
	selectedProperty,
	onPropertySelect,
	searchQuery,
	onSearch,
}: PropertySidebarProps) {
	const [showFilters, setShowFilters] = useState(false);

	return (
		<div className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-80 bg-card border-r border-border overflow-hidden flex flex-col">
			{/* Header */}
			<div className="p-4 border-b border-border">
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-lg font-semibold text-on-surface">Properties</h2>
					<button
						onClick={() => setShowFilters(!showFilters)}
						className="p-2 hover:bg-surface-container-high rounded-lg"
					>
						<Filter className="w-4 h-4 text-on-surface-variant" />
					</button>
				</div>

				{/* Search */}
				<div className="relative">
					<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-outline" />
					<input
						type="text"
						placeholder="Search properties..."
						value={searchQuery}
						onChange={(e) => onSearch(e.target.value)}
						className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					/>
				</div>

				{/* Filters (if visible) */}
				{showFilters && (
					<div className="mt-4 p-3 bg-surface-container rounded-lg">
						<div className="text-sm text-on-surface-variant mb-2">
							Filter by status:
						</div>
						<div className="flex flex-wrap gap-2">
							{Object.values(PropertyStatus).map((status) => (
								<button
									key={status}
									className={`px-2 py-1 text-xs rounded-full ${getStatusColor(
										status,
									)}`}
								>
									{status.replace("_", " ")}
								</button>
							))}
						</div>
					</div>
				)}
			</div>

			{/* Property List */}
			<div className="flex-1 overflow-y-auto">
				{properties.length === 0 ? (
					<div className="p-4 text-center text-outline">
						<div className="text-4xl mb-2">🏗️</div>
						<p>No properties found</p>
					</div>
				) : (
					<div className="p-2">
						{properties.map((property) => (
							<button
								key={property.id}
								onClick={() => onPropertySelect(property)}
								className={`w-full p-4 mb-2 rounded-lg border text-left transition-all hover:shadow-md ${
									selectedProperty?.id === property.id
										? "border-blue-500 bg-blue-50"
										: "border-border bg-card hover:border-border"
								}`}
							>
								<div className="flex items-start justify-between">
									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-2">
											<h3 className="font-medium text-on-surface truncate">
												{property.name}
											</h3>
											{property.surveyData &&
												property.surveyData.coordinates &&
												property.surveyData.coordinates.length >= 3 && (
													<span
														className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800"
														title="Boundary mapped"
													>
														📍
													</span>
												)}
										</div>
										<p className="text-sm text-on-surface-variant truncate mt-1">
											{property.address}
										</p>
										<div className="flex items-center mt-2 space-x-2">
											<span
												className={`px-2 py-1 text-xs rounded-full ${getStatusColor(
													property.status,
												)}`}
											>
												{property.status.replace("_", " ")}
											</span>
											<span className="text-xs text-outline">
												{property.area} sqm
											</span>
											{property.surveyData && (
												<span
													className="text-xs text-purple-600 font-medium"
													title="Boundary area"
												>
													{property.surveyData.area.toFixed(0)} m² boundary
												</span>
											)}
										</div>
										<div className="mt-2">
											<div className="text-sm font-medium text-on-surface">
												{formatCurrency(
													property.currentValue || 0,
													property.country,
												)}
											</div>
											<div className="text-xs text-outline">Current Value</div>
										</div>
									</div>
								</div>
							</button>
						))}
					</div>
				)}
			</div>

			{/* Footer */}
			<div className="p-4 border-t border-border bg-surface-container">
				<div className="text-xs text-on-surface-variant text-center">
					{properties.length} properties total
				</div>
			</div>
		</div>
	);
}
