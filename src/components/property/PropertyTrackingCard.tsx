import { formatArea, formatCurrency } from "@/lib/utils";
import { Property, PropertyStatus } from "@/types/property";
import { MessageCircle, MoreHorizontal, Phone } from "lucide-react";

interface PropertyTrackingCardProps {
	property: Property;
	onClick?: () => void;
	className?: string;
}

export default function PropertyTrackingCard({
	property,
	onClick,
	className = "",
}: PropertyTrackingCardProps) {
	const getStatusColor = (status: PropertyStatus) => {
		switch (status) {
			case PropertyStatus.OWNED:
				return "bg-green-100 text-green-800";
			case PropertyStatus.UNDER_CONTRACT:
				return "bg-blue-100 text-blue-800";
			case PropertyStatus.FOR_SALE:
				return "bg-yellow-100 text-yellow-800";
			case PropertyStatus.RENTED:
				return "bg-purple-100 text-purple-800";
			case PropertyStatus.DEVELOPMENT:
				return "bg-orange-100 text-orange-800";
			default:
				return "bg-gray-100 text-gray-800";
		}
	};

	const getStatusText = (status: PropertyStatus) => {
		switch (status) {
			case PropertyStatus.OWNED:
				return "Owned";
			case PropertyStatus.UNDER_CONTRACT:
				return "Under Contract";
			case PropertyStatus.FOR_SALE:
				return "For Sale";
			case PropertyStatus.RENTED:
				return "Rented";
			case PropertyStatus.DEVELOPMENT:
				return "Development";
			default:
				return "Unknown";
		}
	};

	return (
		<div
			className={`bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer ${className}`}
			onClick={onClick}
		>
			{/* Header */}
			<div className="flex items-start justify-between mb-3">
				<div className="flex-1">
					<div className="flex items-center gap-2 mb-1">
						<h3 className="font-semibold text-gray-900 text-sm">
							{property.name}
						</h3>
						<span
							className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
								property.status
							)}`}
						>
							{getStatusText(property.status)}
						</span>
					</div>
					<p className="text-xs text-gray-600">Property #{property.id}</p>
				</div>
				<button className="p-1 hover:bg-gray-100 rounded">
					<MoreHorizontal className="w-4 h-4 text-gray-400" />
				</button>
			</div>

			{/* Property Details */}
			<div className="space-y-3">
				{/* Location */}
				<div className="flex items-start gap-2">
					<div className="w-2 h-2 bg-gray-400 rounded-full mt-2 shrink-0"></div>
					<div className="flex-1">
						<p className="text-xs font-medium text-gray-700 mb-1">Location</p>
						<p className="text-xs text-gray-600 leading-relaxed">
							{property.address}
						</p>
					</div>
				</div>

				{/* Value & Area */}
				<div className="flex items-start gap-2">
					<div className="w-2 h-2 bg-gray-900 rounded-full mt-2 shrink-0"></div>
					<div className="flex-1">
						<p className="text-xs font-medium text-gray-700 mb-1">
							Property Details
						</p>
						<div className="flex items-center justify-between">
							<span className="text-xs text-gray-600">
								{formatArea(property.area)}
							</span>
							<span className="text-xs font-medium text-gray-900">
								{formatCurrency(
									property.currentValue || property.purchasePrice
								)}
							</span>
						</div>
					</div>
				</div>
			</div>

			{/* Owner/Contact Info */}
			{property.owner && (
				<div className="flex items-center gap-3 mt-4 pt-3 border-t border-gray-100">
					<div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shrink-0">
						<span className="text-xs font-medium text-white">
							{property.owner.name.charAt(0).toUpperCase()}
						</span>
					</div>
					<div className="flex-1 min-w-0">
						<p className="text-xs font-medium text-gray-900 truncate">
							{property.owner.name}
						</p>
						<p className="text-xs text-gray-500 capitalize">
							{property.owner.type}
						</p>
					</div>
					<div className="flex items-center gap-2">
						<button className="p-2 hover:bg-gray-100 rounded-full">
							<Phone className="w-4 h-4 text-gray-400" />
						</button>
						<button className="p-2 hover:bg-gray-100 rounded-full">
							<MessageCircle className="w-4 h-4 text-gray-400" />
						</button>
					</div>
				</div>
			)}

			{/* Action Button */}
			<button className="w-full mt-4 py-2 px-3 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-800 transition-colors">
				View Details
			</button>
		</div>
	);
}
