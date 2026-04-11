"use client";

import { useFavourites } from "@/components/FavouritesContext";
import AppShell from "@/components/layout/AppShell";
import UserAvatar from "@/components/ui/UserAvatar";
import { useAllProperties } from "@/hooks/usePropertyQueries";
import { getPropertyImageUrls } from "@/lib/utils";
import { Bookmark, Heart, MapPin, ShoppingBag, Tag } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";

function formatCurrency(amount: number): string {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
		minimumFractionDigits: 0,
	}).format(amount);
}

function getLocalityLabel(address?: string): string {
	if (!address) return "No location";
	return address.split(",").slice(0, 2).join(",").trim();
}

export default function FavouritesPage() {
	const {
		favourites,
		isFavourite,
		toggleFavourite,
		loading: favsLoading,
	} = useFavourites();
	const { data: allProperties = [], isLoading: propertiesLoading } =
		useAllProperties();
	const loading = favsLoading || propertiesLoading;
	const properties = useMemo(
		() => allProperties.filter((p) => favourites.has(p.id)),
		[allProperties, favourites],
	);

	return (
		<AppShell>
			<div className="sz-page max-w-6xl">
				{/* Header */}
				<div className="mb-8">
					<div className="flex items-center gap-3 mb-2">
						<Heart className="w-6 h-6 text-red-500" />
						<h1 className="text-2xl font-bold font-headline text-on-surface">
							Favourites
						</h1>
					</div>
					<p className="text-sm text-on-surface-variant">
						{favourites.size === 0
							? "You haven\u2019t saved any listings yet."
							: `${favourites.size} saved listing${favourites.size === 1 ? "" : "s"}`}
					</p>
				</div>

				{/* Loading */}
				{(loading || favsLoading) && (
					<div
						className="grid gap-4"
						style={{
							gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
						}}
					>
						{Array.from({ length: 4 }).map((_, i) => (
							<div
								key={i}
								className="bg-surface-container rounded-2xl h-72 animate-pulse"
							/>
						))}
					</div>
				)}

				{/* Empty state */}
				{!loading && !favsLoading && properties.length === 0 && (
					<div className="flex flex-col items-center justify-center py-20 text-center">
						<div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center mb-4">
							<Bookmark className="w-7 h-7 text-gray-400" />
						</div>
						<h2 className="text-lg font-semibold text-on-surface mb-2">
							No favourites yet
						</h2>
						<p className="text-sm text-on-surface-variant max-w-sm mb-6">
							Browse the marketplace and tap the bookmark icon on any listing to
							save it here.
						</p>
						<Link
							href="/marketplace"
							className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary rounded-full text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-opacity"
						>
							<ShoppingBag className="w-4 h-4" />
							Browse Marketplace
						</Link>
					</div>
				)}

				{/* Favourite listings grid */}
				{!loading && !favsLoading && properties.length > 0 && (
					<div
						className="grid gap-4 items-start"
						style={{
							gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
						}}
					>
						{properties.map((property) => {
							const askingPrice =
								property.currentValue ?? property.purchasePrice ?? 0;
							const imageCandidates = getPropertyImageUrls(property).filter(
								(img): img is string => Boolean(img),
							);
							const heroImage = imageCandidates[0];

							return (
								<Link
									key={property.id}
									href={`/marketplace/${property.id}`}
									className="w-full bg-card border border-border rounded-2xl overflow-hidden transition-all group hover:shadow-lg hover:border-outline"
								>
									{/* Image */}
									<div className="relative h-48 bg-linear-to-br from-[#eef3ea] via-[#f7f4ec] to-[#dde7dd] overflow-hidden">
										{heroImage ? (
											<Image
												src={heroImage}
												alt={property.name}
												fill
												className="object-cover transition-transform duration-300 group-hover:scale-105"
												sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 280px"
											/>
										) : (
											<div className="absolute inset-0 flex items-center justify-center">
												<Bookmark className="w-10 h-10 text-gray-300" />
											</div>
										)}

										<button
											onClick={(e) => {
												e.preventDefault();
												e.stopPropagation();
												toggleFavourite(property.id);
											}}
											className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-colors bg-blue-600 text-white"
										>
											<Bookmark className="w-4 h-4" fill="currentColor" />
										</button>
									</div>

									{/* Info */}
									<div className="px-4 pt-3 pb-4">
										<h3 className="font-semibold text-sm text-on-surface truncate mb-2 group-hover:text-primary">
											{property.name}
										</h3>
										<div className="flex items-center gap-1 text-on-surface-variant text-xs mb-1">
											<MapPin className="w-3 h-3 shrink-0" />
											<span className="truncate">
												{getLocalityLabel(property.address)}
											</span>
										</div>
										{property.area != null && (
											<div className="text-xs text-on-surface-variant mb-3">
												{property.area.toLocaleString()} sqm
											</div>
										)}
										<div className="flex items-center gap-1.5 mb-3">
											<Tag className="w-3.5 h-3.5 text-gray-400" />
											<span className="text-sm font-bold text-on-surface">
												{formatCurrency(askingPrice)}
											</span>
										</div>
										<div className="pt-3 border-t border-border">
											<UserAvatar
												name={property.owner?.name || "Unknown"}
												displayName={property.owner?.displayName}
												username={property.owner?.username}
												avatar={property.owner?.avatar}
												size="sm"
												showLabel
											/>
										</div>
									</div>
								</Link>
							);
						})}
					</div>
				)}
			</div>
		</AppShell>
	);
}
