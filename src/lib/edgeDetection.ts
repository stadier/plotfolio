/**
 * Free Edge Detection using Canvas API and Computer Vision Algorithms
 * No API costs - runs entirely in browser or server-side
 */

export interface Point {
	lat: number;
	lng: number;
}

export interface EdgeDetectionResult {
	refinedPoints: Array<{ lat: number; lng: number; point: string }>;
	confidence: number;
	detectedFeatures: string[];
	notes: string;
}

/**
 * Detect edges from satellite imagery using Canny edge detection algorithm
 */
export async function detectEdgesFromImage(
	imageUrl: string,
	roughPoints: Point[],
	bounds: { north: number; south: number; east: number; west: number }
): Promise<EdgeDetectionResult> {
	try {
		// Fetch the satellite image
		const response = await fetch(imageUrl);
		const blob = await response.blob();

		// Convert to ImageData for processing
		const imageData = await blobToImageData(blob);

		// Apply Canny edge detection
		const edges = cannyEdgeDetection(imageData);

		// Find contours near the rough boundary points
		const refinedPoints = refinePointsUsingEdges(roughPoints, edges, bounds);

		return {
			refinedPoints: refinedPoints.map((p, i) => ({
				...p,
				point: `P${i + 1}`,
			})),
			confidence: 0.75,
			detectedFeatures: ["canny-edge-detection", "contour-analysis"],
			notes: "Boundary refined using free computer vision algorithms",
		};
	} catch (error) {
		console.error("Edge detection failed:", error);
		// Fallback to geometric refinement
		return geometricRefinement(roughPoints);
	}
}

/**
 * Convert blob to ImageData for Canvas processing
 */
async function blobToImageData(blob: Blob): Promise<ImageData> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => {
			const canvas = document.createElement("canvas");
			canvas.width = img.width;
			canvas.height = img.height;
			const ctx = canvas.getContext("2d");

			if (!ctx) {
				reject(new Error("Failed to get canvas context"));
				return;
			}

			ctx.drawImage(img, 0, 0);
			const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
			resolve(imageData);
		};
		img.onerror = reject;
		img.src = URL.createObjectURL(blob);
	});
}

/**
 * Canny Edge Detection Algorithm
 * Steps: Gaussian blur → Gradient calculation → Non-maximum suppression → Hysteresis
 */
function cannyEdgeDetection(imageData: ImageData): ImageData {
	const width = imageData.width;
	const height = imageData.height;
	const data = imageData.data;

	// Step 1: Convert to grayscale
	const gray = new Uint8ClampedArray(width * height);
	for (let i = 0; i < data.length; i += 4) {
		const idx = i / 4;
		gray[idx] = Math.floor(
			0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
		);
	}

	// Step 2: Apply Gaussian blur (5x5 kernel)
	const blurred = gaussianBlur(gray, width, height);

	// Step 3: Calculate gradients using Sobel operator
	const { magnitude, direction } = sobelOperator(blurred, width, height);

	// Step 4: Non-maximum suppression
	const suppressed = nonMaximumSuppression(magnitude, direction, width, height);

	// Step 5: Double threshold and edge tracking
	const edges = hysteresisThreshold(suppressed, width, height, 50, 100);

	// Convert back to ImageData
	const edgeData = new ImageData(width, height);
	for (let i = 0; i < edges.length; i++) {
		const idx = i * 4;
		const val = edges[i];
		edgeData.data[idx] = val;
		edgeData.data[idx + 1] = val;
		edgeData.data[idx + 2] = val;
		edgeData.data[idx + 3] = 255;
	}

	return edgeData;
}

/**
 * Gaussian blur filter (5x5 kernel)
 */
