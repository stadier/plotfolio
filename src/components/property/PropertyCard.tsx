"use client";

import UserAvatar from "@/components/ui/UserAvatar";
import { cn, formatArea, formatCurrency, formatDate } from "@/lib/utils";
import {
	Property,
	PropertyCondition,
	PropertyStatus,
	PropertyType,
} from "@/types/property";
import {
	Calendar,
	ChevronLeft,
	ChevronRight,
	Copy,
	DollarSign,
	MapPin,
	Square,
} from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

interface PropertyCardProps {
	property: Property;
	onClick?: () => void;
	isSelected?: boolean;
	className?: string;
}

const statusColors = {
	[PropertyStatus.OWNED]: "bg-green-100 text-green-800",
	[PropertyStatus.UNDER_CONTRACT]: "bg-yellow-100 text-yellow-800",
	[PropertyStatus.FOR_SALE]: "bg-blue-100 text-blue-800",
	[PropertyStatus.RENTED]: "bg-purple-100 text-purple-800",
	[PropertyStatus.DEVELOPMENT]: "bg-orange-100 text-orange-800",
};

const typeColors = {
	[PropertyType.RESIDENTIAL]: "bg-emerald-500",
	[PropertyType.COMMERCIAL]: "bg-blue-500",
	[PropertyType.INDUSTRIAL]: "bg-purple-500",
	[PropertyType.AGRICULTURAL]: "bg-amber-500",
	[PropertyType.VACANT_LAND]: "bg-gray-500",
	[PropertyType.MIXED_USE]: "bg-red-500",
};

const conditionColors: Partial<Record<PropertyCondition, string>> = {
	[PropertyCondition.BUSH]:
		"bg-lime-50 text-lime-700 border border-lime-200 dark:bg-lime-900/30 dark:text-lime-300 dark:border-lime-800",
	[PropertyCondition.CLEARED]:
		"bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
	[PropertyCondition.FOUNDATION]:
		"bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800",
	[PropertyCondition.HAS_STRUCTURE]:
		"bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-800",
	[PropertyCondition.FENCED]:
		"bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800",
	[PropertyCondition.PAVED]:
		"bg-slate-50 text-slate-700 border border-slate-200 dark:bg-slate-900/30 dark:text-slate-300 dark:border-slate-800",
	[PropertyCondition.WATERLOGGED]:
		"bg-cyan-50 text-cyan-700 border border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-800",
	[PropertyCondition.ROCKY]:
		"bg-stone-50 text-stone-700 border border-stone-200 dark:bg-stone-900/30 dark:text-stone-300 dark:border-stone-800",
	[PropertyCondition.UNDER_CONSTRUCTION]:
		"bg-yellow-50 text-yellow-700 border border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800",
	[PropertyCondition.FINISHED]:
		"bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800",
	[PropertyCondition.RENOVATED]:
		"bg-teal-50 text-teal-700 border border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800",
	[PropertyCondition.NEEDS_REPAIR]:
		"bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
};

const conditionLabels: Partial<Record<PropertyCondition, string>> = {
	[PropertyCondition.BUSH]: "Bush",
	[PropertyCondition.CLEARED]: "Cleared",
	[PropertyCondition.FOUNDATION]: "Foundation",
	[PropertyCondition.HAS_STRUCTURE]: "Has Structure",
	[PropertyCondition.FENCED]: "Fenced",
	[PropertyCondition.PAVED]: "Paved",
	[PropertyCondition.WATERLOGGED]: "Waterlogged",
	[PropertyCondition.ROCKY]: "Rocky",
	[PropertyCondition.UNDER_CONSTRUCTION]: "Under Construction",
	[PropertyCondition.FINISHED]: "Finished",
	[PropertyCondition.RENOVATED]: "Renovated",
	[PropertyCondition.NEEDS_REPAIR]: "Needs Repair",
};

