import { SurveyData } from "@/types/property";
import { Eye, EyeOff, FileText, Map } from "lucide-react";
import { useState } from "react";
import SurveyUpload from "./SurveyUpload";

interface SurveyManagerProps {
	propertyId: string;
	currentSurveyData?: SurveyData;
	onSurveyUpdate: (surveyData: SurveyData) => void;
	onToggleBoundary: () => void;
	isBoundaryVisible: boolean;
	className?: string;
}

export default function SurveyManager({
	propertyId,
	currentSurveyData,
	onSurveyUpdate,
	onToggleBoundary,
	isBoundaryVisible,
	className = "",
}: SurveyManagerProps) {
	const [showUpload, setShowUpload] = useState(!currentSurveyData);

	return (
		<div className={`space-y-4 ${className}`}>
			{/* Survey Status Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<FileText className="w-4 h-4 text-gray-600" />
					<h3 className="text-sm font-medium text-gray-900">Survey Document</h3>
				</div>

				{currentSurveyData && (
					<button
						onClick={onToggleBoundary}
						className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
							isBoundaryVisible
								? "bg-green-100 text-green-700 hover:bg-green-200"
								: "bg-gray-100 text-gray-600 hover:bg-gray-200"
						}`}
					>
						{isBoundaryVisible ? (
							<Eye className="w-3 h-3" />
						) : (
							<EyeOff className="w-3 h-3" />
						)}
						{isBoundaryVisible ? "Hide" : "Show"} Boundary
					</button>
				)}
			</div>

			{/* Current Survey Info */}
			{currentSurveyData && (
				<div className="bg-green-50 border border-green-200 rounded-lg p-3">
					<div className="grid grid-cols-2 gap-3 text-xs">
						<div>
							<span className="text-green-700 font-medium">Plot:</span>
							<span className="text-green-600 ml-1">
								{currentSurveyData.plotNumber}
							</span>
						</div>
						<div>
							<span className="text-green-700 font-medium">Area:</span>
							<span className="text-green-600 ml-1">
								{currentSurveyData.area} sqm
							</span>
						</div>
						<div>
							<span className="text-green-700 font-medium">Boundaries:</span>
							<span className="text-green-600 ml-1">
								{currentSurveyData.boundaries.length} sides
							</span>
						</div>
						<div>
							<span className="text-green-700 font-medium">Registration:</span>
							<span className="text-green-600 ml-1">
								{currentSurveyData.registrationNumber?.split("/")[0] || "N/A"}
							</span>
						</div>
					</div>

					{/* Boundary Details */}
					<div className="mt-3 pt-3 border-t border-green-200">
						<p className="text-xs font-medium text-green-700 mb-2">
							Plot Measurements:
						</p>
						<div className="grid grid-cols-2 gap-2">
							{currentSurveyData.boundaries.map((boundary, index) => (
								<div key={index} className="text-xs text-green-600">
									<span className="font-mono">
										{boundary.from}→{boundary.to}:
									</span>
									<span className="ml-1">{boundary.distance}m</span>
								</div>
							))}
						</div>
					</div>

					<div className="mt-3 pt-3 border-t border-green-200 flex justify-between items-center">
						<button
							onClick={() => setShowUpload(!showUpload)}
							className="text-xs text-green-600 hover:text-green-700 font-medium"
						>
							{showUpload ? "Hide Upload" : "Upload New Survey"}
						</button>

						<span className="text-xs text-green-500">
							✓ Custom boundary active
						</span>
					</div>
				</div>
			)}

			{/* Upload Component */}
			{showUpload && (
				<SurveyUpload
					propertyId={propertyId}
					onSurveyProcessed={(surveyData) => {
						onSurveyUpdate(surveyData);
						setShowUpload(false);
					}}
				/>
			)}

			{/* No Survey State */}
			{!currentSurveyData && !showUpload && (
				<div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-lg">
					<Map className="w-8 h-8 text-gray-400 mx-auto mb-2" />
					<p className="text-sm text-gray-600 mb-2">
						No survey document uploaded
					</p>
					<button
						onClick={() => setShowUpload(true)}
						className="text-sm text-blue-600 hover:text-blue-700 font-medium"
					>
						Upload Survey Document
					</button>
				</div>
			)}
		</div>
	);
}
