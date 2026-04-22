"use client";

import { isPlotWordsCode } from "@/lib/plotwords";
import {
	ArrowRight,
	DollarSign,
	LogIn,
	MapPin,
	Search,
	Sparkles,
	User,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const SLIDES = [
	{
		url: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1920&q=80",
		label: "Rolling Countryside Estate",
		location: "Cotswolds, United Kingdom",
		price: "£2,400,000",
		owner: "James Hartwell",
		alt: true,
	},
	{
		url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80",
		label: "Alpine Lakeside Retreat",
		location: "Interlaken, Switzerland",
		price: "CHF 5,800,000",
		owner: "Sofia Meier",
		alt: false,
	},
	{
		url: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1920&q=80",
		label: "Valley Farm — Golden Hour",
		location: "Oaxaca, Mexico",
		price: "MXN 12,000,000",
		owner: "Carlos Vega",
		alt: true,
	},
	{
		url: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1920&q=80",
		label: "Downtown Commercial Tower",
		location: "Chicago, United States",
		price: "$18,500,000",
		owner: "Meridian Holdings LLC",
		alt: false,
	},
	{
		url: "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=1920&q=80",
		label: "Lush Hillside Villa",
		location: "Amalfi Coast, Italy",
		price: "€3,950,000",
		owner: "Giulia Ferretti",
		alt: true,
	},
	{
		url: "https://images.unsplash.com/photo-1518623489648-a173ef7824f3?w=1920&q=80",
		label: "Coastal Cliff Residence",
		location: "Cape Town, South Africa",
		price: "ZAR 28,000,000",
		owner: "Thabo Nkosi",
		alt: false,
	},
];

const SLIDE_DURATION = 6000;

export default function LandingPage() {
	const router = useRouter();
	const [code, setCode] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);
	const [activeSlide, setActiveSlide] = useState(0);
	const [prevSlide, setPrevSlide] = useState<number | null>(null);
	const [animKey, setAnimKey] = useState(0);

	useEffect(() => {
		const interval = setInterval(() => {
			setActiveSlide((cur) => {
				setPrevSlide(cur);
				setAnimKey((k) => k + 1);
				return (cur + 1) % SLIDES.length;
			});
		}, SLIDE_DURATION);
		return () => clearInterval(interval);
	}, []);

	const handleLookup = async () => {
		const trimmed = code.trim().toLowerCase();
		if (!trimmed) return;

		if (isPlotWordsCode(trimmed)) {
			setError("");
			setLoading(true);
			try {
				const res = await fetch(
					`/api/properties/plotwords?code=${encodeURIComponent(trimmed)}`,
				);
				const data = await res.json();
				if (!res.ok) {
					setError(data.error || "Lookup failed");
					return;
				}
				if (data.properties?.length === 1) {
					const p = data.properties[0];
					router.push(p.shortCode ? `/${p.shortCode}` : `/property/${p.id}`);
					return;
				}
				if (data.properties?.length > 1) {
					router.push(`/marketplace?plotwords=${encodeURIComponent(trimmed)}`);
					return;
				}
				setError("No properties found for this PlotWords code");
			} catch {
				setError("Something went wrong. Please try again.");
			} finally {
				setLoading(false);
			}
			return;
		}

		router.push(`/marketplace?search=${encodeURIComponent(trimmed)}`);
	};

	const goToSlide = (idx: number) => {
		if (idx === activeSlide) return;
		setPrevSlide(activeSlide);
		setAnimKey((k) => k + 1);
		setActiveSlide(idx);
	};

	return (
		<div className="relative min-h-screen flex flex-col overflow-hidden">
			{/* ── Slideshow background ────────────────────────────────────── */}
			<div className="absolute inset-0 z-0" aria-hidden="true">
				{SLIDES.map((slide, idx) => {
					const isActive = idx === activeSlide;
					const isPrev = idx === prevSlide;
					return (
						<div
							key={idx}
							className="absolute inset-0 transition-opacity duration-1000"
							style={{
								opacity: isActive ? 1 : 0,
								zIndex: isActive ? 2 : isPrev ? 1 : 0,
							}}
						>
							{/* eslint-disable-next-line @next/next/no-img-element */}
							<img
								key={isActive ? `active-${animKey}` : `idle-${idx}`}
								src={slide.url}
								alt={slide.label}
								className={`w-full h-full object-cover ${isActive ? (slide.alt ? "slide-kenburns-alt" : "slide-kenburns") : ""}`}
								draggable={false}
							/>
						</div>
					);
				})}

				{/* Gradient overlay: dark vignette for readability */}
				<div className="absolute inset-0 z-10 bg-linear-to-b from-black/60 via-black/40 to-black/70" />
			</div>

			{/* ── Top nav bar ─────────────────────────────────────────────── */}
			<nav className="relative z-10 flex items-center justify-between px-6 pt-5 pb-2">
				<span className="font-headline font-bold text-white text-lg tracking-tight drop-shadow">
					Plotfolio
				</span>
				<Link
					href="/login"
					className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-white/10 backdrop-blur-sm border border-white/20 text-white text-xs font-medium hover:bg-white/20 transition-colors"
				>
					<LogIn className="w-3.5 h-3.5" />
					Log in
				</Link>
			</nav>

			{/* ── Hero content ────────────────────────────────────────────── */}
			<div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-16">
				<div className="max-w-sm w-full text-center space-y-6">
					{/* Brand */}
					<div className="space-y-2">
						<div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-1">
							<MapPin className="w-5 h-5 text-white" />
						</div>
						<h1 className="text-4xl font-headline font-bold text-white tracking-tight drop-shadow-lg">
							Plotfolio
						</h1>
						<p className="text-white/80 text-sm font-light leading-relaxed">
							Find any property worldwide with a simple three-word code
						</p>
					</div>

					{/* PlotWords input */}
					<div className="space-y-2.5">
						<div className="relative max-w-xs mx-auto">
							<Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/60" />
							<input
								type="text"
								value={code}
								onChange={(e) => {
									setCode(e.target.value);
									setError("");
								}}
								onKeyDown={(e) => e.key === "Enter" && handleLookup()}
								placeholder="calm.brook.shine"
								className="w-full pl-9 pr-11 py-3 text-sm font-mono border border-white/20 rounded-md bg-white/10 backdrop-blur-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40"
							/>
							<button
								onClick={handleLookup}
								disabled={loading || !code.trim()}
								className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-md bg-blue-500 hover:bg-blue-400 text-white transition-colors disabled:opacity-40"
							>
								{loading ? (
									<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
								) : (
									<ArrowRight className="w-4 h-4" />
								)}
							</button>
						</div>

						{error && (
							<p className="text-xs text-red-300 font-medium">{error}</p>
						)}

						<p className="text-[11px] text-white/50">
							Enter a{" "}
							<span className="font-semibold text-white/80">PlotWords</span>{" "}
							code or search by name or address
						</p>
					</div>

					{/* Quick links */}
					<div className="flex flex-wrap items-center justify-center gap-3 pt-1">
						<Link
							href="/marketplace"
							className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-md border border-white/25 bg-white/10 backdrop-blur-sm text-white text-xs font-medium hover:bg-white/20 transition-colors"
						>
							<Search className="w-3.5 h-3.5" />
							Browse Marketplace
						</Link>
						<Link
							href="/login"
							className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors shadow-lg"
						>
							<MapPin className="w-3.5 h-3.5" />
							Manage Properties
						</Link>
					</div>
				</div>
			</div>

			{/* ── Property info card + indicators ─────────────────────────── */}
			<div className="relative z-10 flex items-end justify-between px-6 pb-8 gap-4">
				{/* Property info — bottom left */}
				<div className="max-w-xs">
					<div
						key={activeSlide}
						className="backdrop-blur-sm bg-black/30 border border-white/15 rounded-md px-4 py-3 space-y-1.5 animate-fade-in"
					>
						<p className="text-white font-headline font-semibold text-sm leading-tight">
							{SLIDES[activeSlide].label}
						</p>
						<div className="flex flex-col gap-1">
							<span className="inline-flex items-center gap-1.5 text-[11px] text-white/70">
								<MapPin className="w-3 h-3 shrink-0" />
								{SLIDES[activeSlide].location}
							</span>
							<span className="inline-flex items-center gap-1.5 text-[11px] text-white/70">
								<DollarSign className="w-3 h-3 shrink-0" />
								{SLIDES[activeSlide].price}
							</span>
							<span className="inline-flex items-center gap-1.5 text-[11px] text-white/70">
								<User className="w-3 h-3 shrink-0" />
								{SLIDES[activeSlide].owner}
							</span>
						</div>
					</div>
				</div>

				{/* Slide indicators — bottom right */}
				<div className="flex flex-col items-end gap-2 shrink-0">
					<p className="text-badge text-white/40 tracking-widest uppercase">
						{activeSlide + 1} / {SLIDES.length}
					</p>
					<div className="flex items-center gap-1.5">
						{SLIDES.map((_, idx) => (
							<button
								key={idx}
								onClick={() => goToSlide(idx)}
								aria-label={`Go to slide ${idx + 1}`}
								className={`rounded-full transition-all duration-500 ${
									idx === activeSlide
										? "w-5 h-1.5 bg-white"
										: "w-1.5 h-1.5 bg-white/30 hover:bg-white/60"
								}`}
							/>
						))}
					</div>
				</div>
			</div>

			{/* ── Footer ──────────────────────────────────────────────────── */}
			<footer className="relative z-10 text-center text-[11px] text-white/30 py-3 border-t border-white/10">
				© {new Date().getFullYear()} Plotfolio — Property management worldwide
			</footer>
		</div>
	);
}
