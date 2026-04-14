"use client";

import { WatermarkConfig, WatermarkType } from "@/types/seal";

/**
 * Applies a watermark to a canvas.
 * Can be used to watermark images or document previews.
 */
export function applyWatermarkToCanvas(
	ctx: CanvasRenderingContext2D,
	width: number,
	height: number,
	config: WatermarkConfig,
	sealImageEl?: HTMLImageElement | null,
) {
	const opacity = config.opacity ?? 0.15;

	ctx.save();
	ctx.globalAlpha = opacity;

	if (config.type === WatermarkType.PLATFORM || config.includePlatformBrand) {
		drawPlatformWatermark(ctx, width, height, config.position);
	}

	if (config.type === WatermarkType.SEAL && sealImageEl) {
		drawSealWatermark(ctx, width, height, sealImageEl, config.position);
	}

	if (config.type === WatermarkType.TEXT && config.text) {
		drawTextWatermark(ctx, width, height, config.text, config.position);
	}

	ctx.restore();
}

function drawPlatformWatermark(
	ctx: CanvasRenderingContext2D,
	w: number,
	h: number,
	position?: string,
) {
	ctx.fillStyle = "#000000";
	ctx.font = `bold ${Math.max(w * 0.06, 14)}px sans-serif`;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";

	if (position === "tiled") {
		const step = Math.max(w * 0.3, 120);
		ctx.save();
		ctx.rotate(-0.6);
		for (let y = -h; y < h * 2; y += step) {
			for (let x = -w; x < w * 2; x += step) {
				ctx.fillText("PLOTFOLIO", x, y);
			}
		}
		ctx.restore();
	} else if (position === "bottom-left") {
		ctx.textAlign = "left";
		ctx.fillText("PLOTFOLIO", 20, h - 20);
	} else if (position === "center") {
		ctx.save();
		ctx.translate(w / 2, h / 2);
		ctx.rotate(-0.6);
		ctx.font = `bold ${Math.max(w * 0.1, 24)}px sans-serif`;
		ctx.fillText("PLOTFOLIO", 0, 0);
		ctx.restore();
	} else {
		// bottom-right (default)
		ctx.textAlign = "right";
		ctx.fillText("PLOTFOLIO", w - 20, h - 20);
	}
}

function drawSealWatermark(
	ctx: CanvasRenderingContext2D,
	w: number,
	h: number,
	sealImg: HTMLImageElement,
	position?: string,
) {
	const sealSize = Math.min(w, h) * 0.25;

	let x: number;
	let y: number;

	switch (position) {
		case "center":
			x = (w - sealSize) / 2;
			y = (h - sealSize) / 2;
			break;
		case "bottom-left":
			x = 20;
			y = h - sealSize - 20;
			break;
		case "tiled": {
			const step = sealSize * 2;
			for (let ty = 0; ty < h; ty += step) {
				for (let tx = 0; tx < w; tx += step) {
					ctx.drawImage(sealImg, tx, ty, sealSize, sealSize);
				}
			}
			return;
		}
		default:
			// bottom-right
			x = w - sealSize - 20;
			y = h - sealSize - 20;
	}

	ctx.drawImage(sealImg, x, y, sealSize, sealSize);
}

function drawTextWatermark(
	ctx: CanvasRenderingContext2D,
	w: number,
	h: number,
	text: string,
	position?: string,
) {
	ctx.fillStyle = "#000000";
	ctx.font = `bold ${Math.max(w * 0.05, 12)}px sans-serif`;
	ctx.textBaseline = "middle";

	if (position === "tiled") {
		const step = Math.max(w * 0.3, 100);
		ctx.textAlign = "center";
		ctx.save();
		ctx.rotate(-0.6);
		for (let y = -h; y < h * 2; y += step) {
			for (let x = -w; x < w * 2; x += step) {
				ctx.fillText(text, x, y);
			}
		}
		ctx.restore();
	} else if (position === "center") {
		ctx.textAlign = "center";
		ctx.save();
		ctx.translate(w / 2, h / 2);
		ctx.rotate(-0.6);
		ctx.font = `bold ${Math.max(w * 0.08, 20)}px sans-serif`;
		ctx.fillText(text, 0, 0);
		ctx.restore();
	} else if (position === "bottom-left") {
		ctx.textAlign = "left";
		ctx.fillText(text, 20, h - 20);
	} else {
		ctx.textAlign = "right";
		ctx.fillText(text, w - 20, h - 20);
	}
}

