"use client";

import { useAuth } from "@/components/AuthContext";
import { usePortfolio } from "@/components/PortfolioContext";
import ChipInput from "@/components/ui/ChipInput";
import MasonryGrid from "@/components/ui/MasonryGrid";
import WitnessTagInput, {
	type WitnessEntry,
} from "@/components/ui/WitnessTagInput";
import { queryKeys } from "@/hooks/usePropertyQueries";
import { extractFieldsFromDocument } from "@/lib/documentExtractor";
import {
	DocumentType,
	Property,
	PropertyCondition,
	PropertyDocument,
	PropertyStatus,
	PropertyType,
} from "@/types/property";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, MapPin, Save, Upload } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import DocumentSidebar from "./DocumentSidebar";

function generatePropertyName(): string {
	const now = new Date();
	const month = now.toLocaleString("en-US", { month: "short" }).toUpperCase();
	const year = now.getFullYear().toString().slice(-2);
	const seq = Math.random().toString(36).slice(2, 6).toUpperCase();
	return `PLT-${month}${year}-${seq}`;
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
	[PropertyType.RESIDENTIAL]: "Residential",
	[PropertyType.COMMERCIAL]: "Commercial",
	[PropertyType.INDUSTRIAL]: "Industrial",
	[PropertyType.AGRICULTURAL]: "Agricultural",
	[PropertyType.VACANT_LAND]: "Vacant Land",
	[PropertyType.MIXED_USE]: "Mixed Use",
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
	children,
}: {
	label: string;
	required?: boolean;
	children: React.ReactNode;
}) {
	return (
		<label className="flex flex-col gap-1.5">
			<span className="text-xs font-medium text-on-surface-variant font-label">
				{label}
				{required && <span className="text-error ml-0.5">*</span>}
			</span>
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
		initialProperty?.propertyType || PropertyType.MIXED_USE,
	);
	const [area, setArea] = useState(
		initialProperty?.area ? String(initialProperty.area) : "",
	);
	const [zoning, setZoning] = useState(initialProperty?.zoning || "");
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
	const [currentValue, setCurrentValue] = useState(() => {
		if (!initialProperty?.currentValue) return "";
		const raw = String(initialProperty.currentValue);
		const parts = raw.split(".");
		parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
		return parts.join(".");
	});

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

	const handleDocumentUpload = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const files = e.target.files;
			if (!files || files.length === 0) return;

			setUploadedFiles((prev) => [...prev, ...Array.from(files)]);
			setSidebarOpen(true);

			// Reset so the same files can be re-selected
			if (fileInputRef.current) fileInputRef.current.value = "";
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
			if (fields.zoning) setZoning(fields.zoning ?? "");
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
			currentValue,
			boughtFrom,
			witnesses.length > 0 ? "yes" : "",
			signatures.length > 0 ? "yes" : "",
			ownerName,
			ownerEmail,
			ownerPhone,
			zoning,
			taxId,
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
				currentValue: currentValue
					? parseFloat(currentValue.replace(/,/g, ""))
					: undefined,
				status,
				conditions: conditions.length > 0 ? conditions : undefined,
				quantity: quantity ? Math.max(1, parseInt(quantity, 10)) : 1,
				zoning: zoning.trim() || undefined,
				taxId: taxId.trim() || undefined,
				state: propertyState.trim() || undefined,
				city: city.trim() || undefined,
				country: country.trim() || undefined,
				boughtFrom: boughtFrom.trim() || undefined,
				witnesses: witnesses.length > 0 ? witnesses : undefined,
				signatures: signatures.length > 0 ? signatures : undefined,
				owner: (() => {
					if (user) {
						return {
							id: user.id,
							name: user.name,
							username: user.username,
							displayName: user.displayName,
							email: user.email,
							avatar: user.avatar,
							phone: user.phone || ownerPhone.trim() || undefined,
							type: user.type,
						};
					}
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

	return (
		<div
			className={`flex flex-col h-screen ${isEdit ? "px-4 sm:px-8 py-6" : ""}`}
		>
			<form
				onSubmit={handleSubmit}
				className="flex flex-col justify-between flex-1 min-w-0"
			>
				<div>
					{/* ── Document Upload Banner ──────────────── */}
					<div className="mb-5">
						<label
							htmlFor="doc-upload"
							className="flex flex-col sm:flex-row items-center gap-4 p-5 rounded-xl border border-dashed cursor-pointer transition-colors border-border bg-card hover:border-primary/40"
						>
							<input
								ref={fileInputRef}
								id="doc-upload"
								type="file"
								accept="image/*,.pdf,.txt"
								multiple
								className="hidden"
								onChange={handleDocumentUpload}
							/>

							<div className="shrink-0 w-10 h-10 rounded-lg signature-gradient flex items-center justify-center">
								<Upload className="w-4.5 h-4.5 text-white" />
							</div>

							<div className="text-center sm:text-left flex-1">
								<p className="font-headline text-sm font-bold text-on-surface">
									Upload documents for this property
								</p>
								<p className="text-xs text-on-surface-variant mt-0.5 font-body">
									Survey plans, title deeds, contracts, permits — PDF, image, or
									text. Select multiple.
								</p>
							</div>

							<span className="shrink-0 flex items-center gap-1.5 text-xs font-medium text-primary font-label">
								<Upload className="w-3.5 h-3.5" />
								Upload
							</span>
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
											<input
												className={inputCls}
												placeholder="e.g. R-2 Residential"
												value={zoning}
												onChange={(e) => setZoning(e.target.value)}
											/>
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

								{/* ── Location ────────────────────────────── */}
								<FormSection title="Location">
									{/* Map preview + prompt bar */}
									<div className="rounded-md border border-border overflow-hidden max-w-md">
										<div
											className="relative w-full bg-surface-container cursor-pointer"
											style={{ height: 180 }}
											onClick={() => setMapPickerOpen(true)}
										>
											{lat && lng ? (
												<LocationPreviewMap
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
								</FormSection>
							</MasonryGrid>
						</div>

						{/* Document sidebar — inline next to masonry grid */}
						{(uploadedFiles.length > 0 || existingDocs.length > 0) &&
							sidebarOpen && (
								<DocumentSidebar
									files={uploadedFiles}
									existingDocs={existingDocs}
									propertyId={initialProperty?.id}
									onRemoveFile={handleRemoveFile}
									onRemoveExistingDoc={(docId) => {
										setExistingDocs((prev) =>
											prev.filter((d) => d.id !== docId),
										);
										setRemovedDocIds((prev) => [...prev, docId]);
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
				<MapLocationPicker
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
