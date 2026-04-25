"use client";

import { useAuth } from "@/components/AuthContext";
import { usePortfolio } from "@/components/PortfolioContext";
import ChipInput from "@/components/ui/ChipInput";
import MasonryGrid from "@/components/ui/MasonryGrid";
import WitnessTagInput, {
	type WitnessEntry,
} from "@/components/ui/WitnessTagInput";
import { queryKeys, useProviderSettings } from "@/hooks/usePropertyQueries";
import { extractFieldsFromDocument } from "@/lib/documentExtractor";
import { getPropertyMedia } from "@/lib/utils";
import {
	DocumentType,
	MediaType,
	Property,
	PropertyCondition,
	PropertyDocument,
	PropertyStatus,
	PropertyType,
	StructureOccupancyStatus,
	ZoningType,
} from "@/types/property";
import { PROVIDER_DEFAULTS } from "@/types/providers";
import { useQueryClient } from "@tanstack/react-query";
import { Camera, FileText, Loader2, MapPin, Save } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import DocumentSidebar, { isMediaFile } from "./DocumentSidebar";

function generatePropertyName(): string {
	const now = new Date();
	const month = now.toLocaleString("en-US", { month: "short" }).toUpperCase();
	const year = now.getFullYear().toString().slice(-2);
	const seq = Math.random().toString(36).slice(2, 6).toUpperCase();
	return `PLOT-${month}${year}-${seq}`;
}

const MapLocationPicker = dynamic(
	() => import("@/components/maps/MapLocationPicker"),
	{ ssr: false },
);

const LocationPreviewMap = dynamic(
	() => import("@/components/maps/LocationPreviewMap"),
	{
		ssr: false,
		loading: () => (
			<div className="w-full h-full bg-surface-container animate-pulse rounded-lg" />
		),
	},
);

const GoogleMapLocationPicker = dynamic(
	() => import("@/components/maps/GoogleMapLocationPicker"),
	{ ssr: false },
);

const GoogleLocationPreviewMap = dynamic(
	() => import("@/components/maps/GoogleLocationPreviewMap"),
	{
		ssr: false,
		loading: () => (
			<div className="w-full h-full bg-surface-container animate-pulse rounded-lg" />
		),
	},
);

/* ── helpers ──────────────────────────────────────────── */

function inferDocumentType(file: File): DocumentType {
	const n = file.name.toLowerCase();
	if (n.includes("survey")) return DocumentType.SURVEY;
	if (n.includes("deed")) return DocumentType.DEED;
	if (n.includes("title")) return DocumentType.TITLE;
	if (n.includes("c of o") || n.includes("certificate"))
		return DocumentType.CERTIFICATE_OF_OCCUPANCY;
	if (n.includes("building") && n.includes("permit"))
		return DocumentType.BUILDING_PERMIT;
	if (n.includes("inspection")) return DocumentType.INSPECTION_REPORT;
	if (n.includes("contract")) return DocumentType.CONTRACT;
	if (n.includes("lease")) return DocumentType.LEASE;
	if (n.includes("tax")) return DocumentType.TAX_DOCUMENT;
	if (n.includes("insurance")) return DocumentType.INSURANCE;
	if (n.includes("permit")) return DocumentType.PERMIT;
	if (n.includes("appraisal")) return DocumentType.APPRAISAL;
	return DocumentType.OTHER;
}

const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
	[PropertyType.LAND]: "Land",
	[PropertyType.HOUSE]: "House",
	[PropertyType.APARTMENT]: "Apartment",
	[PropertyType.BUILDING]: "Building",
	[PropertyType.OFFICE]: "Office",
	[PropertyType.RETAIL]: "Retail",
	[PropertyType.WAREHOUSE]: "Warehouse",
	[PropertyType.FARM]: "Farm",
	[PropertyType.OTHER]: "Other",
};

const ZONING_LABELS: Record<ZoningType, string> = {
	[ZoningType.RESIDENTIAL]: "Residential",
	[ZoningType.COMMERCIAL]: "Commercial",
	[ZoningType.INDUSTRIAL]: "Industrial",
	[ZoningType.AGRICULTURAL]: "Agricultural",
	[ZoningType.MIXED_USE]: "Mixed Use",
	[ZoningType.UNSPECIFIED]: "Unspecified",
};

const STATUS_LABELS: Record<PropertyStatus, string> = {
	[PropertyStatus.OWNED]: "Owned",
	[PropertyStatus.UNDER_CONTRACT]: "Under Contract",
	[PropertyStatus.FOR_SALE]: "For Sale",
	[PropertyStatus.FOR_RENT]: "For Rent",
	[PropertyStatus.FOR_LEASE]: "For Lease",
	[PropertyStatus.RENTED]: "Rented",
	[PropertyStatus.LEASED]: "Leased",
	[PropertyStatus.DEVELOPMENT]: "Development",
};

const OWNER_TYPES = [
	{ value: "individual", label: "Individual" },
	{ value: "company", label: "Company" },
	{ value: "trust", label: "Trust" },
] as const;

