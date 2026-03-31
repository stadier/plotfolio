"use client";

import { useAuth } from "@/components/AuthContext";
import ChipInput from "@/components/ui/ChipInput";
import { extractFieldsFromDocument } from "@/lib/documentExtractor";
import {
	DocumentType,
	PropertyCondition,
	PropertyStatus,
	PropertyType,
} from "@/types/property";
import {
	Building2,
	DollarSign,
	Loader2,
	MapPin,
	Save,
	Upload,
	User,
	Users,
} from "lucide-react";
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
	[PropertyStatus.RENTED]: "Rented",
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

/* ── section card wrapper ────────────────────────────── */

function FormSection({
	icon: Icon,
	title,
	children,
}: {
	icon: React.ComponentType<{ className?: string }>;
	title: string;
	children: React.ReactNode;
}) {
	return (
		<div className="bg-white border border-slate-200 rounded-2xl p-6 min-w-[420px] flex-1">
			<div className="flex items-center gap-2.5 mb-5">
				<Icon className="w-5 h-5 text-primary" />
				<h2 className="font-headline text-sm font-bold text-primary uppercase tracking-wider">
					{title}
				</h2>
			</div>
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
			<span className="text-xs font-medium text-on-surface-variant uppercase tracking-wider font-label">
				{label}
				{required && <span className="text-error ml-0.5">*</span>}
			</span>
			{children}
		</label>
	);
}

const inputCls =
	"w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-on-surface placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors font-body";

const selectCls = `${inputCls} appearance-none bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2374777f' d='M2.5 4.5L6 8l3.5-3.5'/%3E%3C/svg%3E")] bg-[length:12px] bg-[right_12px_center] bg-no-repeat pr-8`;

/* ── main form ───────────────────────────────────────── */

interface CreatePropertyFormProps {
	initialName?: string;
}