function gaussianBlur(
	data: Uint8ClampedArray,
	width: number,
	height: number
): Uint8ClampedArray {
	const kernel = [
		[2, 4, 5, 4, 2],
		[4, 9, 12, 9, 4],
		[5, 12, 15, 12, 5],
		[4, 9, 12, 9, 4],
		[2, 4, 5, 4, 2],
	];
	const kernelSum = 159;

	const output = new Uint8ClampedArray(width * height);

	for (let y = 2; y < height - 2; y++) {
		for (let x = 2; x < width - 2; x++) {
			let sum = 0;
			for (let ky = 0; ky < 5; ky++) {
				for (let kx = 0; kx < 5; kx++) {
					const px = x + kx - 2;
					const py = y + ky - 2;
					sum += data[py * width + px] * kernel[ky][kx];
				}
			}
			output[y * width + x] = Math.floor(sum / kernelSum);
		}
	}

	return output;
}

/**
 * Sobel operator for gradient calculation
 */
function sobelOperator(
	data: Uint8ClampedArray,
	width: number,
	height: number
): { magnitude: Float32Array; direction: Float32Array } {
	const magnitude = new Float32Array(width * height);
	const direction = new Float32Array(width * height);

	const sobelX = [
		[-1, 0, 1],
		[-2, 0, 2],
		[-1, 0, 1],
	];
	const sobelY = [
		[-1, -2, -1],
		[0, 0, 0],
		[1, 2, 1],
	];

	for (let y = 1; y < height - 1; y++) {
		for (let x = 1; x < width - 1; x++) {
			let gx = 0;
			let gy = 0;

			for (let ky = 0; ky < 3; ky++) {
				for (let kx = 0; kx < 3; kx++) {
					const px = x + kx - 1;
					const py = y + ky - 1;
					const val = data[py * width + px];
					gx += val * sobelX[ky][kx];
					gy += val * sobelY[ky][kx];
				}
			}

			const idx = y * width + x;
			magnitude[idx] = Math.sqrt(gx * gx + gy * gy);
			direction[idx] = Math.atan2(gy, gx);
		}
	}

	return { magnitude, direction };
}

/**
 * Non-maximum suppression
 */
function nonMaximumSuppression(
	magnitude: Float32Array,
	direction: Float32Array,
	width: number,
	height: number
): Uint8ClampedArray {
	const output = new Uint8ClampedArray(width * height);

	for (let y = 1; y < height - 1; y++) {
		for (let x = 1; x < width - 1; x++) {
			const idx = y * width + x;
			const angle = direction[idx];
			const mag = magnitude[idx];

			// Determine gradient direction (0°, 45°, 90°, 135°)
			const angleDeg = (angle * 180) / Math.PI;
			const roundedAngle = Math.round(angleDeg / 45) * 45;

			let neighbor1 = 0;
			let neighbor2 = 0;

			if (roundedAngle === 0 || roundedAngle === 180) {
				neighbor1 = magnitude[idx - 1];
				neighbor2 = magnitude[idx + 1];
			} else if (roundedAngle === 45 || roundedAngle === -135) {
				neighbor1 = magnitude[idx - width + 1];
				neighbor2 = magnitude[idx + width - 1];
			} else if (roundedAngle === 90 || roundedAngle === -90) {
				neighbor1 = magnitude[idx - width];
				neighbor2 = magnitude[idx + width];
			} else {
				neighbor1 = magnitude[idx - width - 1];
				neighbor2 = magnitude[idx + width + 1];
			}

			if (mag >= neighbor1 && mag >= neighbor2) {
				output[idx] = Math.min(255, Math.floor(mag));
			}
		}
	}

	return output;
}

/**
 * Hysteresis thresholding for edge tracking
 */
function hysteresisThreshold(
	data: Uint8ClampedArray,
	width: number,
	height: number,
	lowThreshold: number,
	highThreshold: number
): Uint8ClampedArray {
	const output = new Uint8ClampedArray(width * height);

	// Strong edges
	for (let i = 0; i < data.length; i++) {
		if (data[i] >= highThreshold) {
			output[i] = 255;
		}
	}

	// Track weak edges connected to strong edges
	for (let y = 1; y < height - 1; y++) {
		for (let x = 1; x < width - 1; x++) {
			const idx = y * width + x;
			if (data[idx] >= lowThreshold && data[idx] < highThreshold) {
				// Check if connected to strong edge
				for (let dy = -1; dy <= 1; dy++) {
					for (let dx = -1; dx <= 1; dx++) {
						const nIdx = (y + dy) * width + (x + dx);
						if (output[nIdx] === 255) {
							output[idx] = 255;
							break;
						}
					}
				}
			}
		}
	}

	return output;
}

