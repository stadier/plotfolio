import { SurveyData, SurveyDocument } from "@/types/property";
import { CheckCircle2, FileText, Loader2, Upload } from "lucide-react";
import { useCallback, useState } from "react";

interface SurveyUploadProps {
	propertyId: string;
	onSurveyProcessed: (surveyData: SurveyData) => void;
	className?: string;
}

export default function SurveyUpload({
	propertyId,
	onSurveyProcessed,
	className = "",
}: SurveyUploadProps) {
	const [isUploading, setIsUploading] = useState(false);
	const [isProcessing, setIsProcessing] = useState(false);
	const [uploadedFiles, setUploadedFiles] = useState<SurveyDocument[]>([]);
	const [extractedData, setExtractedData] = useState<SurveyData | null>(null);

	const processImageWithAI = async (file: File): Promise<SurveyData> => {
		// Simulate AI processing of the survey document
		// In reality, this would use OCR + AI to extract survey details
		await new Promise((resolve) => setTimeout(resolve, 3000));

		// Mock extracted data based on the survey document shown
		return {
			plotNumber: "1162",
			area: 625, // 25m x 25m from the document
			coordinates: [
				{ point: "A", lat: 9.0765, lng: 7.4951, description: "Starting point" },
				{
					point: "B",
					lat: 9.0767,
					lng: 7.4951,
					description: "Along Surcon Road",
				},
				{ point: "C", lat: 9.0767, lng: 7.4953, description: "Corner point" },
				{ point: "D", lat: 9.0765, lng: 7.4953, description: "Back to start" },
			],
			boundaries: [
				{ from: "A", to: "B", distance: 25, description: "Along Surcon Road" },
				{ from: "B", to: "C", distance: 25, description: "Eastern boundary" },
				{ from: "C", to: "D", distance: 25, description: "Northern boundary" },
				{ from: "D", to: "A", distance: 25, description: "Western boundary" },
			],
			measurements: [
				{ side: "AB", length: 25.0, bearing: 90 },
				{ side: "BC", length: 25.0, bearing: 0 },
				{ side: "CD", length: 25.0, bearing: 270 },
				{ side: "DA", length: 25.0, bearing: 180 },
			],
			bearings: [
				{ from: "A", to: "B", bearing: 90, distance: 25 },
				{ from: "B", to: "C", bearing: 0, distance: 25 },
				{ from: "C", to: "D", bearing: 270, distance: 25 },
				{ from: "D", to: "A", bearing: 180, distance: 25 },
			],
			registrationNumber: "PLOT 1162/RM.02/2022",
			surveyDate: new Date("2022-01-01"),
			surveyor: "Richard U. Okoroil",
		};
	};

	const handleFileUpload = useCallback(
		async (event: React.ChangeEvent<HTMLInputElement>) => {
			const files = event.target.files;
			if (!files || files.length === 0) return;

			setIsUploading(true);

			try {
				const file = files[0];

				// Create survey document record
				const surveyDoc: SurveyDocument = {
					id: Date.now().toString(),
					propertyId,
					fileName: file.name,
					fileUrl: URL.createObjectURL(file),
					uploadDate: new Date(),
					processed: false,
				};

				setUploadedFiles((prev) => [...prev, surveyDoc]);
				setIsProcessing(true);

				// Process the document with AI
				const extracted = await processImageWithAI(file);

				setExtractedData(extracted);
				onSurveyProcessed(extracted);

				// Update the document as processed
				setUploadedFiles((prev) =>
					prev.map((doc) =>
						doc.id === surveyDoc.id
							? { ...doc, extractedData: extracted, processed: true }
							: doc
					)
				);
			} catch (error) {
				console.error("Error processing survey document:", error);
			} finally {
				setIsUploading(false);
				setIsProcessing(false);
			}
		},
		[propertyId, onSurveyProcessed]
	);

	return (
		<div className={`space-y-4 ${className}`}>
			{/* Upload Area */}
			<div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-green-400 transition-colors">
				<input
					type="file"
					accept="image/*,.pdf"
					onChange={handleFileUpload}
					className="hidden"
					id="survey-upload"
					disabled={isUploading || isProcessing}
				/>
				<label
					htmlFor="survey-upload"
					className="cursor-pointer flex flex-col items-center gap-3"
				>
					{isUploading || isProcessing ? (
						<Loader2 className="w-8 h-8 text-green-600 animate-spin" />
					) : (
						<Upload className="w-8 h-8 text-gray-400" />
					)}

					<div>
						<p className="text-sm font-medium text-gray-900">
							{isProcessing
								? "Processing survey document..."
								: "Upload Survey Document"}
						</p>
						<p className="text-xs text-gray-500 mt-1">
							PNG, JPG, PDF up to 10MB
						</p>
					</div>
				</label>
			</div>

			{/* Processing Status */}
			{isProcessing && (
				<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
					<div className="flex items-center gap-3">
						<Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
						<div>
							<p className="text-sm font-medium text-blue-900">
								Extracting survey data...
							</p>
							<p className="text-xs text-blue-700">
								AI is analyzing measurements, boundaries, and coordinates
							</p>
						</div>
					</div>
				</div>
			)}

			{/* Extracted Data Preview */}
			{extractedData && (
				<div className="bg-green-50 border border-green-200 rounded-lg p-4">
					<div className="flex items-start gap-3">
						<CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
						<div className="flex-1">
							<h4 className="text-sm font-medium text-green-900 mb-2">
								Survey Data Extracted Successfully
							</h4>

							<div className="grid grid-cols-2 gap-4 text-xs">
								<div>
									<span className="text-green-700 font-medium">Plot:</span>
									<span className="text-green-600 ml-1">
										{extractedData.plotNumber}
									</span>
								</div>
								<div>
									<span className="text-green-700 font-medium">Area:</span>
									<span className="text-green-600 ml-1">
										{extractedData.area} sqm
									</span>
								</div>
								<div>
									<span className="text-green-700 font-medium">
										Boundaries:
									</span>
									<span className="text-green-600 ml-1">
										{extractedData.boundaries.length} sides
									</span>
								</div>
								<div>
									<span className="text-green-700 font-medium">Surveyor:</span>
									<span className="text-green-600 ml-1">
										{extractedData.surveyor}
									</span>
								</div>
							</div>

							<div className="mt-3 pt-3 border-t border-green-200">
								<p className="text-xs text-green-700">
									✓ Custom plot boundary will be overlaid on map
								</p>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Uploaded Files List */}
			{uploadedFiles.length > 0 && (
				<div className="space-y-2">
					<h4 className="text-sm font-medium text-gray-900">
						Survey Documents
					</h4>
					{uploadedFiles.map((doc) => (
						<div
							key={doc.id}
							className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
						>
							<FileText className="w-4 h-4 text-gray-600" />
							<div className="flex-1">
								<p className="text-sm font-medium text-gray-900">
									{doc.fileName}
								</p>
								<p className="text-xs text-gray-500">
									{doc.uploadDate.toLocaleDateString()}
								</p>
							</div>
							{doc.processed ? (
								<CheckCircle2 className="w-4 h-4 text-green-600" />
							) : (
								<Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
							)}
						</div>
					))}
				</div>
			)}
		</div>
	);
}
