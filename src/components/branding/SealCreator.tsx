"use client";

import { SealConfig, SealShape } from "@/types/seal";
import { useCallback, useEffect, useRef, useState } from "react";

interface SealPreviewProps {
	config: SealConfig;
	size?: number;
	className?: string;
}

/** Renders a seal onto a canvas and returns a data URL */
export function renderSealToDataUrl(
	config: SealConfig,
	size: number = 200,
): string {
	const canvas = document.createElement("canvas");
	const scale = 2; // retina
	canvas.width = size * scale;
	canvas.height = size * scale;
	const ctx = canvas.getContext("2d")!;
	ctx.scale(scale, scale);

	drawSeal(ctx, config, size);

	return canvas.toDataURL("image/png");
}

function drawSeal(
	ctx: CanvasRenderingContext2D,
	config: SealConfig,
	size: number,
) {
	const cx = size / 2;
	const cy = size / 2;
	const r = size / 2 - 4;
	const borderWidth = config.borderWidth ?? 3;
	const color = config.color || "#1e3a5f";
	const bgColor = config.backgroundColor || "transparent";
	const fontFamily = config.fontFamily || "Georgia, serif";

	ctx.clearRect(0, 0, size, size);

	// Background
	if (bgColor !== "transparent") {
		ctx.fillStyle = bgColor;
		drawShape(ctx, config.shape, cx, cy, r, true);
	}

	// Border
	ctx.strokeStyle = color;
	ctx.lineWidth = borderWidth;
	drawShape(ctx, config.shape, cx, cy, r, false);

	// Inner border (double-line for official look)
	if (config.shape === SealShape.CIRCLE) {
		ctx.beginPath();
		ctx.arc(cx, cy, r - borderWidth * 2.5, 0, Math.PI * 2);
		ctx.stroke();
	}

	// Outer text (circular)
	if (config.outerText && config.shape === SealShape.CIRCLE) {
		ctx.save();
		ctx.fillStyle = color;
		ctx.font = `bold ${size * 0.07}px ${fontFamily}`;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";

		const textRadius = r - borderWidth * 4.5;
		const text = config.outerText.toUpperCase();
		const angleStep = (Math.PI * 1.4) / Math.max(text.length, 1);
		const startAngle = -Math.PI / 2 - (angleStep * (text.length - 1)) / 2;

		for (let i = 0; i < text.length; i++) {
			const angle = startAngle + i * angleStep;
			ctx.save();
			ctx.translate(
				cx + textRadius * Math.cos(angle),
				cy + textRadius * Math.sin(angle),
			);
			ctx.rotate(angle + Math.PI / 2);
			ctx.fillText(text[i], 0, 0);
			ctx.restore();
		}
		ctx.restore();
	}

	// Center text lines
	ctx.fillStyle = color;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";

	const lines = config.text.filter((l) => l.trim());
	const totalLines = lines.length;
	const lineHeight = Math.min(size * 0.13, 24);
	const startY = cy - ((totalLines - 1) * lineHeight) / 2;

	lines.forEach((line, i) => {
		const fontSize =
			i === 0 ? Math.min(size * 0.12, 22) : Math.min(size * 0.09, 16);
		ctx.font = `${i === 0 ? "bold" : "normal"} ${fontSize}px ${fontFamily}`;
		ctx.fillText(line.toUpperCase(), cx, startY + i * lineHeight);
	});

	// Logo
	// Note: logo rendering requires image loading which is async.
	// For canvas preview, logos are overlaid via an <img> tag in the component.
}

function drawShape(
	ctx: CanvasRenderingContext2D,
	shape: SealShape,
	cx: number,
	cy: number,
	r: number,
	fill: boolean,
) {
	ctx.beginPath();

	switch (shape) {
		case SealShape.CIRCLE:
			ctx.arc(cx, cy, r, 0, Math.PI * 2);
			break;
		case SealShape.RECTANGLE:
			ctx.rect(cx - r, cy - r * 0.7, r * 2, r * 1.4);
			break;
		case SealShape.ROUNDED_RECTANGLE: {
			const w = r * 2;
			const h = r * 1.4;
			const x = cx - r;
			const y = cy - r * 0.7;
			const radius = 12;
			ctx.moveTo(x + radius, y);
			ctx.lineTo(x + w - radius, y);
			ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
			ctx.lineTo(x + w, y + h - radius);
			ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
			ctx.lineTo(x + radius, y + h);
			ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
			ctx.lineTo(x, y + radius);
			ctx.quadraticCurveTo(x, y, x + radius, y);
			break;
		}
		case SealShape.DIAMOND:
			ctx.moveTo(cx, cy - r);
			ctx.lineTo(cx + r, cy);
			ctx.lineTo(cx, cy + r);
			ctx.lineTo(cx - r, cy);
			ctx.closePath();
			break;
	}

	if (fill) ctx.fill();
	else ctx.stroke();
}

