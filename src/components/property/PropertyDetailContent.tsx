"use client";

import { DocumentType, Property, PropertyStatus } from "@/types/property";
import {
	Calendar,
	Check,
	Download,
	Edit3,
	FileText,
	MapPin,
	Pencil,
	Plus,
	Trash2,
	TrendingUp,
	Upload,
	User,
	Users,
	X,
} from "lucide-react";
import { useRef, useState } from "react";

const API_BASE = "/api";

export function formatCurrency(amount: number): string {
	return new Intl.NumberFormat("en-NG", {
		style: "currency",
		currency: "NGN",
		minimumFractionDigits: 0,
	}).format(amount);
}

export function formatDate(date: Date | string | undefined): string {
	if (!date) return "—";
	return new Date(date).toLocaleDateString("en-NG", {
		year: "numeric",
		month: "long",
		day: "numeric",
	});
}

export function getStatusColor(status: PropertyStatus): string {
	switch (status) {
		case PropertyStatus.OWNED:
			return "bg-green-100 text-green-700 border-green-200";
		case PropertyStatus.FOR_SALE:
			return "bg-blue-100 text-blue-700 border-blue-200";
		case PropertyStatus.DEVELOPMENT:
			return "bg-yellow-100 text-yellow-700 border-yellow-200";
		case PropertyStatus.UNDER_CONTRACT:
			return "bg-orange-100 text-orange-700 border-orange-200";
		case PropertyStatus.RENTED:
			return "bg-purple-100 text-purple-700 border-purple-200";
		default:
			return "bg-gray-100 text-gray-700 border-gray-200";
	}
}

export const DOCUMENT_CATEGORIES: { type: DocumentType; label: string }[] = [
	{ type: DocumentType.CONTRACT_OF_SALE, label: "Contract of Sale" },
	{
		type: DocumentType.CERTIFICATE_OF_OCCUPANCY,
		label: "Certificate of Occupancy",
	},
	{ type: DocumentType.SURVEY, label: "Survey Documents" },
	{ type: DocumentType.DEED, label: "Deed" },
	{ type: DocumentType.TITLE, label: "Title Documents" },
	{ type: DocumentType.APPRAISAL, label: "Appraisal" },
	{ type: DocumentType.OTHER, label: "Other Documents" },
];

// ----- Editable inline text -----
export function EditableInline({
	value,
	placeholder,
	onSave,
}: {
	value: string;
	placeholder: string;
	onSave: (val: string) => void;
}) {
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState(value);

	if (editing) {
		return (
			<div className="flex gap-2">
				<input
					autoFocus
					type="text"
					value={draft}
					onChange={(e) => setDraft(e.target.value)}
					placeholder={placeholder}
					className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:outline-none"
					onKeyDown={(e) => {
						if (e.key === "Enter") {
							onSave(draft);
							setEditing(false);
						}
						if (e.key === "Escape") {
							setDraft(value);
							setEditing(false);
						}
					}}
				/>
				<button
					onClick={() => {
						onSave(draft);
						setEditing(false);
					}}
					className="flex items-center gap-1 px-3 py-1.5 bg-gray-900 text-white rounded-lg text-sm"
				>
					<Check className="w-3.5 h-3.5" />
				</button>
				<button
					onClick={() => {
						setDraft(value);
						setEditing(false);
					}}
					className="p-1.5 border border-gray-300 rounded-lg hover:bg-gray-50"
				>
					<X className="w-3.5 h-3.5 text-gray-500" />
				</button>
			</div>
		);
	}

	return (
		<button
			onClick={() => {
				setDraft(value);
				setEditing(true);
			}}
			className="text-left text-sm text-gray-800 hover:text-black group flex items-center gap-2"
		>
			<span className={value ? "" : "text-gray-400 italic"}>
				{value || placeholder}
			</span>
			<Pencil className="w-3 h-3 text-gray-300 group-hover:text-gray-500 transition-colors" />
		</button>
	);
}

