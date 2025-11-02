import { SurveyData } from "@/types/property";
import L from "leaflet";
import { useEffect } from "react";
import { useMap } from "react-leaflet";

interface CustomPlotBoundaryProps {
	surveyData: SurveyData[];
	selectedPlotId?: string;
	onPlotClick?: (surveyData: SurveyData) => void;
}

export default function CustomPlotBoundary({
	surveyData,
	selectedPlotId,
	onPlotClick,
}: CustomPlotBoundaryProps) {
	const map = useMap();

	useEffect(() => {
		const plotLayers: L.LayerGroup[] = [];

		surveyData.forEach((survey) => {
			const layerGroup = L.layerGroup();
			const isSelected = selectedPlotId === survey.plotNumber;

			// Create polygon from coordinates
			if (survey.coordinates.length >= 3) {
				const polygonCoords: [number, number][] = survey.coordinates.map(
					(coord) => [coord.lat, coord.lng]
				);

				// Close the polygon by adding first point at the end
				polygonCoords.push(polygonCoords[0]);

				// Create the plot boundary polygon
				const polygon = L.polygon(polygonCoords, {
					color: isSelected ? "#3B82F6" : "#059669",
					weight: isSelected ? 3 : 2,
					opacity: 0.8,
					fillColor: isSelected ? "#3B82F6" : "#059669",
					fillOpacity: isSelected ? 0.2 : 0.1,
					className: "custom-plot-boundary",
				});

				// Add click handler
				polygon.on("click", () => {
					onPlotClick?.(survey);
				});

				// Add popup with plot details
				const popupContent = `
          <div class="p-3 min-w-[200px]">
            <h3 class="font-semibold text-lg mb-2">Plot ${
							survey.plotNumber
						}</h3>
            <p class="text-sm text-gray-600 mb-2">Area: ${survey.area} sqm</p>
            ${
							survey.registrationNumber
								? `<p class="text-xs text-gray-500 mb-2">${survey.registrationNumber}</p>`
								: ""
						}
            <div class="text-xs text-gray-600">
              <p class="font-medium mb-1">Boundaries:</p>
              ${survey.boundaries
								.map(
									(boundary) =>
										`<p>• ${boundary.from}→${boundary.to}: ${boundary.distance}m</p>`
								)
								.join("")}
            </div>
            ${
							survey.surveyor
								? `<p class="text-xs text-gray-500 mt-2">Surveyor: ${survey.surveyor}</p>`
								: ""
						}
          </div>
        `;

				polygon.bindPopup(popupContent);
				layerGroup.addLayer(polygon);

				// Add coordinate points
				survey.coordinates.forEach((coord, index) => {
					const marker = L.circleMarker([coord.lat, coord.lng], {
						radius: isSelected ? 6 : 4,
						color: isSelected ? "#3B82F6" : "#059669",
						weight: 2,
						fillColor: "white",
						fillOpacity: 1,
					});

					// Add point label
					const pointLabel = L.divIcon({
						className: "plot-point-label",
						html: `
              <div style="
                background: ${isSelected ? "#3B82F6" : "#059669"};
                color: white;
                border-radius: 50%;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 10px;
                font-weight: bold;
                border: 2px solid white;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
              ">
                ${coord.point}
              </div>
            `,
						iconSize: [20, 20],
						iconAnchor: [10, 10],
					});

					const pointMarker = L.marker([coord.lat, coord.lng], {
						icon: pointLabel,
					});

					if (coord.description) {
						pointMarker.bindTooltip(coord.description, {
							permanent: false,
							direction: "top",
							className: "plot-point-tooltip",
						});
					}

					layerGroup.addLayer(pointMarker);
				});

				// Add measurement labels on boundaries
				survey.boundaries.forEach((boundary) => {
					const fromCoord = survey.coordinates.find(
						(c) => c.point === boundary.from
					);
					const toCoord = survey.coordinates.find(
						(c) => c.point === boundary.to
					);

					if (fromCoord && toCoord) {
						// Calculate midpoint for label placement
						const midLat = (fromCoord.lat + toCoord.lat) / 2;
						const midLng = (fromCoord.lng + toCoord.lng) / 2;

						const measurementLabel = L.divIcon({
							className: "measurement-label",
							html: `
                <div style="
                  background: rgba(255, 255, 255, 0.9);
                  padding: 2px 6px;
                  border-radius: 4px;
                  font-size: 10px;
                  font-weight: bold;
                  color: ${isSelected ? "#3B82F6" : "#059669"};
                  border: 1px solid ${isSelected ? "#3B82F6" : "#059669"};
                  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
                  white-space: nowrap;
                ">
                  ${boundary.distance}m
                </div>
              `,
							iconSize: [40, 16],
							iconAnchor: [20, 8],
						});

						const measurementMarker = L.marker([midLat, midLng], {
							icon: measurementLabel,
						});
						layerGroup.addLayer(measurementMarker);
					}
				});

				// Add plot number label in center
				if (polygonCoords.length > 0) {
					// Calculate centroid
					const centerLat =
						polygonCoords.reduce((sum, coord) => sum + coord[0], 0) /
						polygonCoords.length;
					const centerLng =
						polygonCoords.reduce((sum, coord) => sum + coord[1], 0) /
						polygonCoords.length;

					const plotLabel = L.divIcon({
						className: "plot-number-label",
						html: `
              <div style="
                background: ${isSelected ? "#3B82F6" : "#059669"};
                color: white;
                padding: 4px 8px;
                border-radius: 6px;
                font-size: 12px;
                font-weight: bold;
                border: 2px solid white;
                box-shadow: 0 2px 6px rgba(0,0,0,0.4);
                white-space: nowrap;
              ">
                PLOT ${survey.plotNumber}
              </div>
            `,
						iconSize: [60, 24],
						iconAnchor: [30, 12],
					});

					const centerMarker = L.marker([centerLat, centerLng], {
						icon: plotLabel,
					});
					layerGroup.addLayer(centerMarker);
				}
			}

			layerGroup.addTo(map);
			plotLayers.push(layerGroup);
		});

		return () => {
			plotLayers.forEach((layer) => {
				map.removeLayer(layer);
			});
		};
	}, [map, surveyData, selectedPlotId, onPlotClick]);

	return null;
}
