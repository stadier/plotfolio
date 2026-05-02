"use client";

import { useFavourites } from "@/components/FavouritesContext";
import PropertyFullView from "@/components/property/PropertyFullView";
import ShareModal from "@/components/property/ShareModal";
import { PropertyDetailSkeleton } from "@/components/ui/skeletons";
import { useProperty } from "@/hooks/usePropertyQueries";
import { PropertyAPI } from "@/lib/api";
import { isPlotWordsCode } from "@/lib/plotwords";
import { DocumentAccessRequest } from "@/types/property";
import {
	ArrowLeft,
	ArrowRight,
	Bookmark,
	Share2,
	Sparkles,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const MOCK_VIEWER: { id: string; name: string; email: string } = {
	id: "viewer_1",
	name: "Marketplace Viewer",
	email: "viewer@example.com",
};

export default function ShortCodeClient({
	code,
	initialPropertyId,
	initialError,
}: {
	code: string;
	initialPropertyId: string | null;
	initialError: string | null;
}) {
	const router = useRouter();

	// Resolve shortCode → property id. The server already resolved this and
	// passed the result via props; fall back to a client-side resolve only
	// if SSR somehow couldn't (e.g. transient DB error during render).
	const [propertyId, setPropertyId] = useState<string | null>(
		initialPropertyId,
	);
	const [resolveError, setResolveError] = useState<string | null>(initialError);

	useEffect(() => {
		if (initialPropertyId || initialError) return;
		let cancelled = false;
		async function resolve() {
			try {
				const res = await fetch(
					`/api/properties/shortcode?code=${encodeURIComponent(code)}`,
				);
				if (!res.ok) {
					if (!cancelled) setResolveError("Property not found");
					return;
				}
				const data = await res.json();
				if (!cancelled) setPropertyId(data.id);
			} catch {
				if (!cancelled) setResolveError("Failed to load listing");
			}
		}
		resolve();
		return () => {
			cancelled = true;
		};
	}, [code, initialPropertyId, initialError]);

	const {
		data: property,
		isLoading: propertyLoading,
		error: queryError,
	} = useProperty(propertyId ?? "", {
		enabled: !!propertyId,
	});

	const loading = !propertyId && !resolveError;
	const error =
		resolveError ??
		(queryError ? "Failed to load listing" : null) ??
		(!propertyLoading && propertyId && !property ? "Listing not found" : null);

	const [accessRequests, setAccessRequests] = useState<DocumentAccessRequest[]>(
		[],
	);
	const { isFavourite, toggleFavourite } = useFavourites();
	const [shareOpen, setShareOpen] = useState(false);
	const [lookupCode, setLookupCode] = useState("");
	const [lookupLoading, setLookupLoading] = useState(false);
	const [lookupError, setLookupError] = useState("");

	const loadAccessRequests = useCallback(async (pid: string) => {
		const reqs = await PropertyAPI.getDocumentAccessRequests(pid, {
			requesterId: MOCK_VIEWER.id,
		});
		setAccessRequests(reqs);
	}, []);

	useEffect(() => {
		if (property && propertyId) loadAccessRequests(propertyId);
	}, [propertyId, property, loadAccessRequests]);

	function handleAccessRequested(req: DocumentAccessRequest) {
		setAccessRequests((prev) => [...prev, req]);
	}

	const handleLookup = useCallback(async () => {
		const trimmed = lookupCode.trim().toLowerCase();
		if (!trimmed) return;

		if (isPlotWordsCode(trimmed)) {
			setLookupError("");
			setLookupLoading(true);
			try {
				const res = await fetch(
					`/api/properties/plotwords?code=${encodeURIComponent(trimmed)}`,
				);
				const data = await res.json();
				if (!res.ok) {
					setLookupError(data.error || "Lookup failed");
					return;
				}
				if (data.properties?.length === 1) {
					router.push(
						`/${data.properties[0].shortCode || `property/${data.properties[0].id}`}`,
					);
					return;
				}
				if (data.properties?.length > 1) {
					router.push(`/marketplace?plotwords=${encodeURIComponent(trimmed)}`);
					return;
				}
				setLookupError("No properties found for this PlotWords code");
			} catch {
				setLookupError("Something went wrong. Please try again.");
			} finally {
				setLookupLoading(false);
			}
			return;
		}

		// Try as shortCode
		setLookupError("");
		setLookupLoading(true);
		try {
			const res = await fetch(
				`/api/properties/shortcode?code=${encodeURIComponent(trimmed)}`,
			);
			if (res.ok) {
				const data = await res.json();
				router.push(`/${trimmed}`);
				return;
			}
		} catch {
			// fall through to search
		} finally {
			setLookupLoading(false);
		}

		router.push(`/marketplace?search=${encodeURIComponent(trimmed)}`);
	}, [lookupCode, router]);

	const handleBack = useCallback(() => {
		if (window.history.length > 1) {
			router.back();
			return;
		}
		router.push("/");
	}, [router]);

	if (loading || (propertyId && propertyLoading)) {
		return (
			<div className="min-h-screen bg-background p-6">
				<PropertyDetailSkeleton />
			</div>
		);
	}

	if (error || !property) {
		return (
			<div className="h-screen bg-background flex flex-col items-center justify-center gap-4">
				<div className="text-error font-body">
					{error ?? "Listing not found"}
				</div>
				<Link
					href="/marketplace"
					className="text-sm text-on-surface-variant hover:text-primary transition-colors"
				>
					← Back to Marketplace
				</Link>
			</div>
		);
	}

	return (
		<div className="h-screen bg-background overflow-hidden flex flex-col">
			<div className="shrink-0 border-b border-border px-4 sm:px-6 py-3 bg-background">
				<div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
					{/* Logo */}
					<Link href="/" className="flex items-center gap-2 shrink-0">
						<Image
							src="/plotfolio-logo-l.png"
							alt="Plotfolio"
							width={26}
							height={26}
							className="w-6.5 h-6.5 shrink-0"
						/>
						<span className="text-base font-bold tracking-tighter text-primary font-headline hidden sm:block">
							Plotfolio
						</span>
					</Link>

					{/* Back + Search — centered */}
					<div className="flex justify-center">
						<div className="flex items-center gap-2 w-full max-w-xl">
							<button
								type="button"
								onClick={handleBack}
								className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-border text-xs font-medium text-on-surface hover:bg-surface-container transition-colors shrink-0"
							>
								<ArrowLeft className="w-3.5 h-3.5" />
								Back
							</button>
							<div className="flex-1 relative">
								<Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-primary" />
								<input
									type="text"
									value={lookupCode}
									onChange={(e) => {
										setLookupCode(e.target.value);
										setLookupError("");
									}}
									onKeyDown={(e) => e.key === "Enter" && handleLookup()}
									placeholder="Search by PlotWords or short code"
									className="w-full h-9 pl-9 pr-11 text-sm font-mono border border-border rounded-md bg-card focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/40 placeholder:text-outline"
								/>
								<button
									type="button"
									onClick={handleLookup}
									disabled={lookupLoading || !lookupCode.trim()}
									className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-40"
								>
									{lookupLoading ? (
										<div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
									) : (
										<ArrowRight className="w-3.5 h-3.5" />
									)}
								</button>
							</div>
						</div>
					</div>

					{/* Login */}
					<Link
						href="/login"
						className="shrink-0 inline-flex items-center px-4 py-2.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-widest transition-colors"
					>
						Log in
					</Link>
				</div>
				{lookupError && (
					<p className="text-xs text-red-500 font-medium mt-1.5">
						{lookupError}
					</p>
				)}
			</div>

			<div className="h-full min-h-0">
				<PropertyFullView
					property={property}
					accessRequests={accessRequests}
					onAccessRequested={handleAccessRequested}
					viewer={MOCK_VIEWER}
					actions={
						<>
							<button
								type="button"
								onClick={() => toggleFavourite(propertyId!)}
								className="p-2 rounded-full border border-outline-variant/40 hover:bg-surface-container-high transition-colors"
								title="Save listing"
							>
								<Bookmark
									className={`w-5 h-5 ${isFavourite(propertyId!) ? "fill-red-500 text-red-500" : "text-on-surface-variant"}`}
								/>
							</button>
							<button
								type="button"
								onClick={() => setShareOpen(true)}
								className="p-2 rounded-full border border-outline-variant/40 hover:bg-surface-container-high transition-colors"
								title="Share listing"
							>
								<Share2 className="w-5 h-5 text-on-surface-variant" />
							</button>
						</>
					}
				/>
			</div>

			<ShareModal
				property={property}
				open={shareOpen}
				onClose={() => setShareOpen(false)}
			/>
		</div>
	);
}
