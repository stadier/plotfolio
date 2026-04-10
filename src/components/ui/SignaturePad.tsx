"use client";

import { RotateCcw, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

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
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [drawing, setDrawing] = useState(false);
	const [hasDrawn, setHasDrawn] = useState(false);
	const lastPoint = useRef<{ x: number; y: number } | null>(null);

	const getCtx = useCallback(() => {
		const canvas = canvasRef.current;
		if (!canvas) return null;
		const ctx = canvas.getContext("2d");
		if (!ctx) return null;
		return ctx;
	}, []);

	// Set up canvas with correct DPI scaling
	useEffect(() => {
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
	}, []);

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

	const clear = () => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = getCtx();
		if (!ctx) return;
		const dpr = window.devicePixelRatio || 1;
		ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
		setHasDrawn(false);
	};

	const confirm = () => {
		const canvas = canvasRef.current;
		if (!canvas || !hasDrawn) return;
		onConfirm(canvas.toDataURL("image/png"));
	};

	// Close on Escape
	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if (e.key === "Escape") onCancel();
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [onCancel]);

	return (
		<div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/50 backdrop-blur-sm">
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
						className="p-1.5 rounded-lg hover:bg-surface-container-high text-outline transition-colors"
					>
						<X className="w-4 h-4" />
					</button>
				</div>

				{/* Canvas */}
				<div className="px-5 py-4">
					<div className="relative border border-border rounded-xl overflow-hidden bg-surface-container">
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
								Draw signature here
							</p>
						)}
					</div>
				</div>

				{/* Actions */}
				<div className="flex items-center justify-between px-5 py-4 border-t border-border">
					<button
						type="button"
						onClick={clear}
						className="flex items-center gap-1.5 text-xs font-medium text-outline hover:text-on-surface-variant transition-colors"
					>
						<RotateCcw className="w-3.5 h-3.5" />
						Clear
					</button>
					<div className="flex gap-2">
						<button
							type="button"
							onClick={onCancel}
							className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant border border-border rounded-lg hover:bg-surface-container-high transition-colors"
						>
							Cancel
						</button>
						<button
							type="button"
							onClick={confirm}
							disabled={!hasDrawn}
							className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-white signature-gradient rounded-lg shadow disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all"
						>
							Confirm
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