/**
 * Refine boundary points using detected edges
 */
function refinePointsUsingEdges(
	roughPoints: Point[],
	edges: ImageData,
	bounds: { north: number; south: number; east: number; west: number }
): Point[] {
	const { width, height, data } = edges;

	return roughPoints.map((point) => {
		// Convert lat/lng to pixel coordinates
		const x = Math.floor(
			((point.lng - bounds.west) / (bounds.east - bounds.west)) * width
		);
		const y = Math.floor(
			((bounds.north - point.lat) / (bounds.north - bounds.south)) * height
		);

		// Search for nearest edge in a radius
		const searchRadius = 20;
		let bestX = x;
		let bestY = y;
		let maxEdgeStrength = 0;

		for (let dy = -searchRadius; dy <= searchRadius; dy++) {
			for (let dx = -searchRadius; dx <= searchRadius; dx++) {
				const px = x + dx;
				const py = y + dy;

				if (px >= 0 && px < width && py >= 0 && py < height) {
					const idx = (py * width + px) * 4;
					const edgeStrength = data[idx];

					if (edgeStrength > maxEdgeStrength) {
						maxEdgeStrength = edgeStrength;
						bestX = px;
						bestY = py;
					}
				}
			}
		}

		// Convert back to lat/lng
		const refinedLng =
			bounds.west + (bestX / width) * (bounds.east - bounds.west);
		const refinedLat =
			bounds.north - (bestY / height) * (bounds.north - bounds.south);

		return { lat: refinedLat, lng: refinedLng };
	});
}

/**
 * Geometric refinement fallback (when edge detection fails)
 */
function geometricRefinement(points: Point[]): EdgeDetectionResult {
	// Apply smoothing
	const smoothed = smoothPolygon(points, 0.3);
	const regularized = regularizeAngles(smoothed);

	return {
		refinedPoints: regularized.map((p, i) => ({
			...p,
			point: `P${i + 1}`,
		})),
		confidence: 0.6,
		detectedFeatures: ["geometric-smoothing", "angle-regularization"],
		notes: "Boundary refined using geometric algorithms",
	};
}

function smoothPolygon(points: Point[], weight: number): Point[] {
	if (points.length < 3) return points;

	return points.map((point, i) => {
		const prev = points[(i - 1 + points.length) % points.length];
		const next = points[(i + 1) % points.length];

		return {
			lat: point.lat * (1 - weight) + (prev.lat + next.lat) * (weight / 2),
			lng: point.lng * (1 - weight) + (prev.lng + next.lng) * (weight / 2),
		};
	});
}

function regularizeAngles(points: Point[]): Point[] {
	if (points.length < 3) return points;

	const regularized = [...points];
	const commonAngles = [0, 45, 90, 135, 180, 225, 270, 315];

	for (let i = 0; i < points.length; i++) {
		const prev = points[(i - 1 + points.length) % points.length];
		const curr = points[i];
		const next = points[(i + 1) % points.length];

		const angle1 = Math.atan2(curr.lat - prev.lat, curr.lng - prev.lng);
		const angle2 = Math.atan2(next.lat - curr.lat, next.lng - curr.lng);
		const angleDiff = ((angle2 - angle1) * 180) / Math.PI;

		const normalized = ((angleDiff % 360) + 360) % 360;
		const nearest = commonAngles.reduce((prev, curr) =>
			Math.abs(curr - normalized) < Math.abs(prev - normalized) ? curr : prev
		);

		if (Math.abs(nearest - normalized) < 15) {
			const adjustment = ((nearest - normalized) * Math.PI) / 180;
			const distance = Math.sqrt(
				Math.pow(next.lat - curr.lat, 2) + Math.pow(next.lng - curr.lng, 2)
			);

			regularized[i] = {
				lat: curr.lat + Math.sin(angle1 + adjustment) * distance * 0.1,
				lng: curr.lng + Math.cos(angle1 + adjustment) * distance * 0.1,
			};
		}
	}

	return regularized;
}
