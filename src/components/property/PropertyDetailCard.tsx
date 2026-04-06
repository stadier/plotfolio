import { Property, SurveyData } from "@/types/property";
import { X } from "lucide-react";
import SurveyManager from "../survey/SurveyManager";
import ListingDetailView from "./ListingDetailView";

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
	return (
		<div
			className={`bg-card rounded-xl border border-border p-6 animate-fade-in-up ${className}`}
		>
			{/* Close button */}
			{onClose && (
				<div className="flex justify-end mb-2">
					<button
						onClick={onClose}
						className="p-2 hover:bg-surface-container-high rounded-lg icon-btn-hover"
					>
						<X className="w-5 h-5 text-outline" />
					</button>
				</div>
			)}

			<ListingDetailView
				property={property}
				layout="compact"
				showGallery={false}
				isOwner
			/>

			{/* Survey Document Management */}
			<div className="border-t border-border pt-4 mt-4">
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
				<div className="border-t border-border pt-4 mt-4">
					<p className="text-sm font-medium text-on-surface mb-2">
						Description
					</p>
					<p className="text-sm text-on-surface-variant leading-relaxed">
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