export default function PropertyCard({
	property,
	onClick,
	isSelected = false,
	className = "",
}: PropertyCardProps) {
	const images = property.images ?? [];
	const hasMultipleImages = images.length > 1;
	const [currentIndex, setCurrentIndex] = useState(0);
	const [paused, setPaused] = useState(false);

	const goNext = useCallback(() => {
		setCurrentIndex((i) => (i + 1) % images.length);
	}, [images.length]);

	const goPrev = useCallback(
		(e: React.MouseEvent) => {
			e.stopPropagation();
			setCurrentIndex((i) => (i - 1 + images.length) % images.length);
		},
		[images.length],
	);

	const goNextClick = useCallback(
		(e: React.MouseEvent) => {
			e.stopPropagation();
			goNext();
		},
		[goNext],
	);

	// Auto-advance every 4 seconds
	useEffect(() => {
		if (!hasMultipleImages || paused) return;
		const timer = setInterval(goNext, 4000);
		return () => clearInterval(timer);
	}, [hasMultipleImages, paused, goNext]);

	return (
		<div
			className={cn(
				"bg-white dark:bg-surface-container-low rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 cursor-pointer border dark:border-outline-variant",
				isSelected && "ring-2 ring-blue-500 border-blue-500",
				className,
			)}
			onClick={onClick}
		>
			{/* Property Image Slideshow or Placeholder */}
			<div
				className="h-48 bg-gray-200 dark:bg-surface-container rounded-t-lg relative overflow-hidden group"
				onMouseEnter={() => setPaused(true)}
				onMouseLeave={() => setPaused(false)}
			>
				{images.length > 0 ? (
					<>
						{images.map((src, idx) => (
							<div
								key={src}
								className={cn(
									"absolute inset-0 transition-opacity duration-500",
									idx === currentIndex ? "opacity-100" : "opacity-0",
								)}
							>
								<Image
									src={src}
									alt={`${property.name} - ${idx + 1}`}
									fill
									className="object-cover"
								/>
							</div>
						))}

						{/* Prev / Next arrows — visible on hover */}
						{hasMultipleImages && (
							<>
								<button
									type="button"
									onClick={goPrev}
									className="absolute left-1.5 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
									aria-label="Previous image"
								>
									<ChevronLeft className="w-4 h-4" />
								</button>
								<button
									type="button"
									onClick={goNextClick}
									className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
									aria-label="Next image"
								>
									<ChevronRight className="w-4 h-4" />
								</button>
							</>
						)}

						{/* Dot indicators */}
						{hasMultipleImages && (
							<div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
								{images.map((_, idx) => (
									<span
										key={idx}
										className={cn(
											"w-1.5 h-1.5 rounded-full transition-colors",
											idx === currentIndex ? "bg-white" : "bg-white/50",
										)}
									/>
								))}
							</div>
						)}
					</>
				) : (
					<div className="w-full h-full flex items-center justify-center bg-linear-to-br from-gray-100 dark:from-surface-container to-gray-200 dark:to-surface-container-high">
						<Square className="w-16 h-16 text-gray-400 dark:text-on-surface-variant" />
					</div>
				)}

				{/* Status indicator — small pill at top-right */}
				<div
					className={cn(
						"absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide",
						statusColors[property.status],
					)}
				>
					{property.status.replace("_", " ")}
				</div>
			</div>

			{/* Property Details */}
			<div className="p-4">
				{/* Type + Name row */}
				<div className="mb-3">
					<div className="flex items-center gap-2 mb-1">
						<span
							className={cn(
								"w-2 h-2 rounded-full shrink-0",
								typeColors[property.propertyType],
							)}
						/>
						<span className="text-[11px] font-medium uppercase tracking-wide text-on-surface-variant">
							{property.propertyType.replace("_", " ")}
						</span>
					</div>
					<h3 className="text-lg font-semibold text-on-surface mb-1">
						{property.name}
					</h3>
					<div className="flex items-center text-on-surface-variant text-sm">
						<MapPin className="w-4 h-4 mr-1" />
						<span className="truncate">{property.address}</span>
					</div>
				</div>

				{/* Condition Tags */}
				{property.conditions && property.conditions.length > 0 && (
					<div className="flex flex-wrap gap-1.5 mb-3">
						{property.conditions.map((condition) => (
							<span
								key={condition}
								className={cn(
									"px-2 py-0.5 rounded-full text-[11px] font-medium",
									conditionColors[condition as PropertyCondition] ??
										"bg-slate-50 text-slate-700 border border-slate-200 dark:bg-slate-800/40 dark:text-slate-300 dark:border-slate-700",
								)}
							>
								{conditionLabels[condition as PropertyCondition] ?? condition}
							</span>
						))}
					</div>
				)}

				{/* Property Stats */}
				<div className="grid grid-cols-2 gap-4 mb-3">
					<div className="flex items-center text-sm">
						<DollarSign className="w-4 h-4 text-green-600 mr-1" />
						<div>
							<div className="text-on-surface-variant">Value</div>
							<div className="font-medium">
								{property.currentValue
									? formatCurrency(property.currentValue)
									: formatCurrency(property.purchasePrice)}
							</div>
						</div>
					</div>

					<div className="flex items-center text-sm">
						<Square className="w-4 h-4 text-blue-600 mr-1" />
						<div>
							<div className="text-on-surface-variant">Area</div>
							<div className="font-medium">{formatArea(property.area)}</div>
						</div>
					</div>

					{(property.quantity ?? 1) > 1 && (
						<div className="flex items-center text-sm">
							<Copy className="w-4 h-4 text-violet-600 mr-1" />
							<div>
								<div className="text-on-surface-variant">Quantity</div>
								<div className="font-medium">{property.quantity} units</div>
							</div>
						</div>
					)}
				</div>

				{/* Purchase Date */}
				<div className="flex items-center text-sm text-on-surface-variant">
					<Calendar className="w-4 h-4 mr-1" />
					<span>Purchased {formatDate(property.purchaseDate)}</span>
				</div>

				{/* Description */}
				{property.description && (
					<p className="text-sm text-on-surface-variant mt-2 line-clamp-2">
						{property.description}
					</p>
				)}

				{/* Owner info */}
				{property.owner && (
					<div className="mt-3 pt-3 border-t border-gray-100 dark:border-outline-variant">
						<UserAvatar
							name={property.owner.name}
							displayName={property.owner.displayName}
							username={property.owner.username}
							avatar={property.owner.avatar}
							ownerId={property.owner.id}
							size="xs"
							showLabel
						/>
					</div>
				)}
			</div>
		</div>
	);
}