const CONDITION_LABELS: Record<PropertyCondition, string> = {
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

function normalizeConditionValue(value: string): string {
	return value.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

function isHasStructureCondition(value: string): boolean {
	return normalizeConditionValue(value) === "has structure";
}

function includesHasStructureCondition(values: string[]): boolean {
	return values.some(isHasStructureCondition);
}

function removeHasStructureCondition(values: string[]): string[] {
	return values.filter((value) => !isHasStructureCondition(value));
}

const STRUCTURE_OCCUPANCY_LABELS: Record<StructureOccupancyStatus, string> = {
	[StructureOccupancyStatus.VACANT]: "Vacant",
	[StructureOccupancyStatus.OCCUPIED]: "Occupied",
	[StructureOccupancyStatus.PARTIALLY_OCCUPIED]: "Partially Occupied",
	[StructureOccupancyStatus.UNDER_CONSTRUCTION]: "Under Construction",
};

const COUNTRIES = [
	"Afghanistan",
	"Albania",
	"Algeria",
	"Andorra",
	"Angola",
	"Antigua and Barbuda",
	"Argentina",
	"Armenia",
	"Australia",
	"Austria",
	"Azerbaijan",
	"Bahamas",
	"Bahrain",
	"Bangladesh",
	"Barbados",
	"Belarus",
	"Belgium",
	"Belize",
	"Benin",
	"Bhutan",
	"Bolivia",
	"Bosnia and Herzegovina",
	"Botswana",
	"Brazil",
	"Brunei",
	"Bulgaria",
	"Burkina Faso",
	"Burundi",
	"Cabo Verde",
	"Cambodia",
	"Cameroon",
	"Canada",
	"Central African Republic",
	"Chad",
	"Chile",
	"China",
	"Colombia",
	"Comoros",
	"Congo",
	"Costa Rica",
	"Croatia",
	"Cuba",
	"Cyprus",
	"Czech Republic",
	"Democratic Republic of the Congo",
	"Denmark",
	"Djibouti",
	"Dominica",
	"Dominican Republic",
	"Ecuador",
	"Egypt",
	"El Salvador",
	"Equatorial Guinea",
	"Eritrea",
	"Estonia",
	"Eswatini",
	"Ethiopia",
	"Fiji",
	"Finland",
	"France",
	"Gabon",
	"Gambia",
	"Georgia",
	"Germany",
	"Ghana",
	"Greece",
	"Grenada",
	"Guatemala",
	"Guinea",
	"Guinea-Bissau",
	"Guyana",
	"Haiti",
	"Honduras",
	"Hungary",
	"Iceland",
	"India",
	"Indonesia",
	"Iran",
	"Iraq",
	"Ireland",
	"Israel",
	"Italy",
	"Ivory Coast",
	"Jamaica",
	"Japan",
	"Jordan",
	"Kazakhstan",
	"Kenya",
	"Kiribati",
	"Kuwait",
	"Kyrgyzstan",
	"Laos",
	"Latvia",
	"Lebanon",
	"Lesotho",
	"Liberia",
	"Libya",
	"Liechtenstein",
	"Lithuania",
	"Luxembourg",
	"Madagascar",
	"Malawi",
	"Malaysia",
	"Maldives",
	"Mali",
	"Malta",
	"Marshall Islands",
	"Mauritania",
	"Mauritius",
	"Mexico",
	"Micronesia",
	"Moldova",
	"Monaco",
	"Mongolia",
	"Montenegro",
	"Morocco",
	"Mozambique",
	"Myanmar",
	"Namibia",
	"Nauru",
	"Nepal",
	"Netherlands",
	"New Zealand",
	"Nicaragua",
	"Niger",
	"Nigeria",
	"North Korea",
	"North Macedonia",
	"Norway",
	"Oman",
	"Pakistan",
	"Palau",
	"Palestine",
	"Panama",
	"Papua New Guinea",
	"Paraguay",
	"Peru",
	"Philippines",
	"Poland",
	"Portugal",
	"Qatar",
	"Romania",
	"Russia",
	"Rwanda",
	"Saint Kitts and Nevis",
	"Saint Lucia",
	"Saint Vincent and the Grenadines",
	"Samoa",
	"San Marino",
	"Sao Tome and Principe",
	"Saudi Arabia",
	"Senegal",
	"Serbia",
	"Seychelles",
	"Sierra Leone",
	"Singapore",
	"Slovakia",
	"Slovenia",
	"Solomon Islands",
	"Somalia",
	"South Africa",
	"South Korea",
	"South Sudan",
	"Spain",
	"Sri Lanka",
	"Sudan",
	"Suriname",
	"Sweden",
	"Switzerland",
	"Syria",
	"Taiwan",
	"Tajikistan",
	"Tanzania",
	"Thailand",
	"Timor-Leste",
	"Togo",
	"Tonga",
	"Trinidad and Tobago",
	"Tunisia",
	"Turkey",
	"Turkmenistan",
	"Tuvalu",
	"Uganda",
	"Ukraine",
	"United Arab Emirates",
	"United Kingdom",
	"United States",
	"Uruguay",
	"Uzbekistan",
	"Vanuatu",
	"Vatican City",
	"Venezuela",
	"Vietnam",
	"Yemen",
	"Zambia",
	"Zimbabwe",
];

/* ── section card wrapper ────────────────────────────── */

function FormSection({
	icon: _Icon,
	title,
	children,
}: {
	icon?: React.ComponentType<{ className?: string }>;
	title: string;
	children: React.ReactNode;
}) {
	return (
		<div className="bg-card border border-border rounded-xl p-6">
			<h2 className="font-headline text-base font-bold text-on-surface mb-5">
				{title}
			</h2>
			{children}
		</div>
	);
}

/* ── reusable field wrappers ─────────────────────────── */

function Field({
	label,
	required,
	hint,
	children,
}: {
	label: string;
	required?: boolean;
	hint?: string;
	children: React.ReactNode;
}) {
	return (
		<label className="flex flex-col gap-1.5">
			<span className="text-xs font-medium text-on-surface-variant font-label">
				{label}
				{required && <span className="text-error ml-0.5">*</span>}
			</span>
			{hint && <span className="text-xs text-outline -mt-1">{hint}</span>}
			{children}
		</label>
	);
}

const inputCls =
	"w-full rounded-md border border-border bg-card px-3.5 py-2.5 text-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors font-body";

const selectCls = `${inputCls} appearance-none bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2374777f' d='M2.5 4.5L6 8l3.5-3.5'/%3E%3C/svg%3E")] bg-[length:12px] bg-[right_12px_center] bg-no-repeat pr-8`;

/* ── main form ───────────────────────────────────────── */

interface CreatePropertyFormProps {
	initialName?: string;
	onNameChange?: (name: string) => void;
	/** When provided, the form operates in edit mode (PUT instead of POST). */
	initialProperty?: Property;
}

export default function CreatePropertyForm({
	initialName,
	onNameChange,
	initialProperty,
}: CreatePropertyFormProps) {
	const router = useRouter();
	const { user } = useAuth();
	const { activePortfolio } = usePortfolio();
	const queryClient = useQueryClient();
	const { data: providerSettings } = useProviderSettings();
	const useGoogleMapPicker =
		(providerSettings?.mapRenderer ?? PROVIDER_DEFAULTS.mapRenderer) ===
		"google";
	const LocationPickerComponent = useGoogleMapPicker
		? GoogleMapLocationPicker
		: MapLocationPicker;
	const LocationPreviewComponent = useGoogleMapPicker
		? GoogleLocationPreviewMap
		: LocationPreviewMap;
	const isEdit = !!initialProperty;

	/* basic info */
	const [name, setName] = useState(initialProperty?.name || initialName || "");
	useEffect(() => {
		if (initialName) setName(initialName);
	}, [initialName]);
	const [address, setAddress] = useState(initialProperty?.address || "");
	const [description, setDescription] = useState(
		initialProperty?.description || "",
	);

	/* property details */
	const [propertyType, setPropertyType] = useState<PropertyType>(
		initialProperty?.propertyType || PropertyType.LAND,
	);
	const [area, setArea] = useState(
		initialProperty?.area ? String(initialProperty.area) : "",
	);
	const [zoning, setZoning] = useState<ZoningType | "">(
		initialProperty?.zoning || "",
	);
	const [taxId, setTaxId] = useState(initialProperty?.taxId || "");
	const [status, setStatus] = useState<PropertyStatus>(
		initialProperty?.status || PropertyStatus.OWNED,
	);
	const [conditions, setConditions] = useState<string[]>(
		initialProperty?.conditions || [],
	);
	const [quantity, setQuantity] = useState(
		initialProperty?.quantity ? String(initialProperty.quantity) : "1",
	);
	const initialLandStructureEnabled =
		Boolean(initialProperty?.structure) ||
		includesHasStructureCondition(initialProperty?.conditions || []);
	const [structureEnabled, setStructureEnabled] = useState(
		initialLandStructureEnabled,
	);
	const [structureName, setStructureName] = useState(
		initialProperty?.structure?.name || "",
	);
	const [structureType, setStructureType] = useState(
		initialProperty?.structure?.type || "",
	);
	const [structureCondition, setStructureCondition] = useState(
		initialProperty?.structure?.condition || "",
	);
	const [structureFloors, setStructureFloors] = useState(
		initialProperty?.structure?.floors != null
			? String(initialProperty.structure.floors)
			: "",
	);
	const [structureArea, setStructureArea] = useState(
		initialProperty?.structure?.area != null
			? String(initialProperty.structure.area)
			: "",
	);
	const [structureBedrooms, setStructureBedrooms] = useState(
		initialProperty?.structure?.bedrooms != null
			? String(initialProperty.structure.bedrooms)
			: initialProperty?.bedrooms != null
				? String(initialProperty.bedrooms)
				: "",
	);
	const [structureBathrooms, setStructureBathrooms] = useState(
		initialProperty?.structure?.bathrooms != null
			? String(initialProperty.structure.bathrooms)
			: initialProperty?.bathrooms != null
				? String(initialProperty.bathrooms)
				: "",
	);
	const [structureParkingSpaces, setStructureParkingSpaces] = useState(
		initialProperty?.structure?.parkingSpaces != null
			? String(initialProperty.structure.parkingSpaces)
			: initialProperty?.parkingSpaces != null
				? String(initialProperty.parkingSpaces)
				: "",
	);
	const [structureOccupancyStatus, setStructureOccupancyStatus] = useState<
		StructureOccupancyStatus | ""
	>(initialProperty?.structure?.occupancyStatus || "");
	const [structureYearBuilt, setStructureYearBuilt] = useState(
		initialProperty?.structure?.yearBuilt != null
			? String(initialProperty.structure.yearBuilt)
			: "",
	);
	const [structureNotes, setStructureNotes] = useState(
		initialProperty?.structure?.notes || "",
	);
	// One-way sync: keep checkbox in sync when the user edits the
	// conditions chip list directly. Checkbox → conditions is handled
	// atomically in the onChange handler to avoid effect ping-pong.
	useEffect(() => {
		const hasStructure = includesHasStructureCondition(conditions);
		setStructureEnabled((prev) =>
			prev === hasStructure ? prev : hasStructure,
		);
	}, [conditions]);

	const handleToggleStructure = (next: boolean) => {
		setStructureEnabled(next);
		setConditions((prev) => {
			const hasStructure = includesHasStructureCondition(prev);
			if (next && !hasStructure) {
				return [...prev, PropertyCondition.HAS_STRUCTURE];
			}
			if (!next && hasStructure) {
				return removeHasStructureCondition(prev);
			}
			return prev;
		});
	};

	/* location */
	const [lat, setLat] = useState(
		initialProperty?.coordinates?.lat
			? String(initialProperty.coordinates.lat)
			: "",
	);
	const [lng, setLng] = useState(
		initialProperty?.coordinates?.lng
			? String(initialProperty.coordinates.lng)
			: "",
	);
	const [propertyState, setPropertyState] = useState(
		initialProperty?.state || "",
	);
	const [city, setCity] = useState(initialProperty?.city || "");
	const [country, setCountry] = useState(initialProperty?.country || "");

	/* financial */
	const [purchaseDate, setPurchaseDate] = useState(
		initialProperty?.purchaseDate
			? new Date(initialProperty.purchaseDate).toISOString().split("T")[0]
			: "",
	);
	const [purchasePrice, setPurchasePrice] = useState(() => {
		if (!initialProperty?.purchasePrice) return "";
		const raw = String(initialProperty.purchasePrice);
		const parts = raw.split(".");
		parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
		return parts.join(".");
	});
	const [listingPrice, setListingPrice] = useState(() => {
		if (!initialProperty?.listingPrice) return "";
		const raw = String(initialProperty.listingPrice);
		const parts = raw.split(".");
		parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
		return parts.join(".");
	});
	const [currentValue, setCurrentValue] = useState(() => {
		if (!initialProperty?.currentValue) return "";
		const raw = String(initialProperty.currentValue);
		const parts = raw.split(".");
		parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
		return parts.join(".");
	});
	const [soldPrice, setSoldPrice] = useState(() => {
		if (!initialProperty?.soldPrice) return "";
		const raw = String(initialProperty.soldPrice);
		const parts = raw.split(".");
		parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
		return parts.join(".");
	});
	const [soldDate, setSoldDate] = useState(
		initialProperty?.soldDate
			? new Date(initialProperty.soldDate).toISOString().split("T")[0]
			: "",
	);

	/* transaction */
	const [boughtFrom, setBoughtFrom] = useState(
		initialProperty?.boughtFrom || "",
	);
	const [witnesses, setWitnesses] = useState<WitnessEntry[]>(
		initialProperty?.witnesses ?? [],
	);
	const [signatures, setSignatures] = useState<WitnessEntry[]>(
		initialProperty?.signatures ?? [],
	);

	/* owner */
	const [ownerName, setOwnerName] = useState(
		initialProperty?.owner?.name || "",
	);
	const [ownerEmail, setOwnerEmail] = useState(
		initialProperty?.owner?.email || "",
	);
	const [ownerPhone, setOwnerPhone] = useState(
		initialProperty?.owner?.phone || "",
	);
	const [ownerType, setOwnerType] = useState<
		"individual" | "company" | "trust"
	>(initialProperty?.owner?.type || "individual");

	/* owner mode: portfolio_owner | self | custom */
	type OwnerMode = "portfolio_owner" | "self" | "custom";
	const [ownerMode, setOwnerMode] = useState<OwnerMode>(
		isEdit ? "custom" : "portfolio_owner",
	);
	type OwnerUserInfo = {
		id: string;
		name: string;
		username: string;
		displayName: string;
		email: string;
		avatar?: string;
		type: "individual" | "company" | "trust";
	};
	const [portfolioOwnerUser, setPortfolioOwnerUser] =
		useState<OwnerUserInfo | null>(null);

	/* map picker */
	const [mapPickerOpen, setMapPickerOpen] = useState(false);

	/* submission state */
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	/* document upload state */
	const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
	const [existingDocs, setExistingDocs] = useState<PropertyDocument[]>(
		initialProperty?.documents ?? [],
	);
	const [removedDocIds, setRemovedDocIds] = useState<string[]>([]);
	const [sidebarOpen, setSidebarOpen] = useState(true);
	const [extracting, setExtracting] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	/* media upload state */
	const [uploadedMedia, setUploadedMedia] = useState<File[]>([]);
	const [removedMediaUrls, setRemovedMediaUrls] = useState<string[]>([]);
	const mediaInputRef = useRef<HTMLInputElement>(null);

	/* existing media (edit mode) */
	const [existingMedia, setExistingMedia] = useState(() =>
		initialProperty ? getPropertyMedia(initialProperty) : [],
	);

	// Fetch portfolio owner info when current user is a team member (not the portfolio owner)
	useEffect(() => {
		if (isEdit || !activePortfolio || !user) return;
		if (user.id === activePortfolio.createdBy) return;
		fetch(`/api/portfolios/${activePortfolio.id}/members`)
			.then((r) => r.json())
			.then((data: unknown) => {
				const members = Array.isArray(data) ? data : [];
				const ownerMember = members.find(
					(m: any) => m.userId === activePortfolio.createdBy,
				);
				if (ownerMember?.user) {
					setPortfolioOwnerUser({
						id: ownerMember.user.id,
						name: ownerMember.user.name,
						username: ownerMember.user.username,
						displayName: ownerMember.user.displayName,
						email: ownerMember.user.email,
						avatar: ownerMember.user.avatar,
						type: "individual",
					});
				}
			})
			.catch(() => {});
	}, [isEdit, activePortfolio, user]);

	const handleDocumentUpload = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const files = e.target.files;
			if (!files || files.length === 0) return;
			const docFiles = Array.from(files).filter((f) => !isMediaFile(f));
			if (docFiles.length > 0) {
				setUploadedFiles((prev) => [...prev, ...docFiles]);
				setSidebarOpen(true);
			}
			if (fileInputRef.current) fileInputRef.current.value = "";
		},
		[],
	);

	const handleMediaUpload = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const files = e.target.files;
			if (!files || files.length === 0) return;
			const mediaFiles = Array.from(files).filter(isMediaFile);
			if (mediaFiles.length > 0) {
				setUploadedMedia((prev) => [...prev, ...mediaFiles]);
				setSidebarOpen(true);
			}
			if (mediaInputRef.current) mediaInputRef.current.value = "";
		},
		[],
	);

	const handleExtractFromFile = useCallback(async (file: File) => {
		setExtracting(true);
		setError(null);

		try {
			const fields = await extractFieldsFromDocument(file);
			const hasAnyField = Object.values(fields).some((v) => v !== undefined);

			if (fields.name) setName(fields.name);
			if (fields.address) setAddress(fields.address);
			if (fields.description) setDescription(fields.description ?? "");
			if (fields.propertyType) setPropertyType(fields.propertyType);
			if (fields.area) setArea(fields.area);
			if (fields.zoning) setZoning(fields.zoning);
			if (fields.taxId) setTaxId(fields.taxId ?? "");
			if (fields.status) setStatus(fields.status);
			if (fields.lat) setLat(fields.lat);
			if (fields.lng) setLng(fields.lng);
			if (fields.purchaseDate) setPurchaseDate(fields.purchaseDate);
			if (fields.purchasePrice) {
				const raw = (fields.purchasePrice ?? "").replace(/[^0-9.]/g, "");
				const parts = raw.split(".");
				parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
				setPurchasePrice(parts.join("."));
			}
			if (fields.currentValue) {
				const raw = (fields.currentValue ?? "").replace(/[^0-9.]/g, "");
				const parts = raw.split(".");
				parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
				setCurrentValue(parts.join("."));
			}
			if (fields.boughtFrom) setBoughtFrom(fields.boughtFrom ?? "");
			if (fields.witnesses) {
				const names = (fields.witnesses ?? "")
					.split(",")
					.map((n: string) => n.trim())
					.filter(Boolean);
				setWitnesses(names.map((n: string) => ({ name: n, signature: "" })));
			}
			if (fields.signatures) {
				const names = (fields.signatures ?? "")
					.split(",")
					.map((n: string) => n.trim())
					.filter(Boolean);
				setSignatures(names.map((n: string) => ({ name: n, signature: "" })));
			}
			if (fields.ownerName) setOwnerName(fields.ownerName);
			if (fields.ownerEmail) setOwnerEmail(fields.ownerEmail ?? "");
			if (fields.ownerPhone) setOwnerPhone(fields.ownerPhone ?? "");
			if (fields.ownerType) setOwnerType(fields.ownerType);
			if (fields.state) setPropertyState(fields.state);
			if (fields.city) setCity(fields.city);
			if (fields.country) setCountry(fields.country);

			if (!hasAnyField) {
				setError("Document was read but no fields could be matched.");
			}
		} catch (err) {
			console.error("[CreatePropertyForm] Document extraction failed:", err);
			setError("Could not extract data from this document.");
		} finally {
			setExtracting(false);
		}
	}, []);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError(null);

		// Only require at least one field to be filled
		const hasAnyField = [
			name,
			address,
			description,
			area,
			lat,
			lng,
			purchaseDate,
			purchasePrice,
			listingPrice,
			currentValue,
			soldPrice,
			soldDate,
			boughtFrom,
			witnesses.length > 0 ? "yes" : "",
			signatures.length > 0 ? "yes" : "",
			ownerName,
			ownerEmail,
			ownerPhone,
			zoning,
			taxId,
			structureName,
			structureType,
			structureCondition,
			structureFloors,
			structureArea,
			structureBedrooms,
			structureBathrooms,
			structureParkingSpaces,
			structureOccupancyStatus,
			structureYearBuilt,
			structureNotes,
			propertyState,
			city,
			country,
		].some((v) => v.trim() !== "");

		if (!hasAnyField && uploadedFiles.length === 0) {
			setError("Please fill in at least one field before saving.");
			return;
		}

		setSubmitting(true);

		try {
			const id = isEdit ? initialProperty.id : crypto.randomUUID();
			const normalizedConditions = Array.from(
				new Set(
					conditions.map((condition) =>
						isHasStructureCondition(condition)
							? PropertyCondition.HAS_STRUCTURE
							: condition,
					),
				),
			);

			const property = {
				id,
				name: name.trim() || "Untitled Property",
				portfolioId: activePortfolio?.id,
				address: address.trim() || undefined,
				description: description.trim() || undefined,
				coordinates:
					lat && lng
						? { lat: parseFloat(lat), lng: parseFloat(lng) }
						: undefined,
				area: area ? parseFloat(area) : undefined,
				propertyType,
				purchaseDate: purchaseDate ? new Date(purchaseDate) : undefined,
				purchasePrice: purchasePrice
					? parseFloat(purchasePrice.replace(/,/g, ""))
					: undefined,
				listingPrice: listingPrice
					? parseFloat(listingPrice.replace(/,/g, ""))
					: undefined,
				currentValue: currentValue
					? parseFloat(currentValue.replace(/,/g, ""))
					: undefined,
				soldPrice: soldPrice
					? parseFloat(soldPrice.replace(/,/g, ""))
					: undefined,
				soldDate: soldDate ? new Date(soldDate) : undefined,
				status,
				conditions:
					normalizedConditions.length > 0 ? normalizedConditions : undefined,
				quantity: quantity ? Math.max(1, parseInt(quantity, 10)) : 1,
				structure: structureEnabled
					? {
							name: structureName.trim() || undefined,
							type: structureType.trim() || undefined,
							condition: structureCondition.trim() || undefined,
							floors: structureFloors
								? Math.max(1, parseInt(structureFloors, 10))
								: undefined,
							area: structureArea ? parseFloat(structureArea) : undefined,
							bedrooms: structureBedrooms
								? Math.max(0, parseInt(structureBedrooms, 10))
								: undefined,
							bathrooms: structureBathrooms
								? Math.max(0, parseFloat(structureBathrooms))
								: undefined,
							parkingSpaces: structureParkingSpaces
								? Math.max(0, parseInt(structureParkingSpaces, 10))
								: undefined,
							occupancyStatus: structureOccupancyStatus || undefined,
							yearBuilt: structureYearBuilt
								? parseInt(structureYearBuilt, 10)
								: undefined,
							notes: structureNotes.trim() || undefined,
						}
					: undefined,
				bedrooms:
					structureEnabled && structureBedrooms
						? Math.max(0, parseInt(structureBedrooms, 10))
						: undefined,
				bathrooms:
					structureEnabled && structureBathrooms
						? Math.max(0, parseFloat(structureBathrooms))
						: undefined,
				parkingSpaces:
					structureEnabled && structureParkingSpaces
						? Math.max(0, parseInt(structureParkingSpaces, 10))
						: undefined,
				zoning: zoning || undefined,
				taxId: taxId.trim() || undefined,
				state: propertyState.trim() || undefined,
				city: city.trim() || undefined,
				country: country.trim() || undefined,
				boughtFrom: boughtFrom.trim() || undefined,
				witnesses: witnesses.length > 0 ? witnesses : undefined,
				signatures: signatures.length > 0 ? signatures : undefined,
				owner: (() => {
					if (user && ownerMode !== "custom") {
						const isTeamMember = user.id !== activePortfolio?.createdBy;
						const ownerUser: OwnerUserInfo =
							ownerMode === "portfolio_owner" &&
							isTeamMember &&
							portfolioOwnerUser
								? portfolioOwnerUser
								: user;
						return {
							id: ownerUser.id,
							name: ownerUser.name,
							username: ownerUser.username,
							displayName: ownerUser.displayName,
							email: ownerUser.email,
							avatar: ownerUser.avatar,
							phone: (ownerUser as any).phone || ownerPhone.trim() || undefined,
							type: ownerUser.type,
						};
					}
					// custom / unauthenticated: use manual fields
					const fullName =
						ownerName.trim() ||
						`PROP-${Date.now().toString(36).slice(-4).toUpperCase()}`;
					const generatedUsername = fullName
						.toLowerCase()
						.replace(/[^a-z0-9]+/g, "_")
						.replace(/^_|_$/g, "");
					return {
						id: crypto.randomUUID(),
						name: fullName,
						username: generatedUsername,
						displayName: fullName,
						email: ownerEmail.trim() || "unspecified@plotfolio.app",
						phone: ownerPhone.trim() || undefined,
						type: ownerType,
					};
				})(),
				...(isEdit ? {} : { documents: [] }),
			};

			/* In edit mode, PUT to update; in create mode, POST to create. */
			const res = await fetch(
				isEdit ? `/api/properties/${id}` : "/api/properties",
				{
					method: isEdit ? "PUT" : "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(property),
				},
			);

			if (!res.ok)
				throw new Error(
					isEdit ? "Failed to update property" : "Failed to create property",
				);

			// Delete removed existing documents
			for (const docId of removedDocIds) {
				await fetch(`/api/properties/${id}/documents?docId=${docId}`, {
					method: "DELETE",
				});
			}

			// Upload new documents to the property
			for (const file of uploadedFiles) {
				const formData = new FormData();
				formData.append("file", file);
				formData.append("name", file.name);
				formData.append("type", inferDocumentType(file));

				await fetch(`/api/properties/${id}/documents`, {
					method: "POST",
					body: formData,
				});
			}

			// Delete removed existing media
			for (const url of removedMediaUrls) {
				await fetch(
					`/api/properties/${id}/media?url=${encodeURIComponent(url)}`,
					{ method: "DELETE" },
				);
			}

			// Upload new media files
			for (const file of uploadedMedia) {
				let mediaType: MediaType = MediaType.IMAGE;
				if (file.type.startsWith("video/")) mediaType = MediaType.VIDEO;
				else if (file.type.startsWith("audio/")) mediaType = MediaType.AUDIO;

				const formData = new FormData();
				formData.append("file", file);
				formData.append("type", mediaType);

				await fetch(`/api/properties/${id}/media`, {
					method: "POST",
					body: formData,
				});
			}

			// Invalidate property queries so lists update immediately
			await queryClient.invalidateQueries({
				queryKey: queryKeys.properties.all,
			});

			router.push(
				isEdit ? `/portfolio/properties/${id}` : "/portfolio/properties",
			);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Something went wrong");
		} finally {
			setSubmitting(false);
		}
	}

	const handleRemoveFile = useCallback((index: number) => {
		setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
	}, []);

	const handleRemoveMediaFile = useCallback((index: number) => {
		setUploadedMedia((prev) => prev.filter((_, i) => i !== index));
	}, []);

	return (
		<div
			className={`flex flex-col h-screen ${isEdit ? "px-4 sm:px-8 py-6" : ""}`}
		>
			<form
				onSubmit={handleSubmit}
				className="flex flex-col justify-between flex-1 min-w-0"
			>
				<div>
					{/* ── Upload Zones (Media + Documents) ────── */}
					<div className="mb-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
						{/* Media zone */}
						<label
							htmlFor="media-upload"
							className="flex items-center gap-3 p-4 rounded-xl border border-dashed cursor-pointer transition-colors border-border bg-card hover:border-primary/40"
						>
							<input
								ref={mediaInputRef}
								id="media-upload"
								type="file"
								accept="image/*,video/*,audio/*"
								multiple
								className="hidden"
								onChange={handleMediaUpload}
							/>
							<div className="shrink-0 w-9 h-9 rounded-lg bg-blue-500 flex items-center justify-center">
								<Camera className="w-4 h-4 text-white" />
							</div>
							<div className="flex-1 min-w-0">
								<p className="font-headline text-sm font-bold text-on-surface">
									Photos &amp; Media
								</p>
								<p className="text-xs text-on-surface-variant mt-0.5 font-body">
									Images, videos, audio recordings
								</p>
							</div>
							{uploadedMedia.length > 0 && (
								<span className="shrink-0 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
									{uploadedMedia.length + existingMedia.length}
								</span>
							)}
						</label>

						{/* Documents zone */}
						<label
							htmlFor="doc-upload"
							className="flex items-center gap-3 p-4 rounded-xl border border-dashed cursor-pointer transition-colors border-border bg-card hover:border-primary/40"
						>
							<input
								ref={fileInputRef}
								id="doc-upload"
								type="file"
								accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
								multiple
								className="hidden"
								onChange={handleDocumentUpload}
							/>
							<div className="shrink-0 w-9 h-9 rounded-lg bg-amber-500 flex items-center justify-center">
								<FileText className="w-4 h-4 text-white" />
							</div>
							<div className="flex-1 min-w-0">
								<p className="font-headline text-sm font-bold text-on-surface">
									Documents
								</p>
								<p className="text-xs text-on-surface-variant mt-0.5 font-body">
									Surveys, deeds, permits, contracts
								</p>
							</div>
							{(uploadedFiles.length > 0 || existingDocs.length > 0) && (
								<span className="shrink-0 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
									{uploadedFiles.length + existingDocs.length}
								</span>
							)}
						</label>
					</div>

					{/* ── Masonry grid + Document sidebar row ── */}
					<div className="flex items-start gap-5">
						<div className="flex-1 min-w-0">
							<MasonryGrid minColWidth={320} maxCols={3} gap={20}>
								{/* ── Basic Info ──────────────────────────── */}
								<FormSection title="Basic Information">
									<div className="grid grid-cols-1 gap-4">
										<Field label="Property Name">
											<input
												className={inputCls}
												placeholder="e.g. Riverside Executive Property"
												value={name}
												onChange={(e) => {
													setName(e.target.value);
													onNameChange?.(e.target.value);
												}}
											/>
										</Field>

										<Field label="Address">
											<input
												className={inputCls}
												placeholder="e.g. 42 Oak Street, Springfield"
												value={address}
												onChange={(e) => setAddress(e.target.value)}
											/>
										</Field>

										<Field label="Description">
											<textarea
												className={`${inputCls} resize-none`}
												rows={3}
												placeholder="Brief description of the property…"
												value={description}
												onChange={(e) => setDescription(e.target.value)}
											/>
										</Field>
									</div>
								</FormSection>

								{/* ── Property Details ────────────────────── */}
								<FormSection title="Property Details">
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
										<Field label="Property Type">
											<select
												className={selectCls}
												value={propertyType}
												onChange={(e) =>
													setPropertyType(e.target.value as PropertyType)
												}
											>
												{Object.entries(PROPERTY_TYPE_LABELS).map(
													([val, label]) => (
														<option key={val} value={val}>
															{label}
														</option>
													),
												)}
											</select>
										</Field>
										<Field label="Status">
											<select
												className={selectCls}
												value={status}
												onChange={(e) =>
													setStatus(e.target.value as PropertyStatus)
												}
											>
												{Object.entries(STATUS_LABELS).map(([val, label]) => (
													<option key={val} value={val}>
														{label}
													</option>
												))}
											</select>
										</Field>
										<Field label="Area (sqm)">
											<input
												type="number"
												className={inputCls}
												placeholder="e.g. 800"
												value={area}
												onChange={(e) => setArea(e.target.value)}
												min={0}
												step="any"
											/>
										</Field>
										<Field label="Zoning">
											<select
												className={selectCls}
												value={zoning}
												onChange={(e) =>
													setZoning(e.target.value as ZoningType | "")
												}
											>
												<option value="">— Not set —</option>
												{Object.entries(ZONING_LABELS).map(([val, label]) => (
													<option key={val} value={val}>
														{label}
													</option>
												))}
											</select>
										</Field>
										<Field label="Tax ID">
											<input
												className={inputCls}
												placeholder="e.g. ABJ-TAX-2024-001"
												value={taxId}
												onChange={(e) => setTaxId(e.target.value)}
											/>
										</Field>
										<Field label="Quantity">
											<input
												type="number"
												className={inputCls}
												placeholder="e.g. 1"
												value={quantity}
												onChange={(e) => setQuantity(e.target.value)}
												min={1}
												step="1"
											/>
											<p className="text-[11px] text-outline mt-1 font-body">
												How many identical units (plots, buildings) at this
												location?
											</p>
										</Field>{" "}
									</div>

									{/* Condition Tags */}
									<div className="mt-4">
										<span className="text-xs font-medium text-on-surface-variant font-label">
											Property Condition
										</span>
										<p className="text-[11px] text-outline mt-0.5 mb-2 font-body">
											Type to search or add your own
										</p>
										<ChipInput
											value={conditions}
											onChange={setConditions}
											suggestions={Object.keys(CONDITION_LABELS)}
											formatLabel={(v) =>
												CONDITION_LABELS[v as PropertyCondition] ?? v
											}
											placeholder="e.g. Cleared, Fenced, Flat terrain…"
										/>
									</div>
								</FormSection>

								{(propertyType === PropertyType.LAND ||
									structureEnabled ||
									Boolean(initialProperty?.structure)) && (
									<FormSection title="Structure">
										<div className="space-y-4">
											<label className="flex items-start gap-3 rounded-md border border-border bg-surface-container px-4 py-3 cursor-pointer">
												<input
													type="checkbox"
													className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
													checked={structureEnabled}
													onChange={(e) =>
														handleToggleStructure(e.target.checked)
													}
												/>
												<div>
													<p className="text-sm font-medium text-on-surface">
														This land has an existing structure
													</p>
													<p className="text-xs text-outline mt-1 font-body">
														Capture building details, occupancy, and other
														improvements on the land.
													</p>
												</div>
											</label>

											{structureEnabled && (
												<>
													<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
														<Field label="Structure Name">
															<input
																className={inputCls}
																placeholder="e.g. Gatehouse, Bungalow, Warehouse"
																value={structureName}
																onChange={(e) =>
																	setStructureName(e.target.value)
																}
															/>
														</Field>
														<Field label="Structure Type">
															<input
																className={inputCls}
																placeholder="e.g. Detached house, Office block, Shop row"
																value={structureType}
																onChange={(e) =>
																	setStructureType(e.target.value)
																}
															/>
														</Field>
														<Field label="Structure Condition">
															<input
																className={inputCls}
																placeholder="e.g. Finished, Shell only, Needs repair"
																value={structureCondition}
																onChange={(e) =>
																	setStructureCondition(e.target.value)
																}
															/>
														</Field>
														<Field label="Occupancy Status">
															<select
																className={selectCls}
																value={structureOccupancyStatus}
																onChange={(e) =>
																	setStructureOccupancyStatus(
																		e.target.value as
																			| StructureOccupancyStatus
																			| "",
																	)
																}
															>
																<option value="">Select status</option>
																{Object.entries(STRUCTURE_OCCUPANCY_LABELS).map(
																	([value, label]) => (
																		<option key={value} value={value}>
																			{label}
																		</option>
																	),
																)}
															</select>
														</Field>
													</div>

													<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
														<Field label="Built-up Area (sqm)">
															<input
																type="number"
																className={inputCls}
																placeholder="e.g. 240"
																value={structureArea}
																onChange={(e) =>
																	setStructureArea(e.target.value)
																}
																min={0}
																step="any"
															/>
														</Field>
														<Field label="Floors">
															<input
																type="number"
																className={inputCls}
																placeholder="e.g. 2"
																value={structureFloors}
																onChange={(e) =>
																	setStructureFloors(e.target.value)
																}
																min={1}
																step="1"
															/>
														</Field>
														<Field label="Bedrooms">
															<input
																type="number"
																className={inputCls}
																placeholder="e.g. 4"
																value={structureBedrooms}
																onChange={(e) =>
																	setStructureBedrooms(e.target.value)
																}
																min={0}
																step="1"
															/>
														</Field>
														<Field label="Bathrooms">
															<input
																type="number"
																className={inputCls}
																placeholder="e.g. 3"
																value={structureBathrooms}
																onChange={(e) =>
																	setStructureBathrooms(e.target.value)
																}
																min={0}
																step="0.5"
															/>
														</Field>
														<Field label="Parking Spaces">
															<input
																type="number"
																className={inputCls}
																placeholder="e.g. 6"
																value={structureParkingSpaces}
																onChange={(e) =>
																	setStructureParkingSpaces(e.target.value)
																}
																min={0}
																step="1"
															/>
														</Field>
														<Field label="Year Built">
															<input
																type="number"
																className={inputCls}
																placeholder="e.g. 2021"
																value={structureYearBuilt}
																onChange={(e) =>
																	setStructureYearBuilt(e.target.value)
																}
																min={1800}
																step="1"
															/>
														</Field>
													</div>

													<Field label="Notes">
														<textarea
															className={`${inputCls} resize-none`}
															rows={3}
															placeholder="Add any extra context about the structure, improvements, or current use"
															value={structureNotes}
															onChange={(e) =>
																setStructureNotes(e.target.value)
															}
														/>
													</Field>
												</>
											)}
										</div>
									</FormSection>
								)}

								{/* ── Location ────────────────────────────── */}
								<FormSection title="Location">
									{/* Map preview + prompt bar */}
									<div className="rounded-sm border border-border overflow-hidden max-w-md">
										<div
											className="relative w-full bg-surface-container cursor-pointer"
											style={{ height: 180 }}
											onClick={() => setMapPickerOpen(true)}
										>
											{lat && lng ? (
												<LocationPreviewComponent
													lat={parseFloat(lat)}
													lng={parseFloat(lng)}
													onClick={() => setMapPickerOpen(true)}
												/>
											) : (
												<div className="w-full h-full flex flex-col items-center justify-center gap-2 text-outline">
													<MapPin className="w-8 h-8 opacity-40" />
													<span className="text-xs">No location selected</span>
												</div>
											)}
										</div>
										<button
											type="button"
											onClick={() => setMapPickerOpen(true)}
											className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium bg-card hover:bg-surface-container-high transition-colors text-primary font-label border-t border-border"
										>
											<MapPin className="w-3.5 h-3.5" />
											{lat && lng ? "Change location" : "Pick a location"}
										</button>
									</div>

									<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
										<Field label="Latitude">
											<input
												type="number"
												className={inputCls}
												placeholder="e.g. 40.7128"
												value={lat}
												onChange={(e) => setLat(e.target.value)}
												step="any"
											/>
										</Field>

										<Field label="Longitude">
											<input
												type="number"
												className={inputCls}
												placeholder="e.g. -74.0060"
												value={lng}
												onChange={(e) => setLng(e.target.value)}
												step="any"
											/>
										</Field>
									</div>

									<p className="mt-2 text-xs text-outline font-body">
										Coordinates in decimal degrees.
									</p>

									<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
										<Field label="Country">
											<select
												className={selectCls}
												value={country}
												onChange={(e) => setCountry(e.target.value)}
											>
												<option value="">Select country</option>
												{COUNTRIES.map((c) => (
													<option key={c} value={c}>
														{c}
													</option>
												))}
											</select>
										</Field>

										<Field label="State">
											<input
												className={inputCls}
												placeholder="e.g. California"
												value={propertyState}
												onChange={(e) => setPropertyState(e.target.value)}
											/>
										</Field>

										<Field label="City">
											<input
												className={inputCls}
												placeholder="e.g. Los Angeles"
												value={city}
												onChange={(e) => setCity(e.target.value)}
											/>
										</Field>
									</div>
								</FormSection>

								{/* ── Financial ───────────────────────────── */}
								<FormSection title="Financial">
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
										<Field label="Purchase Date">
											<input
												type="date"
												className={inputCls}
												value={purchaseDate}
												onChange={(e) => setPurchaseDate(e.target.value)}
											/>
										</Field>

										<Field label="Purchase Price">
											<input
												type="text"
												inputMode="numeric"
												className={inputCls}
												placeholder="e.g. 50,000,000"
												value={purchasePrice}
												onChange={(e) => {
													const raw = e.target.value.replace(/[^0-9.]/g, "");
													const parts = raw.split(".");
													parts[0] = parts[0].replace(
														/\B(?=(\d{3})+(?!\d))/g,
														",",
													);
													setPurchasePrice(parts.join("."));
												}}
											/>
										</Field>

										<Field label="Current Value">
											<input
												type="text"
												inputMode="numeric"
												className={inputCls}
												placeholder="e.g. 65,000,000"
												value={currentValue}
												onChange={(e) => {
													const raw = e.target.value.replace(/[^0-9.]/g, "");
													const parts = raw.split(".");
													parts[0] = parts[0].replace(
														/\B(?=(\d{3})+(?!\d))/g,
														",",
													);
													setCurrentValue(parts.join("."));
												}}
											/>
										</Field>

										<Field
											label="Listing Price"
											hint="Asking price when listed for sale or rent"
										>
											<input
												type="text"
												inputMode="numeric"
												className={inputCls}
												placeholder="e.g. 70,000,000"
												value={listingPrice}
												onChange={(e) => {
													const raw = e.target.value.replace(/[^0-9.]/g, "");
													const parts = raw.split(".");
													parts[0] = parts[0].replace(
														/\B(?=(\d{3})+(?!\d))/g,
														",",
													);
													setListingPrice(parts.join("."));
												}}
											/>
										</Field>
									</div>
								</FormSection>

								{/* ── Transaction Details ─────────────────── */}
								<FormSection title="Transaction Details">
									<div className="grid grid-cols-1 gap-4">
										<Field label="Purchased From">
											<input
												className={inputCls}
												placeholder="Seller or previous owner name"
												value={boughtFrom}
												onChange={(e) => setBoughtFrom(e.target.value)}
											/>
										</Field>

										<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
											<Field
												label="Sold / Transacted Price"
												hint="What it actually sold or leased for — the true market value"
											>
												<input
													type="text"
													inputMode="numeric"
													className={inputCls}
													placeholder="e.g. 68,500,000"
													value={soldPrice}
													onChange={(e) => {
														const raw = e.target.value.replace(/[^0-9.]/g, "");
														const parts = raw.split(".");
														parts[0] = parts[0].replace(
															/\B(?=(\d{3})+(?!\d))/g,
															",",
														);
														setSoldPrice(parts.join("."));
													}}
												/>
											</Field>

											<Field label="Sale / Transaction Date">
												<input
													type="date"
													className={inputCls}
													value={soldDate}
													onChange={(e) => setSoldDate(e.target.value)}
												/>
											</Field>
										</div>

										<Field label="Witnesses">
											<WitnessTagInput
												value={witnesses}
												onChange={setWitnesses}
											/>
										</Field>

										<Field label="Signatories">
											<WitnessTagInput
												value={signatures}
												onChange={setSignatures}
												placeholder="Type signatory name, press Enter"
											/>
										</Field>
									</div>
								</FormSection>

								{/* ── Owner ───────────────────────────────── */}
								<FormSection title="Owner Information">
									{/* Selector — only in create mode when authenticated */}
									{!isEdit && user && (
										<div className="mb-4">
											<Field label="Who owns this property?">
												<select
													className={selectCls}
													value={ownerMode}
													onChange={(e) =>
														setOwnerMode(e.target.value as OwnerMode)
													}
												>
													<option value="portfolio_owner">
														{user.id === activePortfolio?.createdBy
															? `Me — ${user.displayName || user.name} (Portfolio Owner)`
															: portfolioOwnerUser
																? `Portfolio Owner — ${portfolioOwnerUser.displayName || portfolioOwnerUser.name}`
																: "Portfolio Owner"}
													</option>
													{user.id !== activePortfolio?.createdBy && (
														<option value="self">
															Myself — {user.displayName || user.name}
														</option>
													)}
													<option value="custom">Other / Custom</option>
												</select>
											</Field>
											{/* Read-only resolved owner preview */}
											{ownerMode !== "custom" &&
												(() => {
													const isTeamMember =
														user.id !== activePortfolio?.createdBy;
													const preview: OwnerUserInfo | null =
														ownerMode === "portfolio_owner" && isTeamMember
															? portfolioOwnerUser
															: user;
													if (!preview) return null;
													return (
														<div className="mt-3 flex items-center gap-3 rounded-md border border-border bg-surface-container px-3 py-2.5">
															{preview.avatar ? (
																<img
																	src={preview.avatar}
																	alt={preview.displayName}
																	className="w-7 h-7 rounded-full object-cover shrink-0"
																/>
															) : (
																<div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
																	{(preview.displayName || preview.name)
																		.charAt(0)
																		.toUpperCase()}
																</div>
															)}
															<div className="min-w-0">
																<p className="text-sm font-medium text-on-surface truncate">
																	{preview.displayName || preview.name}
																</p>
																<p className="text-xs text-outline truncate">
																	{preview.email}
																</p>
															</div>
														</div>
													);
												})()}
										</div>
									)}
									{/* Manual fields — shown in custom mode, edit mode, or when unauthenticated */}
									{(ownerMode === "custom" || isEdit || !user) && (
										<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
											<Field label="Full Name">
												<input
													className={inputCls}
													placeholder="Property owner name"
													value={ownerName}
													onChange={(e) => setOwnerName(e.target.value)}
												/>
											</Field>

											<Field label="Email">
												<input
													type="email"
													className={inputCls}
													placeholder="owner@email.com"
													value={ownerEmail}
													onChange={(e) => setOwnerEmail(e.target.value)}
												/>
											</Field>

											<Field label="Phone">
												<input
													type="tel"
													className={inputCls}
													placeholder="+1 ..."
													value={ownerPhone}
													onChange={(e) => setOwnerPhone(e.target.value)}
												/>
											</Field>

											<Field label="Owner Type">
												<select
													className={selectCls}
													value={ownerType}
													onChange={(e) =>
														setOwnerType(
															e.target.value as
																| "individual"
																| "company"
																| "trust",
														)
													}
												>
													{OWNER_TYPES.map((t) => (
														<option key={t.value} value={t.value}>
															{t.label}
														</option>
													))}
												</select>
											</Field>
										</div>
									)}
								</FormSection>
							</MasonryGrid>
						</div>

						{/* Sidebar — media + documents tabs */}
						{(uploadedFiles.length > 0 ||
							existingDocs.length > 0 ||
							uploadedMedia.length > 0 ||
							existingMedia.length > 0) &&
							sidebarOpen && (
								<DocumentSidebar
									files={uploadedFiles}
									mediaFiles={uploadedMedia}
									existingDocs={existingDocs}
									existingMedia={existingMedia}
									propertyId={initialProperty?.id}
									onRemoveFile={handleRemoveFile}
									onRemoveMediaFile={handleRemoveMediaFile}
									onRemoveExistingDoc={(docId) => {
										setExistingDocs((prev) =>
											prev.filter((d) => d.id !== docId),
										);
										setRemovedDocIds((prev) => [...prev, docId]);
									}}
									onRemoveExistingMedia={(url) => {
										setExistingMedia((prev) =>
											prev.filter((m) => m.url !== url),
										);
										setRemovedMediaUrls((prev) => [...prev, url]);
									}}
									onClose={() => setSidebarOpen(false)}
									onExtract={handleExtractFromFile}
									extracting={extracting}
								/>
							)}
					</div>

					{/* ── Error ───────────────────────────────── */}
					{error && (
						<div className="mt-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 font-body">
							{error}
						</div>
					)}
				</div>

				{/* ── Sticky Actions Bar ─────────────────── */}
				<div className="sticky bottom-0 left-0 right-0 py-4 -mx-4 sm:-mx-8 px-4 sm:px-8 flex items-center gap-3 justify-center sm:justify-end border-t border-border bg-background">
					<Link
						href="/portfolio/properties"
						className="px-5 py-2.5 rounded-md border border-border bg-card text-sm font-medium text-on-surface-variant hover:bg-surface-container-high transition-colors font-label"
					>
						Cancel
					</Link>

					<button
						type="submit"
						disabled={submitting}
						className="signature-gradient text-white font-headline font-bold text-xs uppercase tracking-widest px-6 py-3 rounded-md shadow-lg active:scale-95 transition-transform disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2"
					>
						{submitting ? (
							<Loader2 className="w-4 h-4 animate-spin" />
						) : (
							<Save className="w-4 h-4" />
						)}
						{submitting ? "Saving…" : "Save"}
					</button>
				</div>
			</form>

			{/* Map location picker modal */}
			{mapPickerOpen && (
				<LocationPickerComponent
					initialLat={lat ? parseFloat(lat) : undefined}
					initialLng={lng ? parseFloat(lng) : undefined}
					initialQuery={[address, city, propertyState, country]
						.filter(Boolean)
						.join(", ")}
					onConfirm={(pickedLat, pickedLng, address) => {
						setLat(String(pickedLat));
						setLng(String(pickedLng));
						if (address) {
							if (address.state) setPropertyState(address.state);
							if (address.city) setCity(address.city);
							if (address.country) setCountry(address.country);
							if (address.street) setAddress(address.street);
						}
						setMapPickerOpen(false);
					}}
					onClose={() => setMapPickerOpen(false)}
				/>
			)}
		</div>
	);
}
