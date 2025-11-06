"use client";

import { SurveyData } from "@/types/property";
import { useMap } from "@vis.gl/react-google-maps";
import { Loader2, Save, Sparkles, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface GoogleMapsBoundaryDrawerProps {
	propertyId: string;
	onBoundaryComplete: (surveyData: SurveyData) => void;
	onCancel: () => void;
	existingBoundary?: SurveyData;
}

export default function GoogleMapsBoundaryDrawer({
	propertyId,
	onBoundaryComplete,
	onCancel,
	existingBoundary,
}: GoogleMapsBoundaryDrawerProps) {
	const map = useMap();
	const [points, setPoints] = useState<{ lat: number; lng: number }[]>(
		existingBoundary?.coordinates.map((c) => ({ lat: c.lat, lng: c.lng })) || []
	);
	const [isDrawing, setIsDrawing] = useState(false);
	const [isRefining, setIsRefining] = useState(false);
	const [refinedSurveyData, setRefinedSurveyData] = useState<SurveyData | null>(
		null
	);
	const [showRefinedPreview, setShowRefinedPreview] = useState(false);
	const markersRef = useRef<google.maps.Marker[]>([]);
	const polylineRef = useRef<google.maps.Polyline | null>(null);
	const polygonRef = useRef<google.maps.Polygon | null>(null);
	const listenerRef = useRef<google.maps.MapsEventListener | null>(null);

	// Initialize drawing mode
	useEffect(() => {
		if (!map) return;

		// Add click listener for adding points
		const clickListener = map.addListener(
			"click",
			(e: google.maps.MapMouseEvent) => {
				if (isDrawing && e.latLng) {
					const newPoint = { lat: e.latLng.lat(), lng: e.latLng.lng() };
					setPoints((prev) => [...prev, newPoint]);
				}
			}
		);

		listenerRef.current = clickListener;

		return () => {
			clickListener.remove();
		};
	}, [map, isDrawing]);

	// Draw markers and polyline
	useEffect(() => {
		if (!map) return;

		// Clear existing markers
		markersRef.current.forEach((marker) => marker.setMap(null));
		markersRef.current = [];

		// Remove existing polyline and polygon
		if (polylineRef.current) {
			polylineRef.current.setMap(null);
			polylineRef.current = null;
		}
		if (polygonRef.current) {
			polygonRef.current.setMap(null);
			polygonRef.current = null;
		}

		if (points.length === 0) return;

		// Create markers for each point
		points.forEach((point, index) => {
			const marker = new google.maps.Marker({
				position: point,
				map,
				label: {
					text: `${index + 1}`,
					color: "white",
					fontSize: "12px",
					fontWeight: "bold",
				},
				icon: {
					path: google.maps.SymbolPath.CIRCLE,
					scale: 10,
					fillColor: "#3B82F6",
					fillOpacity: 1,
					strokeColor: "white",
					strokeWeight: 2,
				},
				draggable: true,
			});

			// Update point position when marker is dragged
			marker.addListener("dragend", () => {
				const position = marker.getPosition();
				if (position) {
					setPoints((prev) => {
						const newPoints = [...prev];
						newPoints[index] = { lat: position.lat(), lng: position.lng() };
						return newPoints;
					});
				}
			});

			markersRef.current.push(marker);
		});

		// Draw polyline connecting points
		if (points.length > 1) {
			const polyline = new google.maps.Polyline({
				path: points,
				map,
				strokeColor: "#3B82F6",
				strokeWeight: 3,
				strokeOpacity: 0.8,
			});
			polylineRef.current = polyline;
		}

		// Draw filled polygon if we have 3+ points
		if (points.length >= 3) {
			const polygon = new google.maps.Polygon({
				paths: points,
				map,
				strokeColor: "#3B82F6",
				strokeWeight: 3,
				strokeOpacity: 0.8,
				fillColor: "#3B82F6",
				fillOpacity: 0.2,
			});
			polygonRef.current = polygon;
		}
	}, [map, points]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			markersRef.current.forEach((marker) => marker.setMap(null));
			if (polylineRef.current) polylineRef.current.setMap(null);
			if (polygonRef.current) polygonRef.current.setMap(null);
			if (listenerRef.current) listenerRef.current.remove();
		};
	}, []);

	const handleStartDrawing = () => {
		setIsDrawing(true);
	};

	const handleClearAll = () => {
		setPoints([]);
		setIsDrawing(false);
	};

	const handleRemoveLastPoint = () => {
		setPoints((prev) => prev.slice(0, -1));
	};

	const handleSaveBoundary = () => {
		if (points.length < 3) {
			alert("Please add at least 3 points to create a boundary");
			return;
		}

		console.log("💾 Saving boundary with points:", points);

		const surveyData: SurveyData = {
			plotNumber: `MANUAL-${Date.now()}`,
			area: calculatePolygonArea(points),
			coordinates: points.map((p, i) => ({
				lat: p.lat,
				lng: p.lng,
				point: `P${i + 1}`,
			})),
			boundaries: [],
			measurements: [],
			bearings: [],
		};

		console.log("📊 Survey data created:", surveyData);
		console.log(`📍 Area: ${surveyData.area.toFixed(2)} m²`);

		onBoundaryComplete(surveyData);
	};

	const handleRefineWithAI = async () => {
		if (points.length < 3) {
			alert("Please add at least 3 points before refining");
			return;
		}

		setIsRefining(true);

		try {
			// Get map bounds
			const mapBounds = map?.getBounds();
			const bounds = mapBounds
				? {
						north: mapBounds.getNorthEast().lat(),
						south: mapBounds.getSouthWest().lat(),
						east: mapBounds.getNorthEast().lng(),
						west: mapBounds.getSouthWest().lng(),
				  }
				: undefined;

			// Get center point
			const centerLat =
				points.reduce((sum, p) => sum + p.lat, 0) / points.length;
			const centerLng =
				points.reduce((sum, p) => sum + p.lng, 0) / points.length;

			const response = await fetch("/api/boundaries/refine", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					points,
					coordinates: { lat: centerLat, lng: centerLng },
					bounds,
				}),
			});

			if (!response.ok) {
				throw new Error("Failed to refine boundary");
			}

			const data = await response.json();

			if (data.success && data.surveyData) {
				// Store refined data and show preview instead of immediately completing
				setRefinedSurveyData(data.surveyData);
				setShowRefinedPreview(true);

				// Update points to show refined boundary
				const refinedPoints = data.surveyData.coordinates.map((c: any) => ({
					lat: c.lat,
					lng: c.lng,
				}));
				setPoints(refinedPoints);

				// Show success message
				console.log("✅ Refinement complete:", data.message);
			} else {
				throw new Error(data.error || "Failed to refine boundary");
			}
		} catch (error) {
			console.error("Error refining boundary:", error);
			alert(
				error instanceof Error
					? error.message
					: "Failed to refine boundary. Please try again."
			);
		} finally {
			setIsRefining(false);
		}
	};

	const handleSaveRefinedBoundary = () => {
		if (refinedSurveyData) {
			console.log("💾 Saving AI-refined boundary:", refinedSurveyData);
			console.log(`📍 Area: ${refinedSurveyData.area.toFixed(2)} m²`);
			onBoundaryComplete(refinedSurveyData);
		}
	};

	const handleDiscardRefinement = () => {
		setShowRefinedPreview(false);
		setRefinedSurveyData(null);
		// Could optionally restore original points here if needed
	};

	const calculatePolygonArea = (
		pts: { lat: number; lng: number }[]
	): number => {
		if (pts.length < 3) return 0;

		let area = 0;
		for (let i = 0; i < pts.length; i++) {
			const j = (i + 1) % pts.length;
			area += pts[i].lng * pts[j].lat;
			area -= pts[j].lng * pts[i].lat;
		}
		area = Math.abs(area / 2);

		// Convert to square meters
		const metersPerDegree = 111320;
		return area * metersPerDegree * metersPerDegree;
	};

	return (
		<div className="absolute top-4 right-4 z-10 bg-white rounded-lg shadow-lg p-4 max-w-sm">
			<div className="flex items-center justify-between mb-3">
				<h3 className="font-semibold text-gray-900">
					{points.length >= 3 && !isDrawing
						? "Property Boundary"
						: "Draw Property Boundary"}
				</h3>
				<button
					onClick={onCancel}
					className="text-gray-400 hover:text-gray-600"
					title="Cancel"
				>
					<X className="w-5 h-5" />
				</button>
			</div>

			<div className="space-y-3">
				{showRefinedPreview && refinedSurveyData && (
					<div className="bg-purple-50 border-2 border-purple-300 rounded-lg p-3">
						<div className="flex items-center gap-2 mb-2">
							<Sparkles className="w-5 h-5 text-purple-600" />
							<span className="font-semibold text-purple-900">
								AI Refinement Complete!
							</span>
						</div>
						<p className="text-sm text-purple-700 mb-2">
							Boundary snapped to detected edges. Review the updated boundary
							and save if satisfied.
						</p>
						<div className="text-xs text-purple-600">
							Confidence:{" "}
							{Math.round((refinedSurveyData as any).confidence * 100 || 75)}%
						</div>
					</div>
				)}

				<p className="text-sm text-gray-600">
					{showRefinedPreview
						? "Review the AI-refined boundary below. Save if it looks good, or discard to try again."
						: !isDrawing && points.length === 0
						? "Click 'Start Drawing' then click on the map to add boundary points."
						: !isDrawing && points.length >= 3
						? "Boundary drawn! Use AI Refine to snap to actual property edges, or adjust manually."
						: `${points.length} point${
								points.length !== 1 ? "s" : ""
						  } added. Click on the map to add more points.`}
				</p>

				{points.length >= 3 && (
					<div className="text-sm text-gray-700 bg-blue-50 p-2 rounded">
						<strong>Area:</strong> {calculatePolygonArea(points).toFixed(2)} m²
					</div>
				)}

				<div className="space-y-2">
					{showRefinedPreview ? (
						<>
							{/* Show refined boundary review options */}
							<button
								onClick={handleSaveRefinedBoundary}
								className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 font-semibold"
							>
								<Save className="w-4 h-4" />✓ Save Refined Boundary
							</button>

							<button
								onClick={handleDiscardRefinement}
								className="w-full px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
							>
								Discard & Try Again
							</button>
						</>
					) : !isDrawing && points.length === 0 ? (
						<button
							onClick={handleStartDrawing}
							className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
						>
							Start Drawing
						</button>
					) : !isDrawing && points.length >= 3 ? (
						<>
							{/* Boundary already drawn - show refine and save options */}
							<button
								onClick={handleRefineWithAI}
								disabled={isRefining}
								className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
							>
								{isRefining ? (
									<>
										<Loader2 className="w-4 h-4 animate-spin" />
										Refining with AI...
									</>
								) : (
									<>
										<Sparkles className="w-4 h-4" />✨ Refine with AI (FREE)
									</>
								)}
							</button>

							<button
								onClick={handleSaveBoundary}
								className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
							>
								<Save className="w-4 h-4" />
								Save Boundary
							</button>

							<button
								onClick={() => {
									setIsDrawing(true);
								}}
								className="w-full px-3 py-2 text-sm border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors"
							>
								Continue Drawing
							</button>

							<button
								onClick={handleClearAll}
								className="w-full px-3 py-2 text-sm border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
							>
								<X className="w-4 h-4" />
								Clear & Restart
							</button>
						</>
					) : (
						<>
							{/* Currently drawing */}
							<div className="flex gap-2">
								<button
									onClick={handleRemoveLastPoint}
									disabled={points.length === 0}
									className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
								>
									<Trash2 className="w-4 h-4" />
									Undo Last
								</button>
								<button
									onClick={handleClearAll}
									className="flex-1 px-3 py-2 text-sm border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
								>
									<X className="w-4 h-4" />
									Clear All
								</button>
							</div>

							{points.length >= 3 && (
								<>
									<button
										onClick={() => setIsDrawing(false)}
										className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
									>
										Finish Drawing
									</button>
								</>
							)}
						</>
					)}
				</div>

				<div className="text-xs text-gray-500 space-y-1">
					<p>• Click on map to add points</p>
					<p>• Drag markers to adjust positions</p>
					<p>• Use AI Refine to detect actual edges</p>
					<p>• Minimum 3 points required</p>
				</div>
			</div>
		</div>
	);
}
