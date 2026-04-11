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
		(sum, property) =>
			sum + (property.currentValue || property.purchasePrice || 0),
		0,
	);

	const totalArea = properties.reduce(
		(sum, property) => sum + (property.area || 0),
		0,
	);

	const totalProperties = properties.length;

	const ownedProperties = properties.filter(
		(p) => p.status === PropertyStatus.OWNED,
	).length;

	const averageValue = totalProperties > 0 ? totalValue / totalProperties : 0;

	// Property type distribution
	const typeDistribution = properties.reduce(
		(acc, property) => {
			acc[property.propertyType] = (acc[property.propertyType] || 0) + 1;
			return acc;
		},
		{} as Record<PropertyType, number>,
	);

	// Status distribution
	const statusDistribution = properties.reduce(
		(acc, property) => {
			acc[property.status] = (acc[property.status] || 0) + 1;
			return acc;
		},
		{} as Record<PropertyStatus, number>,
	);

	const stats = [
		{
			title: "Total Properties",
			value: totalProperties.toString(),
			icon: Home,
			color: "text-primary",
			bgColor: "bg-primary/10",
		},
		{
			title: "Total Value",
			value: formatCurrency(totalValue),
			icon: DollarSign,
			color: "text-primary",
			bgColor: "bg-primary/10",
		},
		{
			title: "Total Area",
			value: formatArea(totalArea),
			icon: MapPin,
			color: "text-primary",
			bgColor: "bg-primary/10",
		},
		{
			title: "Average Value",
			value: formatCurrency(averageValue),
			icon: TrendingUp,
			color: "text-primary",
			bgColor: "bg-primary/10",
		},
	];

	return (
		<div className={`space-y-6 ${className}`}>
			{/* Key Metrics */}
			<div className="flex flex-wrap items-start gap-6">
				{stats.map((stat, index) => {
					const Icon = stat.icon;
					return (
						<div
							key={index}
							className="w-full sm:w-[280px] max-w-sm bg-card sz-card shadow-md card-hover animate-fade-in-up"
						>
							<div className="flex items-center justify-between">
								<div>
									<p className="typo-body font-medium text-on-surface-variant">
										{stat.title}
									</p>
									<p className="typo-stat font-bold text-on-surface mt-1">
										{stat.value}
									</p>
								</div>
								<div className={`p-3 rounded-full ${stat.bgColor}`}>
									<Icon className={`sz-icon-lg ${stat.color}`} />
								</div>
							</div>
						</div>
					);
				})}
			</div>

			{/* Distribution Charts */}
			<div className="grid grid-cols-1 lg:grid-cols-2 sz-gap-section">
				{/* Property Type Distribution */}
				<div className="bg-card sz-card shadow-md">
					<h3 className="typo-section-title font-semibold text-on-surface mb-4">
						Property Types
					</h3>
					<div className="space-y-3">
						{Object.entries(typeDistribution).map(([type, count]) => {
							const percentage = (count / totalProperties) * 100;
							return (
								<div key={type} className="flex items-center justify-between">
									<div className="flex items-center space-x-2">
										<div className="w-3 h-3 rounded-full bg-blue-500"></div>
										<span className="typo-body font-medium text-on-surface-variant capitalize">
											{type.replace("_", " ")}
										</span>
									</div>
									<div className="flex items-center space-x-2">
										<span className="typo-body text-on-surface-variant">
											{count}
										</span>
										<span className="typo-caption text-outline">
											({percentage.toFixed(1)}%)
										</span>
									</div>
								</div>
							);
						})}
					</div>
				</div>

				{/* Property Status Distribution */}
				<div className="bg-card sz-card shadow-md">
					<h3 className="typo-section-title font-semibold text-on-surface mb-4">
						Property Status
					</h3>
					<div className="space-y-3">
						{Object.entries(statusDistribution).map(([status, count]) => {
							const percentage = (count / totalProperties) * 100;
							return (
								<div key={status} className="flex items-center justify-between">
									<div className="flex items-center space-x-2">
										<div className="w-3 h-3 rounded-full bg-green-500"></div>
										<span className="typo-body font-medium text-on-surface-variant capitalize">
											{status.replace("_", " ")}
										</span>
									</div>
									<div className="flex items-center space-x-2">
										<span className="typo-body text-on-surface-variant">
											{count}
										</span>
										<span className="typo-caption text-outline">
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
			<div className="bg-card sz-card shadow-md">
				<h3 className="typo-section-title font-semibold text-on-surface mb-4">
					Portfolio Summary
				</h3>
				<div className="grid grid-cols-1 md:grid-cols-3 sz-gap-lg text-center">
					<div className="p-4 bg-surface-container sz-radius-lg">
						<div className="typo-stat font-bold text-on-surface">
							{ownedProperties}
						</div>
						<div className="typo-body text-on-surface-variant">
							Properties Owned
						</div>
					</div>
					<div className="p-4 bg-surface-container sz-radius-lg">
						<div className="typo-stat font-bold text-on-surface">
							{Object.keys(typeDistribution).length}
						</div>
						<div className="typo-body text-on-surface-variant">
							Property Types
						</div>
					</div>
					<div className="p-4 bg-surface-container sz-radius-lg">
						<div className="typo-stat font-bold text-on-surface">
							{totalArea > 43560
								? `${(totalArea / 43560).toFixed(1)} acres`
								: formatArea(totalArea)}
						</div>
						<div className="typo-body text-on-surface-variant">Total Land</div>
					</div>
				</div>
			</div>
		</div>
	);
}