// ----- Editable tag list -----
export function EditableTagList({
	label,
	icon: Icon,
	items,
	placeholder,
	onSave,
}: {
	label: string;
	icon: React.ElementType;
	items: string[];
	placeholder: string;
	onSave: (items: string[]) => void;
}) {
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState<string[]>(items);
	const [input, setInput] = useState("");

	function addItem() {
		const trimmed = input.trim();
		if (trimmed && !draft.includes(trimmed)) setDraft([...draft, trimmed]);
		setInput("");
	}

	return (
		<div>
			<div className="flex items-center justify-between mb-2">
				<div className="flex items-center gap-2 text-sm text-gray-500">
					<Icon className="w-4 h-4" />
					<span className="font-medium">{label}</span>
				</div>
				{!editing && (
					<button
						onClick={() => {
							setDraft(items);
							setEditing(true);
						}}
						className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"
					>
						<Pencil className="w-3.5 h-3.5" />
					</button>
				)}
			</div>

			{editing ? (
				<div>
					<div className="flex flex-wrap gap-1.5 mb-2">
						{draft.map((item, i) => (
							<span
								key={i}
								className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-sm"
							>
								{item}
								<button
									onClick={() => setDraft(draft.filter((_, j) => j !== i))}
									className="hover:text-red-500"
								>
									<X className="w-3 h-3" />
								</button>
							</span>
						))}
					</div>
					<div className="flex gap-2">
						<input
							type="text"
							value={input}
							onChange={(e) => setInput(e.target.value)}
							onKeyDown={(e) => e.key === "Enter" && addItem()}
							placeholder={placeholder}
							className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:outline-none"
						/>
						<button
							onClick={addItem}
							className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"
						>
							Add
						</button>
					</div>
					<div className="flex gap-2 mt-2">
						<button
							onClick={() => {
								onSave(draft);
								setEditing(false);
							}}
							className="flex items-center gap-1 px-3 py-1.5 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-700"
						>
							<Check className="w-3.5 h-3.5" /> Save
						</button>
						<button
							onClick={() => {
								setDraft(items);
								setInput("");
								setEditing(false);
							}}
							className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
						>
							Cancel
						</button>
					</div>
				</div>
			) : (
				<div className="flex flex-wrap gap-1.5 min-h-7">
					{items.length === 0 ? (
						<span className="text-sm text-gray-400 italic">None recorded</span>
					) : (
						items.map((item, i) => (
							<span
								key={i}
								className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-sm"
							>
								{item}
							</span>
						))
					)}
				</div>
			)}
		</div>
	);
}

// ----- Document section -----
export function DocumentSection({
	category,
	documents,
	propertyId,
	onUploaded,
	onDeleted,
}: {
	category: { type: DocumentType; label: string };
	documents: Property["documents"];
	propertyId: string;
	onUploaded: (doc: Property["documents"][0]) => void;
	onDeleted: (docId: string) => void;
}) {
	const [uploading, setUploading] = useState(false);
	const [uploadError, setUploadError] = useState<string | null>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	const categoryDocs = documents.filter((d) => d.type === category.type);

	async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (!file) return;
		setUploading(true);
		setUploadError(null);
		try {
			const formData = new FormData();
			formData.append("file", file);
			formData.append("type", category.type);
			formData.append("name", file.name);
			const res = await fetch(
				`${API_BASE}/properties/${propertyId}/documents`,
				{
					method: "POST",
					body: formData,
				},
			);
			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.error ?? "Upload failed");
			}
			const { document } = await res.json();
			onUploaded(document);
		} catch (err) {
			setUploadError(err instanceof Error ? err.message : "Upload failed");
		} finally {
			setUploading(false);
			if (inputRef.current) inputRef.current.value = "";
		}
	}

	async function handleDelete(docId: string) {
		try {
			const res = await fetch(
				`${API_BASE}/properties/${propertyId}/documents?docId=${docId}`,
				{ method: "DELETE" },
			);
			if (res.ok) onDeleted(docId);
		} catch {
			/* silent */
		}
	}

	return (
		<div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
			<div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-200">
				<div className="flex items-center gap-2">
					<FileText className="w-4 h-4 text-gray-500" />
					<span className="text-sm font-semibold text-gray-800">
						{category.label}
					</span>
					{categoryDocs.length > 0 && (
						<span className="text-xs text-gray-500 bg-gray-200 rounded-full px-2 py-0.5">
							{categoryDocs.length}
						</span>
					)}
				</div>
				<label
					className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm cursor-pointer transition-colors ${uploading ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-gray-900 text-white hover:bg-gray-700"}`}
				>
					{uploading ? (
						<>
							<Upload className="w-3.5 h-3.5 animate-pulse" />
							Uploading...
						</>
					) : (
						<>
							<Plus className="w-3.5 h-3.5" />
							Upload
						</>
					)}
					<input
						ref={inputRef}
						type="file"
						className="hidden"
						disabled={uploading}
						onChange={handleFileChange}
					/>
				</label>
			</div>
			<div className="divide-y divide-gray-100">
				{categoryDocs.length === 0 ? (
					<div className="px-5 py-4 text-sm text-gray-400 italic">
						No {category.label.toLowerCase()} uploaded yet
					</div>
				) : (
					categoryDocs.map((doc) => (
						<div
							key={doc.id}
							className="flex items-center justify-between px-5 py-3"
						>
							<div className="flex items-center gap-3 min-w-0">
								<FileText className="w-4 h-4 text-gray-400 shrink-0" />
								<div className="min-w-0">
									<div className="text-sm font-medium text-gray-800 truncate">
										{doc.name}
									</div>
									<div className="text-xs text-gray-500">
										{new Date(doc.uploadDate).toLocaleDateString("en-NG")}
										{doc.size ? ` · ${(doc.size / 1024).toFixed(1)} KB` : ""}
									</div>
								</div>
							</div>
							<div className="flex items-center gap-1 ml-4 shrink-0">
								<a
									href={doc.url}
									target="_blank"
									rel="noopener noreferrer"
									className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700"
									title="Download"
								>
									<Download className="w-4 h-4" />
								</a>
								<button
									onClick={() => handleDelete(doc.id)}
									className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500"
									title="Delete"
								>
									<Trash2 className="w-4 h-4" />
								</button>
							</div>
						</div>
					))
				)}
			</div>
			{uploadError && (
				<div className="px-5 py-2 bg-red-50 text-red-600 text-sm border-t border-red-100">
					{uploadError}
				</div>
			)}
		</div>
	);
}

