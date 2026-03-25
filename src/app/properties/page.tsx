"use client";

import AppShell from "@/components/layout/AppShell";
import PropertyDrawer from "@/components/property/PropertyDrawer";
import { PropertyAPI } from "@/lib/api";
import {
	DocumentType,
	Property,
	PropertyStatus,
	PropertyType,
} from "@/types/property";
import {
	Building2,
	Calendar,
	ChevronRight,
	FileText,
	Home,
	MapPin,
	TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";

function formatCurrency(amount: number): string {
	return new Intl.NumberFormat("en-NG", {
		style: "currency",
		currency: "NGN",
		minimumFractionDigits: 0,
	}).format(amount);
}

function formatDate(date: Date | string): string {
	return new Date(date).toLocaleDateString("en-NG", {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}

function getStatusColor(status: PropertyStatus): string {
	switch (status) {
		case PropertyStatus.OWNED:
			return "bg-green-100 text-green-700";
		case PropertyStatus.FOR_SALE:
			return "bg-blue-100 text-blue-700";
		case PropertyStatus.DEVELOPMENT:
			return "bg-yellow-100 text-yellow-700";
		case PropertyStatus.UNDER_CONTRACT:
			return "bg-orange-100 text-orange-700";
		case PropertyStatus.RENTED:
			return "bg-purple-100 text-purple-700";
		default:
			return "bg-gray-100 text-gray-700";
	}
}

function getTypeLabel(type: PropertyType): string {
	return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getDocumentLabel(type: DocumentType): string {
	switch (type) {
		case DocumentType.CONTRACT_OF_SALE:
			return "Contract of Sale";
		case DocumentType.CERTIFICATE_OF_OCCUPANCY:
			return "C of O";
		case DocumentType.SURVEY:
			return "Survey Doc";
		case DocumentType.DEED:
			return "Deed";
		default:
			return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
	}
}

function PropertyCard({
	property,
	onSelect,
}: {
	property: Property;
	onSelect: (id: string) => void;
}) {
	const docCount = property.documents?.length ?? 0;
	const hasWorth = property.currentValue != null;
	const worthChange = hasWorth
		? ((property.currentValue! - property.purchasePrice) /
				property.purchasePrice) *
			100
		: null;

	return (
		<div onClick={() => onSelect(property.id)}>
			<div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-gray-300 transition-all cursor-pointer group">
				{/* Header */}
				<div className="flex items-start justify-between mb-3">
					<div className="flex-1 min-w-0">
						<h3 className="font-semibold text-gray-900 text-base truncate group-hover:text-black">
							{property.name}
						</h3>
						<div className="flex items-center gap-1 mt-1 text-gray-500 text-sm">
							<MapPin className="w-3 h-3 shrink-0" />
							<span className="truncate">{property.address}</span>
						</div>
					</div>
					<ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-700 shrink-0 ml-2 mt-1 transition-colors" />
				</div>

				{/* Badges */}
				<div className="flex items-center gap-2 mb-4">
					<span
						className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(property.status)}`}
					>
						{property.status.replace(/_/g, " ").toUpperCase()}
					</span>
					<span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
						{getTypeLabel(property.propertyType)}
					</span>
				</div>

				{/* Stats grid */}
				<div className="grid grid-cols-2 gap-3 mb-4">
					<div>
						<div className="text-xs text-gray-500 mb-0.5">Purchase Price</div>
						<div className="text-sm font-semibold text-gray-900">
							{formatCurrency(property.purchasePrice)}
						</div>
					</div>
					<div>
						<div className="text-xs text-gray-500 mb-0.5">Current Worth</div>
						<div className="flex items-center gap-1">
							<span className="text-sm font-semibold text-gray-900">
								{hasWorth ? formatCurrency(property.currentValue!) : "—"}
							</span>
							{worthChange !== null && (
								<span
									className={`text-xs font-medium ${worthChange >= 0 ? "text-green-600" : "text-red-600"}`}
								>
									{worthChange >= 0 ? "+" : ""}
									{worthChange.toFixed(1)}%
								</span>
							)}
						</div>
					</div>
					<div>
						<div className="text-xs text-gray-500 mb-0.5">Area</div>
						<div className="text-sm font-medium text-gray-700">
							{property.area.toLocaleString()} sqm
						</div>
					</div>
					<div>
						<div className="text-xs text-gray-500 mb-0.5">Purchase Date</div>
						<div className="flex items-center gap-1 text-sm font-medium text-gray-700">
							<Calendar className="w-3 h-3" />
							{formatDate(property.purchaseDate)}
						</div>
					</div>
				</div>

				{/* Footer */}
				<div className="flex items-center justify-between pt-3 border-t border-gray-100">
					<div className="flex items-center gap-1.5 text-gray-500 text-xs">
						<FileText className="w-3.5 h-3.5" />
						<span>
							{docCount} document{docCount !== 1 ? "s" : ""}
						</span>
					</div>
					{property.boughtFrom && (
						<div className="text-xs text-gray-500 truncate max-w-[180px]">
							From: <span className="text-gray-700">{property.boughtFrom}</span>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

export default function PropertiesPage() {
	const [properties, setProperties] = useState<Property[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [selectedId, setSelectedId] = useState<string | null>(null);

	useEffect(() => {
		const load = async () => {
			try {
				setLoading(true);
				const data = await PropertyAPI.getAllProperties();
				setProperties(data);
			} catch {
				setError("Failed to load properties");
			} finally {
				setLoading(false);
			}
		};
		load();
	}, []);

	// Summary stats
	const totalValue = properties.reduce(
		(sum, p) => sum + (p.currentValue ?? p.purchasePrice),
		0,
	);
	const totalPurchased = properties.reduce(
		(sum, p) => sum + p.purchasePrice,
		0,
	);
	const totalArea = properties.reduce((sum, p) => sum + p.area, 0);
	const totalDocs = properties.reduce(
		(sum, p) => sum + (p.documents?.length ?? 0),
		0,
	);

	return (
		<AppShell>
			<div className="px-8 py-8">
				{/* Page header */}
				<div className="mb-8">
					<div className="flex items-center gap-3 mb-1">
						<Home className="w-5 h-5 text-secondary" />
						<h1 className="font-headline text-3xl font-extrabold tracking-tighter text-primary">
							My Properties
						</h1>
					</div>
					<p className="text-sm text-on-surface-variant ml-8">
						Manage your land plots — documents, valuations, and transaction
						records
					</p>
				</div>
				{/* Summary bar */}
				{!loading && properties.length > 0 && (
					<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
						<div className="bg-surface-container-lowest rounded-xl border border-slate-100 p-5 shadow-sm">
							<div className="flex items-center gap-2 mb-2">
								<Building2 className="w-4 h-4 text-secondary" />
								<span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
									Properties
								</span>
							</div>
							<div className="font-headline text-2xl font-extrabold text-primary">
								{properties.length}
							</div>
						</div>
						<div className="bg-surface-container-lowest rounded-xl border border-slate-100 p-5 shadow-sm">
							<div className="flex items-center gap-2 mb-2">
								<TrendingUp className="w-4 h-4 text-secondary" />
								<span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
									Portfolio Worth
								</span>
							</div>
							<div className="font-headline text-2xl font-extrabold text-primary">
								{formatCurrency(totalValue)}
							</div>
						</div>
						<div className="bg-surface-container-lowest rounded-xl border border-slate-100 p-5 shadow-sm">
							<div className="flex items-center gap-2 mb-2">
								<MapPin className="w-4 h-4 text-secondary" />
								<span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
									Total Area
								</span>
							</div>
							<div className="font-headline text-2xl font-extrabold text-primary">
								{totalArea.toLocaleString()} sqm
							</div>
						</div>
						<div className="bg-surface-container-lowest rounded-xl border border-slate-100 p-5 shadow-sm">
							<div className="flex items-center gap-2 mb-2">
								<FileText className="w-4 h-4 text-secondary" />
								<span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
									Documents
								</span>
							</div>
							<div className="font-headline text-2xl font-extrabold text-primary">
								{totalDocs}
							</div>
						</div>
					</div>
				)}

				{/* States */}
				{loading && (
					<div className="grid grid-cols-3 gap-5">
						{[1, 2, 3].map((i) => (
							<div
								key={i}
								className="bg-white border border-gray-200 rounded-xl p-5 animate-pulse"
							>
								<div className="h-5 bg-gray-200 rounded mb-2 w-3/4" />
								<div className="h-4 bg-gray-200 rounded mb-4 w-1/2" />
								<div className="grid grid-cols-2 gap-3">
									<div className="h-10 bg-gray-200 rounded" />
									<div className="h-10 bg-gray-200 rounded" />
								</div>
							</div>
						))}
					</div>
				)}

				{error && <div className="text-center py-16 text-red-500">{error}</div>}

				{!loading && !error && properties.length === 0 && (
					<div className="text-center py-16 text-gray-500">
						No properties found. Add your first property to get started.
					</div>
				)}

				{!loading && properties.length > 0 && (
					<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
						{properties.map((property) => (
							<PropertyCard
								key={property.id}
								property={property}
								onSelect={setSelectedId}
							/>
						))}
					</div>
				)}
			</div>

			<PropertyDrawer
				propertyId={selectedId}
				onClose={() => setSelectedId(null)}
			/>
		</AppShell>
	);
}
