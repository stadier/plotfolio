import { formatArea, formatCurrency } from "@/lib/utils";
import { Property, PropertyStatus, PropertyType } from "@/types/property";
import { DollarSign, Home, MapPin, TrendingUp } from "lucide-react";

interface DashboardOverviewProps {
	properties: Property[];
	className?: string;
}

export default function DashboardOverview({
	properties,
	className = "",
}: DashboardOverviewProps) {
	// Calculate summary statistics
	const totalValue = properties.reduce(
		(sum, property) => sum + (property.currentValue || property.purchasePrice),
		0
	);

	const totalArea = properties.reduce(
		(sum, property) => sum + property.area,
		0
	);

	const totalProperties = properties.length;

	const ownedProperties = properties.filter(
		(p) => p.status === PropertyStatus.OWNED
	).length;

	const averageValue = totalProperties > 0 ? totalValue / totalProperties : 0;

	// Property type distribution
	const typeDistribution = properties.reduce((acc, property) => {
		acc[property.propertyType] = (acc[property.propertyType] || 0) + 1;
		return acc;
	}, {} as Record<PropertyType, number>);

	// Status distribution
	const statusDistribution = properties.reduce((acc, property) => {
		acc[property.status] = (acc[property.status] || 0) + 1;
		return acc;
	}, {} as Record<PropertyStatus, number>);

	const stats = [
		{
			title: "Total Properties",
			value: totalProperties.toString(),
			icon: Home,
			color: "text-blue-600",
			bgColor: "bg-blue-100",
		},
		{
			title: "Total Value",
			value: formatCurrency(totalValue),
			icon: DollarSign,
			color: "text-green-600",
			bgColor: "bg-green-100",
		},
		{
			title: "Total Area",
			value: formatArea(totalArea),
			icon: MapPin,
			color: "text-purple-600",
			bgColor: "bg-purple-100",
		},
		{
			title: "Average Value",
			value: formatCurrency(averageValue),
			icon: TrendingUp,
			color: "text-orange-600",
			bgColor: "bg-orange-100",
		},
	];

	return (
		<div className={`space-y-6 ${className}`}>
			{/* Key Metrics */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
				{stats.map((stat, index) => {
					const Icon = stat.icon;
					return (
						<div key={index} className="bg-white rounded-lg shadow-md p-6">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm font-medium text-gray-600">
										{stat.title}
									</p>
									<p className="text-2xl font-bold text-gray-900 mt-1">
										{stat.value}
									</p>
								</div>
								<div className={`p-3 rounded-full ${stat.bgColor}`}>
									<Icon className={`w-6 h-6 ${stat.color}`} />
								</div>
							</div>
						</div>
					);
				})}
			</div>

			{/* Distribution Charts */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Property Type Distribution */}
				<div className="bg-white rounded-lg shadow-md p-6">
					<h3 className="text-lg font-semibold text-gray-900 mb-4">
						Property Types
					</h3>
					<div className="space-y-3">
						{Object.entries(typeDistribution).map(([type, count]) => {
							const percentage = (count / totalProperties) * 100;
							return (
								<div key={type} className="flex items-center justify-between">
									<div className="flex items-center space-x-2">
										<div className="w-3 h-3 rounded-full bg-blue-500"></div>
										<span className="text-sm font-medium text-gray-700 capitalize">
											{type.replace("_", " ")}
										</span>
									</div>
									<div className="flex items-center space-x-2">
										<span className="text-sm text-gray-600">{count}</span>
										<span className="text-xs text-gray-500">
											({percentage.toFixed(1)}%)
										</span>
									</div>
								</div>
							);
						})}
					</div>
				</div>

				{/* Property Status Distribution */}
				<div className="bg-white rounded-lg shadow-md p-6">
					<h3 className="text-lg font-semibold text-gray-900 mb-4">
						Property Status
					</h3>
					<div className="space-y-3">
						{Object.entries(statusDistribution).map(([status, count]) => {
							const percentage = (count / totalProperties) * 100;
							return (
								<div key={status} className="flex items-center justify-between">
									<div className="flex items-center space-x-2">
										<div className="w-3 h-3 rounded-full bg-green-500"></div>
										<span className="text-sm font-medium text-gray-700 capitalize">
											{status.replace("_", " ")}
										</span>
									</div>
									<div className="flex items-center space-x-2">
										<span className="text-sm text-gray-600">{count}</span>
										<span className="text-xs text-gray-500">
											({percentage.toFixed(1)}%)
										</span>
									</div>
								</div>
							);
						})}
					</div>
				</div>
			</div>

			{/* Quick Stats */}
			<div className="bg-white rounded-lg shadow-md p-6">
				<h3 className="text-lg font-semibold text-gray-900 mb-4">
					Portfolio Summary
				</h3>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
					<div className="p-4 bg-gray-50 rounded-lg">
						<div className="text-2xl font-bold text-gray-900">
							{ownedProperties}
						</div>
						<div className="text-sm text-gray-600">Properties Owned</div>
					</div>
					<div className="p-4 bg-gray-50 rounded-lg">
						<div className="text-2xl font-bold text-gray-900">
							{Object.keys(typeDistribution).length}
						</div>
						<div className="text-sm text-gray-600">Property Types</div>
					</div>
					<div className="p-4 bg-gray-50 rounded-lg">
						<div className="text-2xl font-bold text-gray-900">
							{totalArea > 43560
								? `${(totalArea / 43560).toFixed(1)} acres`
								: formatArea(totalArea)}
						</div>
						<div className="text-sm text-gray-600">Total Land</div>
					</div>
				</div>
			</div>
		</div>
	);
}