/* ─── Seal Preview — renders config to a canvas ───────────────── */

export function SealPreview({
	config,
	size = 200,
	className,
}: SealPreviewProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const scale = 2;
		canvas.width = size * scale;
		canvas.height = size * scale;
		const ctx = canvas.getContext("2d")!;
		ctx.scale(scale, scale);
		drawSeal(ctx, config, size);
	}, [config, size]);

	return (
		<canvas
			ref={canvasRef}
			width={size * 2}
			height={size * 2}
			className={className}
			style={{ width: size, height: size }}
		/>
	);
}

/* ─── Seal Creator — full form with live preview ──────────────── */

interface SealCreatorProps {
	initialConfig?: Partial<SealConfig>;
	onSave: (config: SealConfig, name: string, imageDataUrl: string) => void;
	onCancel: () => void;
	saving?: boolean;
}

const SHAPE_OPTIONS: { value: SealShape; label: string }[] = [
	{ value: SealShape.CIRCLE, label: "Circle" },
	{ value: SealShape.ROUNDED_RECTANGLE, label: "Rounded Rectangle" },
	{ value: SealShape.RECTANGLE, label: "Rectangle" },
	{ value: SealShape.DIAMOND, label: "Diamond" },
];

const PRESET_COLORS = [
	"#1e3a5f",
	"#8b0000",
	"#006400",
	"#4a0e4e",
	"#2d2d2d",
	"#b8860b",
	"#004d4d",
	"#333399",
];

