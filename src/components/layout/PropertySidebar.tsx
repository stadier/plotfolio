"use client";

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

function getStatusColor(status: PropertyStatus): string {
	switch (status) {
		case PropertyStatus.OWNED:
			return "bg-green-100 text-green-800";
		case PropertyStatus.FOR_SALE:
			return "bg-blue-100 text-blue-800";
		case PropertyStatus.DEVELOPMENT:
			return "bg-yellow-100 text-yellow-800";
		case PropertyStatus.UNDER_CONTRACT:
			return "bg-orange-100 text-orange-800";
		default:
			return "bg-gray-100 text-gray-800";
	}
}

function formatCurrency(amount: number): string {
	return new Intl.NumberFormat("en-NG", {
		style: "currency",
		currency: "NGN",
		minimumFractionDigits: 0,
	}).format(amount);
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
		<div className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-80 bg-white border-r border-gray-200 overflow-hidden flex flex-col">
			{/* Header */}
			<div className="p-4 border-b border-gray-200">
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-lg font-semibold text-gray-900">Properties</h2>
					<button
						onClick={() => setShowFilters(!showFilters)}
						className="p-2 hover:bg-gray-100 rounded-lg"
					>
						<Filter className="w-4 h-4 text-gray-600" />
					</button>
				</div>

				{/* Search */}
				<div className="relative">
					<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
					<input
						type="text"
						placeholder="Search properties..."
						value={searchQuery}
						onChange={(e) => onSearch(e.target.value)}
						className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					/>
				</div>

				{/* Filters (if visible) */}
				{showFilters && (
					<div className="mt-4 p-3 bg-gray-50 rounded-lg">
						<div className="text-sm text-gray-600 mb-2">Filter by status:</div>
						<div className="flex flex-wrap gap-2">
							{Object.values(PropertyStatus).map((status) => (
								<button
									key={status}
									className={`px-2 py-1 text-xs rounded-full ${getStatusColor(
										status
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
					<div className="p-4 text-center text-gray-500">
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
										: "border-gray-200 bg-white hover:border-gray-300"
								}`}
							>
								<div className="flex items-start justify-between">
									<div className="flex-1 min-w-0">
										<h3 className="font-medium text-gray-900 truncate">
											{property.name}
										</h3>
										<p className="text-sm text-gray-600 truncate mt-1">
											{property.address}
										</p>
										<div className="flex items-center mt-2 space-x-2">
											<span
												className={`px-2 py-1 text-xs rounded-full ${getStatusColor(
													property.status
												)}`}
											>
												{property.status.replace("_", " ")}
											</span>
											<span className="text-xs text-gray-500">
												{property.area} sqm
											</span>
										</div>
										<div className="mt-2">
											<div className="text-sm font-medium text-gray-900">
												{formatCurrency(property.currentValue || 0)}
											</div>
											<div className="text-xs text-gray-500">Current Value</div>
										</div>
									</div>
								</div>
							</button>
						))}
					</div>
				)}
			</div>

			{/* Footer */}
			<div className="p-4 border-t border-gray-200 bg-gray-50">
				<div className="text-xs text-gray-600 text-center">
					{properties.length} properties total
				</div>
			</div>
		</div>
	);
}
