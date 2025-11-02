"use client";

import { SurveyData } from "@/types/property";
import L from "leaflet";
import { MapPin, Pencil, Save, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useMap, useMapEvents } from "react-leaflet";

interface ManualBoundaryDrawerProps {
	propertyId: string;
	onBoundaryComplete: (surveyData: SurveyData) => void;
	onCancel: () => void;
	existingBoundary?: SurveyData;
}

export default function ManualBoundaryDrawer({
	propertyId,
	onBoundaryComplete,
	onCancel,
	existingBoundary,
}: ManualBoundaryDrawerProps) {
	const map = useMap();
	const [points, setPoints] = useState<{ lat: number; lng: number }[]>(
		existingBoundary?.coordinates.map((c) => ({ lat: c.lat, lng: c.lng })) || []
	);
	const [isDrawing, setIsDrawing] = useState(false);
	const [markers, setMarkers] = useState<L.Marker[]>([]);
	const [polyline, setPolyline] = useState<L.Polyline | null>(null);

	// Handle map clicks to add boundary points
	useMapEvents({
		click(e) {
			if (isDrawing) {
				const newPoint = { lat: e.latlng.lat, lng: e.latlng.lng };
				setPoints((prev) => [...prev, newPoint]);
			}
		},
	});

	// Draw markers and polyline for boundary points
	useEffect(() => {
		// Clear existing markers
		markers.forEach((marker) => marker.remove());

		if (points.length === 0) {
			setMarkers([]);
			if (polyline) polyline.remove();
			return;
		}

		// Create markers for each point
		const newMarkers = points.map((point, index) => {
			const marker = L.marker([point.lat, point.lng], {
				icon: L.divIcon({
					className: "custom-boundary-marker",
					html: `<div style="
						background: #2563eb;
						color: white;
						width: 30px;
						height: 30px;
						border-radius: 50%;
						display: flex;
						align-items: center;
						justify-content: center;
						font-weight: bold;
						border: 2px solid white;
						box-shadow: 0 2px 4px rgba(0,0,0,0.3);
					">${index + 1}</div>`,
					iconSize: [30, 30],
					iconAnchor: [15, 15],
				}),
			}).addTo(map);

			// Make markers draggable
			marker.on("drag", (e) => {
				const newLat = e.target.getLatLng().lat;
				const newLng = e.target.getLatLng().lng;
				setPoints((prev) =>
					prev.map((p, i) => (i === index ? { lat: newLat, lng: newLng } : p))
				);
			});

			marker.dragging?.enable();

			return marker;
		});

		setMarkers(newMarkers);

		// Draw polyline connecting the points
		if (polyline) polyline.remove();

		if (points.length >= 2) {
			const latLngs = points.map((p) => [p.lat, p.lng] as [number, number]);
			const newPolyline = L.polyline(latLngs, {
				color: "#2563eb",
				weight: 3,
				opacity: 0.8,
				dashArray: "10, 5",
			}).addTo(map);

			setPolyline(newPolyline);
		}

		// Cleanup function
		return () => {
			newMarkers.forEach((marker) => marker.remove());
			if (polyline) polyline.remove();
		};
	}, [points, map]);

	const handleStartDrawing = () => {
		setIsDrawing(true);
	};

	const handleStopDrawing = () => {
		setIsDrawing(false);
	};

	const handleUndo = () => {
		setPoints((prev) => prev.slice(0, -1));
	};

	const handleClear = () => {
		setPoints([]);
		setIsDrawing(false);
	};

	const handleSave = () => {
		if (points.length < 3) {
			alert("Please add at least 3 points to create a boundary");
			return;
		}

		// Calculate area using Shoelace formula
		const calculateArea = (coords: { lat: number; lng: number }[]) => {
			let area = 0;
			const n = coords.length;

			for (let i = 0; i < n; i++) {
				const j = (i + 1) % n;
				area += coords[i].lng * coords[j].lat;
				area -= coords[j].lng * coords[i].lat;
			}

			// Convert to square meters (approximate)
			const areaSqMeters = Math.abs(area / 2) * 111320 * 111320;
			return Math.round(areaSqMeters);
		};

		// Create survey data from manual boundary
		const surveyData: SurveyData = {
			coordinates: points.map((p, i) => ({
				point: String.fromCharCode(65 + i), // A, B, C, D...
				lat: p.lat,
				lng: p.lng,
			})),
			boundaries: points.map((p, i) => {
				const nextIndex = (i + 1) % points.length;
				const nextPoint = points[nextIndex];
				const distance = map.distance(
					[p.lat, p.lng],
					[nextPoint.lat, nextPoint.lng]
				);

				return {
					from: String.fromCharCode(65 + i),
					to: String.fromCharCode(65 + nextIndex),
					distance: Math.round(distance),
				};
			}),
			measurements: [],
			bearings: [],
			area: calculateArea(points),
			registrationNumber:
				existingBoundary?.registrationNumber || `MANUAL-${Date.now()}`,
			surveyDate: new Date(),
			surveyor: "Manual Entry",
		};

		onBoundaryComplete(surveyData);
	};

	return (
		<div className="absolute top-20 left-4 z-1000 bg-white rounded-lg shadow-xl border border-gray-200 p-4 max-w-sm">
			<div className="flex items-center justify-between mb-4">
				<h3 className="font-semibold text-gray-900 flex items-center gap-2">
					<Pencil className="w-5 h-5 text-blue-600" />
					Draw Boundary
				</h3>
				<button
					onClick={onCancel}
					className="text-gray-400 hover:text-gray-600"
				>
					<X className="w-5 h-5" />
				</button>
			</div>

			<div className="space-y-3">
				<div className="text-sm text-gray-600">
					{isDrawing ? (
						<div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
							<p className="font-medium text-blue-900 mb-1">
								Click on the map to add boundary points
							</p>
							<p className="text-blue-700">
								{points.length} point{points.length !== 1 ? "s" : ""} added
							</p>
						</div>
					) : (
						<p>
							Click "Start Drawing" to begin marking your boundary points on the
							map.
						</p>
					)}
				</div>

				{/* Control Buttons */}
				<div className="space-y-2">
					{!isDrawing ? (
						<button
							onClick={handleStartDrawing}
							className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
						>
							<MapPin className="w-4 h-4" />
							Start Drawing
						</button>
					) : (
						<button
							onClick={handleStopDrawing}
							className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
						>
							Stop Drawing
						</button>
					)}

					{points.length > 0 && (
						<>
							<button
								onClick={handleUndo}
								className="w-full px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
								disabled={points.length === 0}
							>
								Undo Last Point
							</button>

							<button
								onClick={handleClear}
								className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
							>
								<Trash2 className="w-4 h-4" />
								Clear All
							</button>

							<button
								onClick={handleSave}
								className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
								disabled={points.length < 3}
							>
								<Save className="w-4 h-4" />
								Save Boundary ({points.length} points)
							</button>
						</>
					)}
				</div>

				{/* Instructions */}
				<div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
					<p className="font-medium mb-1">Tips:</p>
					<ul className="list-disc list-inside space-y-1">
						<li>Add at least 3 points to create a boundary</li>
						<li>Drag markers to adjust positions</li>
						<li>Points will be connected automatically</li>
						<li>Click "Save" when finished</li>
					</ul>
				</div>
			</div>
		</div>
	);
}