// ----- Worth editor -----
export function WorthEditor({
	currentValue,
	purchasePrice,
	onSave,
}: {
	currentValue?: number;
	purchasePrice: number;
	onSave: (value: number) => void;
}) {
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState(String(currentValue ?? ""));
	const [saving, setSaving] = useState(false);

	const worthChange =
		currentValue != null
			? ((currentValue - purchasePrice) / purchasePrice) * 100
			: null;

	async function save() {
		const val = parseFloat(draft.replace(/[^0-9.]/g, ""));
		if (isNaN(val) || val < 0) return;
		setSaving(true);
		await onSave(val);
		setSaving(false);
		setEditing(false);
	}

	return (
		<div>
			<div className="flex items-center justify-between mb-1">
				<div className="flex items-center gap-2 text-sm text-gray-500">
					<TrendingUp className="w-4 h-4" />
					<span className="font-medium">Current Worth</span>
				</div>
				{!editing && (
					<button
						onClick={() => {
							setDraft(String(currentValue ?? ""));
							setEditing(true);
						}}
						className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"
					>
						<Pencil className="w-3.5 h-3.5" />
					</button>
				)}
			</div>
			{editing ? (
				<div className="flex gap-2 items-center">
					<input
						type="number"
						value={draft}
						onChange={(e) => setDraft(e.target.value)}
						placeholder="Enter amount in NGN"
						className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:outline-none"
					/>
					<button
						onClick={save}
						disabled={saving}
						className="flex items-center gap-1 px-3 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-700 disabled:opacity-50"
					>
						<Check className="w-3.5 h-3.5" />
					</button>
					<button
						onClick={() => setEditing(false)}
						className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
					>
						<X className="w-3.5 h-3.5 text-gray-500" />
					</button>
				</div>
			) : (
				<div>
					<div className="text-xl font-bold text-gray-900">
						{currentValue != null ? (
							formatCurrency(currentValue)
						) : (
							<span className="text-gray-400 text-base font-normal italic">
								Not set — click edit to add
							</span>
						)}
					</div>
					{worthChange !== null && (
						<div
							className={`text-sm font-medium mt-0.5 ${worthChange >= 0 ? "text-green-600" : "text-red-600"}`}
						>
							{worthChange >= 0 ? "▲" : "▼"} {Math.abs(worthChange).toFixed(1)}%
							vs purchase price
						</div>
					)}
				</div>
			)}
		</div>
	);
}

function InfoItem({ label, value }: { label: string; value: string }) {
	return (
		<div>
			<div className="text-xs text-gray-500 mb-0.5">{label}</div>
			<div className="text-sm font-medium text-gray-800">{value}</div>
		</div>
	);
}

// ===========================
// Main shared content body
// ===========================
export interface PropertyDetailContentProps {
	property: Property;
	onPatch: (updates: Partial<Property>) => void;
	onDocUploaded: (doc: Property["documents"][0]) => void;
	onDocDeleted: (docId: string) => void;
	/** Layout variant: "two-col" (default, for full page) or "stack" (for drawer) */
	layout?: "two-col" | "stack";
}

