import { formatArea, formatCurrency } from "@/lib/utils";
import { Property, PropertyStatus, SurveyData } from "@/types/property";
import {
	Calendar,
	DollarSign,
	FileText,
	MessageCircle,
	Phone,
	Square,
	X,
} from "lucide-react";
import SurveyManager from "../survey/SurveyManager";

interface PropertyDetailCardProps {
	property: Property;
	onClose?: () => void;
	onSurveyUpdate?: (surveyData: SurveyData) => void;
	onToggleBoundary?: () => void;
	isBoundaryVisible?: boolean;
	className?: string;
}

export default function PropertyDetailCard({
	property,
	onClose,
	onSurveyUpdate,
	onToggleBoundary,
	isBoundaryVisible = false,
	className = "",
}: PropertyDetailCardProps) {
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
			className={`bg-white rounded-xl border border-gray-200 p-6 ${className}`}
		>
			{/* Header */}
			<div className="flex items-start justify-between mb-6">
				<div>
					<div className="flex items-center gap-3 mb-2">
						<h2 className="text-lg font-semibold text-gray-900">
							{property.name}
						</h2>
						<span
							className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
								property.status
							)}`}
						>
							{getStatusText(property.status)}
						</span>
					</div>
					<p className="text-sm text-gray-600">Property #{property.id}</p>
				</div>
				{onClose && (
					<button
						onClick={onClose}
						className="p-2 hover:bg-gray-100 rounded-lg"
					>
						<X className="w-5 h-5 text-gray-400" />
					</button>
				)}
			</div>

			{/* Property Timeline */}
			<div className="space-y-4 mb-6">
				<div className="flex items-start gap-3">
					<div className="w-3 h-3 bg-gray-900 rounded-full mt-2 shrink-0"></div>
					<div className="flex-1">
						<p className="text-sm font-medium text-gray-900 mb-1">Location</p>
						<p className="text-sm text-gray-600 leading-relaxed">
							{property.address}
						</p>
					</div>
				</div>

				<div className="flex items-start gap-3">
					<div className="w-3 h-3 bg-gray-400 rounded-full mt-2 shrink-0"></div>
					<div className="flex-1">
						<p className="text-sm font-medium text-gray-900 mb-1">
							Purchase Date
						</p>
						<p className="text-sm text-gray-600">
							{property.purchaseDate.toLocaleDateString()}
						</p>
					</div>
				</div>
			</div>

			{/* Property Details Grid */}
			<div className="grid grid-cols-2 gap-4 mb-6">
				<div className="bg-gray-50 rounded-lg p-4">
					<div className="flex items-center gap-2 mb-2">
						<Square className="w-4 h-4 text-gray-600" />
						<span className="text-sm font-medium text-gray-900">Area</span>
					</div>
					<p className="text-lg font-semibold text-gray-900">
						{formatArea(property.area)}
					</p>
				</div>

				<div className="bg-gray-50 rounded-lg p-4">
					<div className="flex items-center gap-2 mb-2">
						<DollarSign className="w-4 h-4 text-gray-600" />
						<span className="text-sm font-medium text-gray-900">
							Current Value
						</span>
					</div>
					<p className="text-lg font-semibold text-gray-900">
						{formatCurrency(property.currentValue || property.purchasePrice)}
					</p>
				</div>

				<div className="bg-gray-50 rounded-lg p-4">
					<div className="flex items-center gap-2 mb-2">
						<Calendar className="w-4 h-4 text-gray-600" />
						<span className="text-sm font-medium text-gray-900">
							Purchase Price
						</span>
					</div>
					<p className="text-lg font-semibold text-gray-900">
						{formatCurrency(property.purchasePrice)}
					</p>
				</div>

				<div className="bg-gray-50 rounded-lg p-4">
					<div className="flex items-center gap-2 mb-2">
						<FileText className="w-4 h-4 text-gray-600" />
						<span className="text-sm font-medium text-gray-900">Documents</span>
					</div>
					<p className="text-lg font-semibold text-gray-900">
						{property.documents.length}
					</p>
				</div>
			</div>

			{/* Owner Information */}
			{property.owner && (
				<div className="border-t border-gray-200 pt-4">
					<p className="text-sm font-medium text-gray-900 mb-3">Owner</p>
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shrink-0">
							<span className="text-sm font-medium text-white">
								{property.owner.name.charAt(0).toUpperCase()}
							</span>
						</div>
						<div className="flex-1">
							<p className="text-sm font-medium text-gray-900">
								{property.owner.name}
							</p>
							<p className="text-sm text-gray-600">{property.owner.email}</p>
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
				</div>
			)}

			{/* Survey Document Management */}
			<div className="border-t border-gray-200 pt-4 mt-4">
				<SurveyManager
					propertyId={property.id}
					currentSurveyData={property.surveyData}
					onSurveyUpdate={(surveyData) => onSurveyUpdate?.(surveyData)}
					onToggleBoundary={() => onToggleBoundary?.()}
					isBoundaryVisible={isBoundaryVisible}
				/>
			</div>

			{/* Description */}
			{property.description && (
				<div className="border-t border-gray-200 pt-4 mt-4">
					<p className="text-sm font-medium text-gray-900 mb-2">Description</p>
					<p className="text-sm text-gray-600 leading-relaxed">
						{property.description}
					</p>
				</div>
			)}

			{/* Action Button */}
			<button className="w-full mt-4 py-3 px-4 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors">
				View on Map
			</button>
		</div>
	);
}