export default function SealCreator({
	initialConfig,
	onSave,
	onCancel,
	saving,
}: SealCreatorProps) {
	const [name, setName] = useState("");
	const [textLines, setTextLines] = useState<string[]>(
		initialConfig?.text ?? ["", ""],
	);
	const [outerText, setOuterText] = useState(initialConfig?.outerText ?? "");
	const [shape, setShape] = useState<SealShape>(
		initialConfig?.shape ?? SealShape.CIRCLE,
	);
	const [color, setColor] = useState(initialConfig?.color ?? "#1e3a5f");
	const [bgColor, setBgColor] = useState(initialConfig?.backgroundColor ?? "");
	const [borderWidth, setBorderWidth] = useState(
		initialConfig?.borderWidth ?? 3,
	);

	const config: SealConfig = {
		text: textLines.filter((l) => l.trim()),
		outerText: outerText || undefined,
		shape,
		color,
		backgroundColor: bgColor || undefined,
		borderWidth,
		size: 200,
	};

	const updateLine = useCallback((index: number, value: string) => {
		setTextLines((prev) => {
			const next = [...prev];
			next[index] = value;
			return next;
		});
	}, []);

	const addLine = () => {
		if (textLines.length < 4) setTextLines((prev) => [...prev, ""]);
	};

	const removeLine = (index: number) => {
		if (textLines.length > 1) {
			setTextLines((prev) => prev.filter((_, i) => i !== index));
		}
	};

	const handleSave = () => {
		if (!name.trim()) return;
		if (config.text.length === 0) return;
		const imageDataUrl = renderSealToDataUrl(config, 200);
		onSave(config, name.trim(), imageDataUrl);
	};

	return (
		<div className="flex flex-col lg:flex-row gap-6 max-w-2xl">
			{/* Controls */}
			<div className="flex-1 space-y-4 min-w-0">
				<label className="block">
					<span className="typo-body-sm font-medium text-on-surface-variant mb-1.5 block">
						Seal name
					</span>
					<input
						type="text"
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder="e.g. Company Official Seal"
						className="w-full max-w-sm typo-body bg-input border border-outline-variant sz-radius-md px-3 py-2 text-on-surface placeholder:text-outline focus:outline-none focus:border-primary transition-colors"
					/>
				</label>

				{/* Text lines */}
				<div>
					<span className="typo-body-sm font-medium text-on-surface-variant mb-1.5 block">
						Text lines
					</span>
					{textLines.map((line, i) => (
						<div key={i} className="flex gap-2 mb-2">
							<input
								type="text"
								value={line}
								onChange={(e) => updateLine(i, e.target.value)}
								placeholder={
									i === 0 ? "Primary text (e.g. name)" : "Secondary text"
								}
								className="flex-1 max-w-sm typo-body bg-input border border-outline-variant sz-radius-md px-3 py-2 text-on-surface placeholder:text-outline focus:outline-none focus:border-primary transition-colors"
							/>
							{textLines.length > 1 && (
								<button
									type="button"
									onClick={() => removeLine(i)}
									className="px-2 text-outline hover:text-error cursor-pointer"
								>
									×
								</button>
							)}
						</div>
					))}
					{textLines.length < 4 && (
						<button
							type="button"
							onClick={addLine}
							className="typo-caption text-primary hover:underline cursor-pointer"
						>
							+ Add line
						</button>
					)}
				</div>

				{/* Outer text — only for circle */}
				{shape === SealShape.CIRCLE && (
					<label className="block">
						<span className="typo-body-sm font-medium text-on-surface-variant mb-1.5 block">
							Outer ring text
						</span>
						<input
							type="text"
							value={outerText}
							onChange={(e) => setOuterText(e.target.value)}
							placeholder="e.g. CERTIFIED • AUTHENTIC • VERIFIED"
							className="w-full max-w-sm typo-body bg-input border border-outline-variant sz-radius-md px-3 py-2 text-on-surface placeholder:text-outline focus:outline-none focus:border-primary transition-colors"
						/>
					</label>
				)}

				{/* Shape */}
				<div>
					<span className="typo-body-sm font-medium text-on-surface-variant mb-1.5 block">
						Shape
					</span>
					<div className="flex gap-2 flex-wrap">
						{SHAPE_OPTIONS.map((opt) => (
							<button
								key={opt.value}
								type="button"
								onClick={() => setShape(opt.value)}
								className={`px-3 py-1.5 sz-radius-md typo-body-sm font-medium border-2 transition-all cursor-pointer ${
									shape === opt.value
										? "border-primary bg-primary/10 text-primary"
										: "border-outline-variant text-on-surface-variant hover:border-outline"
								}`}
							>
								{opt.label}
							</button>
						))}
					</div>
				</div>

				{/* Color */}
				<div>
					<span className="typo-body-sm font-medium text-on-surface-variant mb-1.5 block">
						Color
					</span>
					<div className="flex gap-2 flex-wrap items-center">
						{PRESET_COLORS.map((c) => (
							<button
								key={c}
								type="button"
								onClick={() => setColor(c)}
								className={`w-7 h-7 rounded-full border-2 transition-all cursor-pointer ${
									color === c
										? "border-primary scale-110"
										: "border-outline-variant hover:scale-105"
								}`}
								style={{ backgroundColor: c }}
							/>
						))}
						<input
							type="color"
							value={color}
							onChange={(e) => setColor(e.target.value)}
							className="w-7 h-7 cursor-pointer border-0 bg-transparent"
						/>
					</div>
				</div>

				{/* Background color */}
				<label className="block">
					<span className="typo-body-sm font-medium text-on-surface-variant mb-1.5 block">
						Background color <span className="text-outline">(optional)</span>
					</span>
					<div className="flex items-center gap-2">
						<input
							type="color"
							value={bgColor || "#ffffff"}
							onChange={(e) => setBgColor(e.target.value)}
							className="w-7 h-7 cursor-pointer border-0 bg-transparent"
						/>
						{bgColor && (
							<button
								type="button"
								onClick={() => setBgColor("")}
								className="typo-caption text-outline hover:text-primary cursor-pointer"
							>
								Clear
							</button>
						)}
					</div>
				</label>

				{/* Border width */}
				<label className="block">
					<span className="typo-body-sm font-medium text-on-surface-variant mb-1.5 block">
						Border width
					</span>
					<input
						type="range"
						min={1}
						max={8}
						value={borderWidth}
						onChange={(e) => setBorderWidth(Number(e.target.value))}
						className="w-full max-w-sm"
					/>
				</label>

				{/* Actions */}
				<div className="flex items-center gap-3 pt-2">
					<button
						type="button"
						onClick={handleSave}
						disabled={saving || !name.trim() || config.text.length === 0}
						className="sz-btn bg-primary text-on-primary typo-btn font-bold uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
					>
						{saving ? "Saving…" : "Save seal"}
					</button>
					<button
						type="button"
						onClick={onCancel}
						className="sz-btn border border-outline-variant text-on-surface-variant typo-btn font-bold uppercase tracking-widest hover:bg-surface-container-low transition-colors cursor-pointer"
					>
						Cancel
					</button>
				</div>
			</div>

			{/* Live preview */}
			<div className="flex flex-col items-center gap-2 lg:sticky lg:top-4">
				<span className="typo-caption text-outline">Preview</span>
				<div className="p-4 bg-surface-container-lowest border border-outline-variant sz-radius-lg">
					<SealPreview config={config} size={180} />
				</div>
			</div>
		</div>
	);
}
