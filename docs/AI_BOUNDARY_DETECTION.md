# AI Boundary Detection for Property Mapping

## Overview

The AI Boundary Detection feature allows users to draw rough property boundaries, then uses computer vision and AI to automatically detect and snap to the actual property edges visible in satellite imagery.

## Current Implementation

### Status: ✅ FREE Edge Detection Implemented

The system now uses **FREE computer vision algorithms** (Canny edge detection) with Mapbox satellite imagery - **no API costs!**

### Two-Step Process

1. **Manual Drawing** - Users click points to create a rough polygon around their property
2. **Edge Detection Refinement** - Canny edge detection algorithm analyzes Mapbox satellite imagery to snap boundaries to actual property edges

### Cost: $0 💰

- Uses existing Mapbox token (already paid for)
- Server-side edge detection (no additional API calls)
- No quota limits or usage restrictions

### API Endpoint

`POST /api/boundaries/refine`

**Request:**

```json
{
	"points": [
		{ "lat": 8.9317, "lng": 7.3244 },
		{ "lat": 8.9318, "lng": 7.3245 }
	],
	"coordinates": { "lat": 8.9317, "lng": 7.3244 },
	"bounds": {
		"north": 8.932,
		"south": 8.931,
		"east": 7.325,
		"west": 7.323
	}
}
```

**Response:**

```json
{
  "success": true,
  "surveyData": {
    "coordinates": [...],
    "area": 1250,
    "boundaries": [...]
  },
  "message": "Boundary refined using AI detection"
}
```

## Integration with AI Services

### Option 1: Google Maps AI (Recommended)

Use Google's Solar API or Places API for property boundary detection:

```typescript
// Get satellite imagery
const response = await fetch(
	`https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=20&size=1024x1024&maptype=satellite&key=${API_KEY}`
);

// Use Google Cloud Vision API for edge detection
const visionClient = new ImageAnnotatorClient();
const [result] = await visionClient.objectLocalization(imageBuffer);
```

### Option 2: OpenCV + Machine Learning

Use computer vision for edge detection:

```python
import cv2
import numpy as np
from shapely.geometry import Polygon

def detect_property_boundary(image, rough_points):
    # Convert to grayscale
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    # Apply Canny edge detection
    edges = cv2.Canny(gray, 50, 150)

    # Find contours
    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    # Find contour closest to rough points
    rough_polygon = Polygon(rough_points)
    best_contour = find_closest_contour(contours, rough_polygon)

    # Simplify and return refined boundary
    return simplify_contour(best_contour)
```

### Option 3: Custom ML Model

Train a model on property imagery:

```typescript
// Use TensorFlow.js for browser-based detection
import * as tf from "@tensorflow/tfjs";

async function refineBoundary(imageData: ImageData, roughPoints: Point[]) {
	// Load pre-trained model
	const model = await tf.loadGraphModel("/models/property-boundary/model.json");

	// Prepare image tensor
	const tensor = tf.browser
		.fromPixels(imageData)
		.resizeNearestNeighbor([512, 512])
		.toFloat()
		.div(255.0)
		.expandDims();

	// Run inference
	const predictions = await model.predict(tensor);

	// Extract boundary coordinates
	return extractBoundaryFromPrediction(predictions, roughPoints);
}
```

## Implementation Steps

### Phase 1: Mock Implementation (Current)

- ✅ Manual boundary drawing
- ✅ API endpoint structure
- ✅ UI for AI refinement button
- ⏳ Mock refinement (slight adjustments)

### Phase 2: Basic Edge Detection

- [ ] Integrate satellite imagery API (Google/Mapbox)
- [ ] Implement basic edge detection (Canny/Sobel)
- [ ] Snap rough points to detected edges
- [ ] Calculate accurate area from refined boundary

### Phase 3: Advanced AI Detection

- [ ] Train ML model on property imagery
- [ ] Implement semantic segmentation for land parcels
- [ ] Handle complex boundary cases (curved edges, partial occlusion)
- [ ] Add confidence scores and manual override

### Phase 4: Production Features

- [ ] Cache refined boundaries
- [ ] Batch processing for multiple properties
- [ ] User feedback loop for improving accuracy
- [ ] Integration with legal survey documents

## Configuration

### Environment Variables

```bash
# For Google Maps/Vision API
GOOGLE_MAPS_API_KEY=your_key_here
GOOGLE_VISION_API_KEY=your_key_here

# For custom ML service
ML_SERVICE_URL=https://your-ml-api.com
ML_API_KEY=your_key_here

# For Mapbox satellite imagery
MAPBOX_ACCESS_TOKEN=your_token_here
```

## Usage in Components

```typescript
// In ManualBoundaryDrawer.tsx
const handleRefineWithAI = async () => {
	setIsRefining(true);

	const response = await fetch("/api/boundaries/refine", {
		method: "POST",
		body: JSON.stringify({
			points: manualPoints,
			coordinates: propertyCenter,
			mapBounds: currentMapBounds,
		}),
	});

	const refined = await response.json();
	onBoundaryComplete(refined.surveyData);
};
```

## Future Enhancements

1. **Multi-Source Detection** - Combine multiple satellite imagery sources
2. **Historical Comparison** - Compare with historical imagery for changes
3. **3D Boundary Detection** - Detect building heights and structures
4. **Legal Document OCR** - Extract boundaries from scanned survey documents
5. **Blockchain Verification** - Store boundary hashes for immutability

## Testing

```typescript
// Test with known property boundaries
const testCases = [
  {
    roughPoints: [...],
    expectedRefined: [...],
    tolerance: 5 // meters
  }
];

testCases.forEach(test => {
  const refined = await refineBoundary(test.roughPoints);
  assertWithinTolerance(refined, test.expectedRefined, test.tolerance);
});
```

## Nigerian Context

For properties in Nigeria (Abuja region):

- Use Esri World Imagery (higher resolution for West Africa)
- Account for seasonal changes (rainy vs dry season imagery)
- Consider informal boundary markers (fences, trees, roads)
- Validate against C of O (Certificate of Occupancy) documents

---

**Status:** Phase 1 Complete | Phase 2 In Progress
**Last Updated:** November 3, 2025