export default function PropertyDetailContent({
	property,
	onPatch,
	onDocUploaded,
	onDocDeleted,
	layout = "two-col",
}: PropertyDetailContentProps) {
	const summaryCol = (
		<div className="space-y-4">
			{/* Property summary */}
			<div className="bg-white border border-gray-200 rounded-xl p-5 space-y-5">
				<h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
					Property Summary
				</h2>

				<div>
					<div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
						<MapPin className="w-4 h-4" />
						<span className="font-medium">Address</span>
					</div>
					<div className="text-sm text-gray-800">{property.address}</div>
				</div>

				<div className="border-t border-gray-100" />

				<div>
					<div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
						<User className="w-4 h-4" />
						<span className="font-medium">Bought From</span>
					</div>
					<EditableInline
						value={property.boughtFrom ?? ""}
						placeholder="Enter seller name"
						onSave={(val) => onPatch({ boughtFrom: val })}
					/>
				</div>

				<div className="border-t border-gray-100" />

				<div>
					<div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
						<Calendar className="w-4 h-4" />
						<span className="font-medium">Purchase Date</span>
					</div>
					<div className="text-sm text-gray-800 font-medium">
						{formatDate(property.purchaseDate)}
					</div>
				</div>

				<div className="border-t border-gray-100" />

				<div>
					<div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
						<TrendingUp className="w-4 h-4" />
						<span className="font-medium">Purchase Price</span>
					</div>
					<div className="text-xl font-bold text-gray-900">
						{formatCurrency(property.purchasePrice)}
					</div>
				</div>

				<div className="border-t border-gray-100" />

				<WorthEditor
					currentValue={property.currentValue}
					purchasePrice={property.purchasePrice}
					onSave={(val) => onPatch({ currentValue: val })}
				/>

				<div className="border-t border-gray-100" />

				<div>
					<div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
						<MapPin className="w-4 h-4" />
						<span className="font-medium">Plot Area</span>
					</div>
					<div className="text-sm text-gray-800 font-medium">
						{property.area.toLocaleString()} sqm
					</div>
				</div>
			</div>

			{/* Transaction details */}
			<div className="bg-white border border-gray-200 rounded-xl p-5 space-y-5">
				<h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
					Transaction Details
				</h2>
				<EditableTagList
					label="Witnesses"
					icon={Users}
					items={property.witnesses ?? []}
					placeholder="Add witness name, press Enter"
					onSave={(items) => onPatch({ witnesses: items })}
				/>
				<div className="border-t border-gray-100" />
				<EditableTagList
					label="Signatories"
					icon={Edit3}
					items={property.signatures ?? []}
					placeholder="Add signatory name, press Enter"
					onSave={(items) => onPatch({ signatures: items })}
				/>
			</div>

			{/* Survey info */}
			{property.surveyData && (
				<div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
					<h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
						Survey Information
					</h2>
					<div className="grid grid-cols-2 gap-3">
						{property.surveyData.plotNumber && (
							<InfoItem
								label="Plot Number"
								value={property.surveyData.plotNumber}
							/>
						)}
						{property.surveyData.registrationNumber && (
							<InfoItem
								label="Reg. Number"
								value={property.surveyData.registrationNumber}
							/>
						)}
						{property.surveyData.surveyor && (
							<InfoItem label="Surveyor" value={property.surveyData.surveyor} />
						)}
						{property.surveyData.surveyDate && (
							<InfoItem
								label="Survey Date"
								value={formatDate(property.surveyData.surveyDate)}
							/>
						)}
						<InfoItem
							label="Measured Area"
							value={`${property.surveyData.area?.toLocaleString()} sqm`}
						/>
						<InfoItem
							label="Boundary Points"
							value={String(property.surveyData.coordinates?.length ?? 0)}
						/>
					</div>
				</div>
			)}
		</div>
	);

	const docsCol = (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
					Documents
				</h2>
				<span className="text-xs text-gray-500">
					{property.documents?.length ?? 0} file
					{(property.documents?.length ?? 0) !== 1 ? "s" : ""} total
				</span>
			</div>
			{DOCUMENT_CATEGORIES.map((category) => (
				<DocumentSection
					key={category.type}
					category={category}
					documents={property.documents ?? []}
					propertyId={property.id}
					onUploaded={onDocUploaded}
					onDeleted={onDocDeleted}
				/>
			))}
		</div>
	);

	if (layout === "stack") {
		return (
			<div className="space-y-6">
				{summaryCol}
				{docsCol}
			</div>
		);
	}

	return (
		<div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
			<div className="lg:col-span-2">{summaryCol}</div>
			<div className="lg:col-span-3">{docsCol}</div>
		</div>
	);
}