/**
 * Applies a watermark to an image and returns a new data URL.
 * Works for both seal + platform branding.
 */
export async function watermarkImage(
	imageUrl: string,
	config: WatermarkConfig,
	sealImageUrl?: string,
): Promise<string> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.crossOrigin = "anonymous";
		img.onload = () => {
			const canvas = document.createElement("canvas");
			canvas.width = img.naturalWidth;
			canvas.height = img.naturalHeight;
			const ctx = canvas.getContext("2d")!;

			// Draw original image
			ctx.drawImage(img, 0, 0);

			// Load seal if needed then apply
			if (
				config.type === WatermarkType.SEAL &&
				sealImageUrl
			) {
				const sealImg = new Image();
				sealImg.crossOrigin = "anonymous";
				sealImg.onload = () => {
					applyWatermarkToCanvas(
						ctx,
						canvas.width,
						canvas.height,
						config,
						sealImg,
					);
					resolve(canvas.toDataURL("image/png"));
				};
				sealImg.onerror = () => {
					// Still apply without seal
					applyWatermarkToCanvas(ctx, canvas.width, canvas.height, config);
					resolve(canvas.toDataURL("image/png"));
				};
				sealImg.src = sealImageUrl;
			} else {
				applyWatermarkToCanvas(ctx, canvas.width, canvas.height, config);
				resolve(canvas.toDataURL("image/png"));
			}
		};
		img.onerror = () => reject(new Error("Failed to load image"));
		img.src = imageUrl;
	});
}

/* ─── React component: WatermarkOverlay ───────────────────────── */

interface WatermarkOverlayProps {
	/** "PLOTFOLIO" + user seal watermark as CSS overlay */
	sealImageUrl?: string;
	opacity?: number;
	position?: "center" | "bottom-right" | "bottom-left" | "tiled";
	showPlatformBrand?: boolean;
}

/**
 * CSS-only watermark overlay. Add as a child of a `relative` container
 * that wraps the content (image, document, etc.).
 */
export function WatermarkOverlay({
	sealImageUrl,
	opacity = 0.08,
	position = "bottom-right",
	showPlatformBrand = true,
}: WatermarkOverlayProps) {
	if (position === "tiled") {
		return (
			<div
				className="absolute inset-0 pointer-events-none z-10 overflow-hidden"
				style={{ opacity }}
			>
				<div
					className="absolute inset-0"
					style={{
						backgroundImage: sealImageUrl
							? `url(${sealImageUrl})`
							: undefined,
						backgroundSize: "80px 80px",
						backgroundRepeat: "repeat",
						transform: "rotate(-25deg)",
						transformOrigin: "center",
					}}
				/>
				{showPlatformBrand && !sealImageUrl && (
					<div className="absolute inset-0 flex items-center justify-center">
						<span
							className="text-on-surface font-black tracking-[0.3em] whitespace-nowrap select-none"
							style={{
								fontSize: "clamp(32px, 8vw, 80px)",
								transform: "rotate(-35deg)",
							}}
						>
							PLOTFOLIO
						</span>
					</div>
				)}
			</div>
		);
	}

	const positionClasses: Record<string, string> = {
		center: "inset-0 flex items-center justify-center",
		"bottom-right": "bottom-3 right-3",
		"bottom-left": "bottom-3 left-3",
	};

	return (
		<div
			className={`absolute pointer-events-none z-10 ${positionClasses[position] ?? positionClasses["bottom-right"]}`}
			style={{ opacity }}
		>
			{sealImageUrl ? (
				<img
					src={sealImageUrl}
					alt=""
					className={position === "center" ? "w-1/4 h-auto" : "w-16 h-16"}
					style={{ objectFit: "contain" }}
				/>
			) : showPlatformBrand ? (
				<span
					className={`text-on-surface font-black tracking-[0.2em] select-none ${
						position === "center" ? "text-4xl -rotate-35" : "text-sm"
					}`}
				>
					PLOTFOLIO
				</span>
			) : null}
		</div>
	);
}
