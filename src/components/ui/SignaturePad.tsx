"use client";

import {
	Image as ImageIcon,
	PenTool,
	RotateCcw,
	Type,
	Upload,
	X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type TabMode = "draw" | "type" | "upload";

interface SignaturePadProps {
	/** Name being signed for (shown in header) */
	name: string;
	/** Called with base64 PNG data URL when user confirms */
	onConfirm: (signatureDataUrl: string) => void;
	/** Called when user cancels */
	onCancel: () => void;
}

export default function SignaturePad({
	name,
	onConfirm,
	onCancel,
}: SignaturePadProps) {
	const [tab, setTab] = useState<TabMode>("draw");

	/* ── Draw state ─────────────────────────── */
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [drawing, setDrawing] = useState(false);
	const [hasDrawn, setHasDrawn] = useState(false);
	const lastPoint = useRef<{ x: number; y: number } | null>(null);

	/* ── Type state ─────────────────────────── */
	const [typedText, setTypedText] = useState("");
	const [fontIdx, setFontIdx] = useState(0);
	const typedCanvasRef = useRef<HTMLCanvasElement>(null);

	const signatureFonts = [
		{ label: "Script", css: "italic 32px 'Georgia', serif" },
		{
			label: "Cursive",
			css: "italic 28px 'Brush Script MT', 'Segoe Script', cursive",
		},
		{
			label: "Formal",
			css: "italic 30px 'Palatino Linotype', 'Times New Roman', serif",
		},
		{ label: "Bold", css: "bold italic 30px 'Georgia', serif" },
	];

	/* ── Upload state ───────────────────────── */
	const [uploadedImage, setUploadedImage] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	/* ── Canvas setup (draw) ────────────────── */
	const getCtx = useCallback(() => {
		const canvas = canvasRef.current;
		if (!canvas) return null;
		return canvas.getContext("2d");
	}, []);

	useEffect(() => {
		if (tab !== "draw") return;
		const canvas = canvasRef.current;
		if (!canvas) return;
		const dpr = window.devicePixelRatio || 1;
		const rect = canvas.getBoundingClientRect();
		canvas.width = rect.width * dpr;
		canvas.height = rect.height * dpr;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		ctx.scale(dpr, dpr);
		ctx.lineCap = "round";
		ctx.lineJoin = "round";
		ctx.lineWidth = 2;
		ctx.strokeStyle = "#1e293b";
	}, [tab]);

	const getPos = (
		e: React.MouseEvent | React.TouchEvent,
	): { x: number; y: number } => {
		const canvas = canvasRef.current!;
		const rect = canvas.getBoundingClientRect();
		const clientX =
			"touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
		const clientY =
			"touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
		return { x: clientX - rect.left, y: clientY - rect.top };
	};

	const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
		e.preventDefault();
		setDrawing(true);
		lastPoint.current = getPos(e);
	};

	const draw = (e: React.MouseEvent | React.TouchEvent) => {
		if (!drawing) return;
		e.preventDefault();
		const ctx = getCtx();
		if (!ctx || !lastPoint.current) return;
		const pos = getPos(e);
		ctx.beginPath();
		ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
		ctx.lineTo(pos.x, pos.y);
		ctx.stroke();
		lastPoint.current = pos;
		setHasDrawn(true);
	};

	const endDraw = () => {
		setDrawing(false);
		lastPoint.current = null;
	};

	const clearDraw = () => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = getCtx();
		if (!ctx) return;
		const dpr = window.devicePixelRatio || 1;
		ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
		setHasDrawn(false);
	};

	/* ── Typed canvas rendering ─────────────── */
	useEffect(() => {
		if (tab !== "type") return;
		const canvas = typedCanvasRef.current;
		if (!canvas) return;
		const dpr = window.devicePixelRatio || 1;
		const rect = canvas.getBoundingClientRect();
		canvas.width = rect.width * dpr;
		canvas.height = rect.height * dpr;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		ctx.scale(dpr, dpr);
		ctx.clearRect(0, 0, rect.width, rect.height);
		if (!typedText.trim()) return;
		ctx.font = signatureFonts[fontIdx].css;
		ctx.fillStyle = "#1e293b";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(typedText, rect.width / 2, rect.height / 2);
	}, [tab, typedText, fontIdx]);

	/* ── Upload handler ─────────────────────── */
	const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		if (!file.type.startsWith("image/")) return;
		if (file.size > 5 * 1024 * 1024) return; // 5 MB max
		const reader = new FileReader();
		reader.onload = () => {
			setUploadedImage(reader.result as string);
		};
		reader.readAsDataURL(file);
	};

	/* ── Confirm ────────────────────────────── */
	const canConfirm =
		(tab === "draw" && hasDrawn) ||
		(tab === "type" && typedText.trim().length > 0) ||
		(tab === "upload" && !!uploadedImage);

	/** Composite a source canvas onto a white-background canvas and return data URL */
	function toWhiteBgDataUrl(src: HTMLCanvasElement): string {
		const out = document.createElement("canvas");
		out.width = src.width;
		out.height = src.height;
		const ctx = out.getContext("2d")!;
		ctx.fillStyle = "#ffffff";
		ctx.fillRect(0, 0, out.width, out.height);
		ctx.drawImage(src, 0, 0);
		return out.toDataURL("image/png");
	}

	const confirm = () => {
		if (!canConfirm) return;

		if (tab === "draw") {
			const canvas = canvasRef.current;
			if (!canvas) return;
			onConfirm(toWhiteBgDataUrl(canvas));
		} else if (tab === "type") {
			const canvas = typedCanvasRef.current;
			if (!canvas) return;
			onConfirm(toWhiteBgDataUrl(canvas));
		} else if (tab === "upload" && uploadedImage) {
			// Render uploaded image onto a white-background canvas
			const img = new window.Image();
			img.onload = () => {
				const canvas = document.createElement("canvas");
				canvas.width = 400;
				canvas.height = 160;
				const ctx = canvas.getContext("2d");
				if (!ctx) return;
				ctx.fillStyle = "#ffffff";
				ctx.fillRect(0, 0, 400, 160);
				// Fit image centered
				const scale = Math.min(380 / img.width, 140 / img.height);
				const w = img.width * scale;
				const h = img.height * scale;
				ctx.drawImage(img, (400 - w) / 2, (160 - h) / 2, w, h);
				onConfirm(canvas.toDataURL("image/png"));
			};
			img.src = uploadedImage;
		}
	};

	/* ── Escape to close ────────────────────── */
	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if (e.key === "Escape") onCancel();
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [onCancel]);

	const tabs: { mode: TabMode; icon: React.ReactNode; label: string }[] = [
		{ mode: "draw", icon: <PenTool className="w-3.5 h-3.5" />, label: "Draw" },
		{ mode: "type", icon: <Type className="w-3.5 h-3.5" />, label: "Type" },
		{
			mode: "upload",
			icon: <Upload className="w-3.5 h-3.5" />,
			label: "Upload",
		},
	];

	return (
		<div className="fixed inset-0 z-layer-modal flex items-center justify-center bg-black/50 backdrop-blur-sm">
			<div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
				{/* Header */}
				<div className="flex items-center justify-between px-5 py-4 border-b border-border">
					<div>
						<h3 className="font-headline text-sm font-bold text-on-surface">
							Signature for
						</h3>
						<p className="text-primary font-semibold text-base">{name}</p>
					</div>
					<button
						type="button"
						onClick={onCancel}
						className="p-1.5 rounded-md hover:bg-surface-container-high text-outline transition-colors"
					>
						<X className="w-4 h-4" />
					</button>
				</div>

				{/* Tabs */}
				<div className="flex border-b border-border">
					{tabs.map((t) => (
						<button
							key={t.mode}
							type="button"
							onClick={() => setTab(t.mode)}
							className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-bold uppercase tracking-widest transition-colors ${
								tab === t.mode
									? "text-primary border-b-2 border-primary bg-primary/5"
									: "text-outline hover:text-on-surface-variant"
							}`}
						>
							{t.icon}
							{t.label}
						</button>
					))}
				</div>

				{/* Content */}
				<div className="px-5 py-4">
					{/* Draw */}
					{tab === "draw" && (
						<div className="relative border border-border rounded-md overflow-hidden bg-surface-container">
							<canvas
								ref={canvasRef}
								className="w-full cursor-crosshair touch-none"
								style={{ height: 160 }}
								onMouseDown={startDraw}
								onMouseMove={draw}
								onMouseUp={endDraw}
								onMouseLeave={endDraw}
								onTouchStart={startDraw}
								onTouchMove={draw}
								onTouchEnd={endDraw}
							/>
							{!hasDrawn && (
								<p className="absolute inset-0 flex items-center justify-center text-outline text-sm pointer-events-none">
									Draw your signature here
								</p>
							)}
						</div>
					)}

					{/* Type */}
					{tab === "type" && (
						<div className="space-y-3">
							<input
								type="text"
								className="w-full rounded-md border border-border bg-card px-3.5 py-2.5 text-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors font-body"
								placeholder="Type your name…"
								value={typedText}
								onChange={(e) => setTypedText(e.target.value)}
								autoFocus
							/>
							<div className="flex gap-1.5">
								{signatureFonts.map((f, i) => (
									<button
										key={i}
										type="button"
										onClick={() => setFontIdx(i)}
										className={`flex-1 px-2 py-1.5 text-badge font-medium rounded-md border transition-colors ${
											fontIdx === i
												? "border-primary bg-primary/10 text-primary"
												: "border-border text-outline hover:border-primary/30"
										}`}
									>
										{f.label}
									</button>
								))}
							</div>
							<div className="border border-border rounded-md overflow-hidden bg-surface-container">
								<canvas
									ref={typedCanvasRef}
									className="w-full"
									style={{ height: 120 }}
								/>
								{!typedText.trim() && (
									<p className="absolute inset-0 flex items-center justify-center text-outline text-sm pointer-events-none">
										Preview
									</p>
								)}
							</div>
						</div>
					)}

					{/* Upload */}
					{tab === "upload" && (
						<div>
							<input
								ref={fileInputRef}
								type="file"
								accept="image/*"
								className="hidden"
								onChange={handleFileUpload}
							/>
							{!uploadedImage ? (
								<button
									type="button"
									onClick={() => fileInputRef.current?.click()}
									className="w-full flex flex-col items-center justify-center gap-3 border border-dashed border-border rounded-md bg-surface-container hover:border-primary/40 transition-colors cursor-pointer"
									style={{ height: 160 }}
								>
									<div className="w-10 h-10 rounded-md signature-gradient flex items-center justify-center">
										<ImageIcon className="w-5 h-5 text-white" />
									</div>
									<div className="text-center">
										<p className="text-sm font-medium text-on-surface">
											Upload signature image
										</p>
										<p className="text-xs text-outline mt-0.5">
											PNG, JPG, or SVG — max 5 MB
										</p>
									</div>
								</button>
							) : (
								<div
									className="relative border border-border rounded-md overflow-hidden bg-surface-container flex items-center justify-center"
									style={{ height: 160 }}
								>
									<img
										src={uploadedImage}
										alt="Uploaded signature"
										className="max-h-[140px] max-w-full object-contain"
									/>
									<button
										type="button"
										onClick={() => {
											setUploadedImage(null);
											if (fileInputRef.current) fileInputRef.current.value = "";
										}}
										className="absolute top-2 right-2 p-1 rounded-md bg-card/80 hover:bg-card border border-border text-outline hover:text-on-surface transition-colors"
									>
										<X className="w-3.5 h-3.5" />
									</button>
								</div>
							)}
						</div>
					)}
				</div>

				{/* Actions */}
				<div className="flex items-center justify-between px-5 py-4 border-t border-border">
					{tab === "draw" ? (
						<button
							type="button"
							onClick={clearDraw}
							className="flex items-center gap-1.5 text-xs font-medium text-outline hover:text-on-surface-variant transition-colors"
						>
							<RotateCcw className="w-3.5 h-3.5" />
							Clear
						</button>
					) : tab === "type" ? (
						<button
							type="button"
							onClick={() => setTypedText("")}
							className="flex items-center gap-1.5 text-xs font-medium text-outline hover:text-on-surface-variant transition-colors"
						>
							<RotateCcw className="w-3.5 h-3.5" />
							Clear
						</button>
					) : (
						<button
							type="button"
							onClick={() => {
								setUploadedImage(null);
								if (fileInputRef.current) fileInputRef.current.value = "";
							}}
							className="flex items-center gap-1.5 text-xs font-medium text-outline hover:text-on-surface-variant transition-colors"
						>
							<RotateCcw className="w-3.5 h-3.5" />
							Clear
						</button>
					)}
					<div className="flex gap-2">
						<button
							type="button"
							onClick={onCancel}
							className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant border border-border rounded-md hover:bg-surface-container-high transition-colors"
						>
							Cancel
						</button>
						<button
							type="button"
							onClick={confirm}
							disabled={!canConfirm}
							className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-white signature-gradient rounded-md shadow disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all"
						>
							Confirm
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
