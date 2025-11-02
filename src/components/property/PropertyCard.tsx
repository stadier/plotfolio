import { cn, formatArea, formatCurrency, formatDate } from "@/lib/utils";
import { Property, PropertyStatus, PropertyType } from "@/types/property";
import { Calendar, DollarSign, MapPin, Square } from "lucide-react";
import Image from "next/image";

interface PropertyCardProps {
	property: Property;
	onClick?: () => void;
	isSelected?: boolean;
	className?: string;
}

const statusColors = {
	[PropertyStatus.OWNED]: "bg-green-100 text-green-800",
	[PropertyStatus.UNDER_CONTRACT]: "bg-yellow-100 text-yellow-800",
	[PropertyStatus.FOR_SALE]: "bg-blue-100 text-blue-800",
	[PropertyStatus.RENTED]: "bg-purple-100 text-purple-800",
	[PropertyStatus.DEVELOPMENT]: "bg-orange-100 text-orange-800",
};

const typeColors = {
	[PropertyType.RESIDENTIAL]: "bg-emerald-500",
	[PropertyType.COMMERCIAL]: "bg-blue-500",
	[PropertyType.INDUSTRIAL]: "bg-purple-500",
	[PropertyType.AGRICULTURAL]: "bg-amber-500",
	[PropertyType.VACANT_LAND]: "bg-gray-500",
	[PropertyType.MIXED_USE]: "bg-red-500",
};

export default function PropertyCard({
	property,
	onClick,
	isSelected = false,
	className = "",
}: PropertyCardProps) {
	return (
		<div
			className={cn(
				"bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 cursor-pointer border",
				isSelected && "ring-2 ring-blue-500 border-blue-500",
				className
			)}
			onClick={onClick}
		>
			{/* Property Image or Placeholder */}
			<div className="h-48 bg-gray-200 rounded-t-lg relative overflow-hidden">
				{property.images && property.images.length > 0 ? (
					<Image
						src={property.images[0]}
						alt={property.name}
						fill
						className="object-cover"
					/>
				) : (
					<div className="w-full h-full flex items-center justify-center bg-linear-to-br from-gray-100 to-gray-200">
						<Square className="w-16 h-16 text-gray-400" />
					</div>
				)}

				{/* Property Type Badge */}
				<div
					className={cn(
						"absolute top-3 left-3 px-2 py-1 rounded text-white text-xs font-medium",
						typeColors[property.propertyType]
					)}
				>
					{property.propertyType.replace("_", " ").toUpperCase()}
				</div>

				{/* Status Badge */}
				<div
					className={cn(
						"absolute top-3 right-3 px-2 py-1 rounded text-xs font-medium",
						statusColors[property.status]
					)}
				>
					{property.status.replace("_", " ").toUpperCase()}
				</div>
			</div>

			{/* Property Details */}
			<div className="p-4">
				<div className="mb-3">
					<h3 className="text-lg font-semibold text-gray-900 mb-1">
						{property.name}
					</h3>
					<div className="flex items-center text-gray-600 text-sm">
						<MapPin className="w-4 h-4 mr-1" />
						<span className="truncate">{property.address}</span>
					</div>
				</div>

				{/* Property Stats */}
				<div className="grid grid-cols-2 gap-4 mb-3">
					<div className="flex items-center text-sm">
						<DollarSign className="w-4 h-4 text-green-600 mr-1" />
						<div>
							<div className="text-gray-500">Value</div>
							<div className="font-medium">
								{property.currentValue
									? formatCurrency(property.currentValue)
									: formatCurrency(property.purchasePrice)}
							</div>
						</div>
					</div>

					<div className="flex items-center text-sm">
						<Square className="w-4 h-4 text-blue-600 mr-1" />
						<div>
							<div className="text-gray-500">Area</div>
							<div className="font-medium">{formatArea(property.area)}</div>
						</div>
					</div>
				</div>

				{/* Purchase Date */}
				<div className="flex items-center text-sm text-gray-600">
					<Calendar className="w-4 h-4 mr-1" />
					<span>Purchased {formatDate(property.purchaseDate)}</span>
				</div>

				{/* Description */}
				{property.description && (
					<p className="text-sm text-gray-600 mt-2 line-clamp-2">
						{property.description}
					</p>
				)}
			</div>
		</div>
	);
}
