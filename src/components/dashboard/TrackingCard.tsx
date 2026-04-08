import { formatCurrencyFull } from "@/lib/utils";
import { Property } from "@/types/property";
import { ArrowUpRight, Eye, MapPin } from "lucide-react";

interface TrackingCardProps {
	property: Property;
	gradientClass: string;
	isOwn: boolean;
	onSelect: (id: string) => void;
}

export default function TrackingCard({
	property,
	gradientClass,
	isOwn,
	onSelect,
}: TrackingCardProps) {
	const worth = property.currentValue || property.purchasePrice || 0;

	return (
		<div
			onClick={() => onSelect(property.id)}
			className="flex gap-3 cursor-pointer group hover:bg-slate-50 dark:hover:bg-surface-container -mx-2 px-2 py-2 rounded-xl transition-all hover:translate-x-1 animate-fade-in"
		>
			{/* Thumbnail */}
			<div
				className={`w-16 h-16 rounded-xl ${gradientClass} shrink-0 overflow-hidden flex items-center justify-center relative`}
			>
				<MapPin className="w-6 h-6 text-white/20" />
				{/* Tracking eye badge */}
				<div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-white/90 flex items-center justify-center">
					<Eye className="w-2.5 h-2.5 text-secondary" />
				</div>
			</div>
			{/* Info */}
			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-1.5 mb-0.5">
					<p className="font-headline font-bold text-sm text-primary truncate">
						{property.name}
					</p>
				</div>
				<p className="text-xs font-semibold text-on-surface-variant">
					{formatCurrencyFull(worth, property.country)}
				</p>
				<div className="flex items-center gap-2 mt-1">
					<span
						className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
							isOwn
								? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300"
								: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300"
						}`}
					>
						{isOwn ? "Your listing" : "Marketplace"}
					</span>
					<span className="text-[10px] text-on-surface-variant">
						{(property.area || 0).toLocaleString()} sqm
					</span>
				</div>
			</div>
			{/* Arrow */}
			<button
				onClick={(e) => {
					e.stopPropagation();
					onSelect(property.id);
				}}
				className="text-outline group-hover:text-primary self-center transition-colors"
			>
				<ArrowUpRight className="w-4 h-4" />
			</button>
		</div>
	);
}