export default function CreatePropertyForm({
	initialName,
}: CreatePropertyFormProps) {
	const router = useRouter();
	const { user } = useAuth();

	/* basic info */
	const [name, setName] = useState(initialName || "");
	useEffect(() => {
		if (initialName) setName(initialName);
	}, [initialName]);
	const [address, setAddress] = useState("");
	const [description, setDescription] = useState("");

	/* property details */
	const [propertyType, setPropertyType] = useState<PropertyType>(
		PropertyType.RESIDENTIAL,
	);
	const [area, setArea] = useState("");
	const [zoning, setZoning] = useState("");
	const [taxId, setTaxId] = useState("");
	const [status, setStatus] = useState<PropertyStatus>(PropertyStatus.OWNED);
	const [conditions, setConditions] = useState<string[]>([]);
	const [quantity, setQuantity] = useState("1");

	/* location */
	const [lat, setLat] = useState("");
	const [lng, setLng] = useState("");
	const [propertyState, setPropertyState] = useState("");
	const [city, setCity] = useState("");
	const [country, setCountry] = useState("");

	/* financial */
	const [purchaseDate, setPurchaseDate] = useState("");
	const [purchasePrice, setPurchasePrice] = useState("");
	const [currentValue, setCurrentValue] = useState("");

	/* transaction */
	const [boughtFrom, setBoughtFrom] = useState("");
	const [witnesses, setWitnesses] = useState("");
	const [signatures, setSignatures] = useState("");

	/* owner */
	const [ownerName, setOwnerName] = useState("");
	const [ownerEmail, setOwnerEmail] = useState("");
	const [ownerPhone, setOwnerPhone] = useState("");
	const [ownerType, setOwnerType] = useState<
		"individual" | "company" | "trust"
	>("individual");

	/* map picker */
	const [mapPickerOpen, setMapPickerOpen] = useState(false);

	/* submission state */
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	/* document upload state */
	const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
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
			if (fields.purchasePrice) setPurchasePrice(fields.purchasePrice ?? "");
			if (fields.currentValue) setCurrentValue(fields.currentValue ?? "");
			if (fields.boughtFrom) setBoughtFrom(fields.boughtFrom ?? "");
			if (fields.witnesses) setWitnesses(fields.witnesses ?? "");
			if (fields.signatures) setSignatures(fields.signatures ?? "");
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
			witnesses,
			signatures,
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
			const id = crypto.randomUUID();

			const property = {
				id,
				name: name.trim() || "Untitled Property",
				address: address.trim() || undefined,
				description: description.trim() || undefined,
				coordinates:
					lat && lng
						? { lat: parseFloat(lat), lng: parseFloat(lng) }
						: undefined,
				area: area ? parseFloat(area) : undefined,
				propertyType,
				purchaseDate: purchaseDate ? new Date(purchaseDate) : undefined,
				purchasePrice: purchasePrice ? parseFloat(purchasePrice) : undefined,
				currentValue: currentValue ? parseFloat(currentValue) : undefined,
				status,
				conditions: conditions.length > 0 ? conditions : undefined,
				quantity: quantity ? Math.max(1, parseInt(quantity, 10)) : 1,
				zoning: zoning.trim() || undefined,
				taxId: taxId.trim() || undefined,
				state: propertyState.trim() || undefined,
				city: city.trim() || undefined,
				country: country.trim() || undefined,
				boughtFrom: boughtFrom.trim() || undefined,
				witnesses: witnesses.trim()
					? witnesses.split(",").map((w) => w.trim())
					: undefined,
				signatures: signatures.trim()
					? signatures.split(",").map((s) => s.trim())
					: undefined,
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
				documents: [],
			};

			/* PropertyAPI.createProperty expects Omit<Property,"id"> but the server
			   needs the id field — send the full body via the same endpoint. */
			const res = await fetch("/api/properties", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(property),
			});

			if (!res.ok) throw new Error("Failed to create property");

			// Upload documents to the property
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

			router.push("/portfolio/properties");
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
		<div className="flex h-screen">
			<form
				onSubmit={handleSubmit}
				className="flex flex-col justify-between flex-1 min-w-0"
			>
				<div>
					{/* ── Document Upload Banner ──────────────── */}
					<div className="mb-6">
						<label
							htmlFor="doc-upload"
							className="flex flex-col sm:flex-row items-center gap-4 p-5 rounded-2xl border-2 border-dashed cursor-pointer transition-colors border-slate-300 bg-white hover:border-primary/40 hover:bg-slate-50"
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

							<div className="shrink-0 w-11 h-11 rounded-xl signature-gradient flex items-center justify-center">
								<Upload className="w-5 h-5 text-white" />
							</div>

							<div className="text-center sm:text-left flex-1">
								<p className="font-headline text-sm font-bold text-primary">
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

					<div className="flex flex-wrap gap-4">
						{/* ── Basic Info ──────────────────────────── */}
						<FormSection icon={Building2} title="Basic Information">
							<div className="grid grid-cols-1 gap-4">
								<Field label="Property Name">
									<input
										className={inputCls}
										placeholder="e.g. Riverside Executive Property"
										value={name}
										onChange={(e) => setName(e.target.value)}
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
						<FormSection icon={Building2} title="Property Details">
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
									<p className="text-[11px] text-slate-400 mt-1 font-body">
										How many identical units (plots, buildings) at this
										location?
									</p>
								</Field>{" "}
							</div>

							{/* Condition Tags */}
							<div className="mt-4">
								<span className="text-xs font-medium text-on-surface-variant uppercase tracking-wider font-label">
									Property Condition
								</span>
								<p className="text-[11px] text-slate-400 mt-0.5 mb-2 font-body">
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
						<FormSection icon={MapPin} title="Location">
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

							<button
								type="button"
								onClick={() => setMapPickerOpen(true)}
								className="mt-3 w-full flex items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-2.5 text-xs font-medium text-primary hover:border-primary/40 hover:bg-slate-100 transition-colors font-label"
							>
								<MapPin className="w-3.5 h-3.5" />
								Pick from map
							</button>

							<p className="mt-2 text-xs text-slate-400 font-body">
								Coordinates in decimal degrees.
							</p>

							<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
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

								<Field label="Country">
									<input
										className={inputCls}
										placeholder="e.g. United States"
										value={country}
										onChange={(e) => setCountry(e.target.value)}
									/>
								</Field>
							</div>
						</FormSection>

						{/* ── Financial ───────────────────────────── */}
						<FormSection icon={DollarSign} title="Financial">
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
										type="number"
										className={inputCls}
										placeholder="e.g. 50000000"
										value={purchasePrice}
										onChange={(e) => setPurchasePrice(e.target.value)}
										min={0}
										step="any"
									/>
								</Field>

								<Field label="Current Value">
									<input
										type="number"
										className={inputCls}
										placeholder="e.g. 65000000"
										value={currentValue}
										onChange={(e) => setCurrentValue(e.target.value)}
										min={0}
										step="any"
									/>
								</Field>
							</div>
						</FormSection>

						{/* ── Transaction Details ─────────────────── */}
						<FormSection icon={Users} title="Transaction Details">
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
									<input
										className={inputCls}
										placeholder="Comma-separated, e.g. John Doe, Jane Smith"
										value={witnesses}
										onChange={(e) => setWitnesses(e.target.value)}
									/>
								</Field>

								<Field label="Signatories">
									<input
										className={inputCls}
										placeholder="Comma-separated, e.g. Buyer Name, Seller Name"
										value={signatures}
										onChange={(e) => setSignatures(e.target.value)}
									/>
								</Field>
							</div>
						</FormSection>

						{/* ── Owner ───────────────────────────────── */}
						<FormSection icon={User} title="Owner Information">
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
												e.target.value as "individual" | "company" | "trust",
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
					</div>

					{/* ── Error ───────────────────────────────── */}
					{error && (
						<div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 font-body">
							{error}
						</div>
					)}
				</div>

				{/* ── Sticky Actions Bar ─────────────────── */}
				<div className="sticky bottom-0 left-0 right-0 bg-slate-50/90 backdrop-blur-sm py-3 -mx-8 px-8 flex items-center gap-3 justify-center sm:justify-end">
					<Link
						href="/portfolio/properties"
						className="px-5 py-2.5 rounded-lg border border-slate-200 bg-white text-sm font-medium text-on-surface-variant hover:bg-slate-50 transition-colors font-label"
					>
						Cancel
					</Link>

					<button
						type="submit"
						disabled={submitting}
						className="signature-gradient text-white font-headline font-bold text-xs uppercase tracking-widest px-6 py-3 rounded-lg shadow-lg active:scale-95 transition-transform disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2"
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
					onConfirm={(pickedLat, pickedLng) => {
						setLat(String(pickedLat));
						setLng(String(pickedLng));
						setMapPickerOpen(false);
					}}
					onClose={() => setMapPickerOpen(false)}
				/>
			)}

			{/* Document sidebar — appears when files are uploaded */}
			{uploadedFiles.length > 0 && sidebarOpen && (
				<DocumentSidebar
					files={uploadedFiles}
					onRemoveFile={handleRemoveFile}
					onClose={() => setSidebarOpen(false)}
					onExtract={handleExtractFromFile}
					extracting={extracting}
				/>
			)}
		</div>
	);
}
