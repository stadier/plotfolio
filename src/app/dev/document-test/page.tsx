"use client";

import { useAuth } from "@/components/AuthContext";
import { usePortfolio } from "@/components/PortfolioContext";
import { PropertyAPI } from "@/lib/api";
import { AIDocument } from "@/types/document";
import { PropertyDocument } from "@/types/property";
import { useEffect, useRef, useState } from "react";

interface UploadResult {
	document: {
		id: string;
		fileName: string;
		fileSize: number;
		mimeType: string;
		documentType: string;
		confidence: number;
		indexed: boolean;
		createdAt: string;
		fileUrl: string;
		ocrText: string;
		extractedData: Record<string, unknown>;
	};
	images: Array<{ imageUrl: string; pageNumber: number }>;
	chunksCreated: number;
	duplicate?: boolean;
	duplicateOf?: string;
}

interface PropertyImportDoc {
	key: string;
	propertyId: string;
	propertyName: string;
	doc: PropertyDocument;
}

const FIELD_LABELS: Record<string, string> = {
	ownerName: "Owner Name",
	plotSize: "Plot Size",
	coordinates: "Coordinates",
	surveyNumber: "Survey / Plot Number",
	location: "Location / Address",
	date: "Document Date",
	propertyType: "Property Type",
	zoning: "Zoning",
	area: "Area (sqm)",
	taxId: "Tax / Certificate ID",
	purchasePrice: "Purchase Price",
	currentValue: "Current Value",
	boughtFrom: "Bought From",
	witnesses: "Witnesses",
	signatures: "Signatories",
	ownerEmail: "Owner Email",
	ownerPhone: "Owner Phone",
	ownerType: "Owner Type",
	registrationNumber: "Registration Number",
	description: "Description",
};

function formatValue(value: unknown): string {
	if (Array.isArray(value)) return value.join(", ") || "—";
	if (value === null || value === undefined || value === "") return "—";
	return String(value);
}

function confidenceColor(c: number): string {
	if (c >= 0.8) return "text-green-600 dark:text-green-400";
	if (c >= 0.5) return "text-yellow-600 dark:text-yellow-400";
	return "text-red-500 dark:text-red-400";
}

export default function DocumentTestPage() {
	const { user } = useAuth();
	const { portfolios } = usePortfolio();
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [dragging, setDragging] = useState(false);
	const [uploading, setUploading] = useState(false);
	const [loadingExisting, setLoadingExisting] = useState(false);
	const [processingDocId, setProcessingDocId] = useState<string | null>(null);
	const [existingDocs, setExistingDocs] = useState<AIDocument[]>([]);
	const [result, setResult] = useState<UploadResult | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [ocrVisible, setOcrVisible] = useState(false);
	const [myProperties, setMyProperties] = useState<
		Array<{ id: string; name: string }>
	>([]);
	const [propertyDocsForImport, setPropertyDocsForImport] = useState<
		PropertyImportDoc[]
	>([]);
	const [selectedPropertyIds, setSelectedPropertyIds] = useState<Set<string>>(
		new Set(),
	);

	async function uploadFileToAi(
		file: File,
		propertyIdsForUpload: string[] = Array.from(selectedPropertyIds),
	): Promise<UploadResult | null> {
		if (!user) {
			setError("You must be logged in to test document extraction.");
			return null;
		}
		setError(null);
		setResult(null);
		setOcrVisible(false);
		setUploading(true);

		try {
			const form = new FormData();
			form.append("file", file);
			form.append("userId", user.id);
			if (propertyIdsForUpload.length > 0) {
				form.append("propertyIds", propertyIdsForUpload.join(","));
			}
			form.append("skipIndexing", "true");

			const res = await fetch("/api/documents/upload", {
				method: "POST",
				body: form,
			});

			const data = (await res.json()) as UploadResult & { error?: string };

			if (!res.ok) {
				setError(data.error ?? "Upload failed");
				return null;
			}

			setResult(data);
			void loadExistingDocs();
			return data;
		} catch (err) {
			setError(err instanceof Error ? err.message : "Upload failed");
			return null;
		} finally {
			setUploading(false);
		}
	}

	async function loadExistingDocs() {
		if (!user) return;
		setLoadingExisting(true);
		try {
			const [userDocs, ownedProps, portfolioPropertyLists] = await Promise.all([
				PropertyAPI.listDocuments({ userId: user.id }),
				PropertyAPI.getMyProperties(user.id),
				Promise.all(
					portfolios.map((portfolio) =>
						PropertyAPI.getMyProperties(user.id, portfolio.id, false),
					),
				),
			]);

			const allProperties = Array.from(
				new Map(
					[...ownedProps, ...portfolioPropertyLists.flat()].map((property) => [
						property.id,
						property,
					]),
				).values(),
			);

			setMyProperties(allProperties);
			const importDocs = allProperties.flatMap((property) =>
				(property.documents ?? []).map((doc) => ({
					key: `${property.id}:${doc.id}`,
					propertyId: property.id,
					propertyName: property.name,
					doc,
				})),
			);
			setPropertyDocsForImport(importDocs);
			console.log(
				`[Document Loader] User ${user.id} has ${ownedProps.length} owned properties`,
			);
			console.log(
				`[Document Loader] Portfolio-access properties: ${portfolioPropertyLists.flat().length}`,
			);
			console.log(`[Document Loader] User docs: ${userDocs.length}`);
			console.log(
				`[Document Loader] Property IDs:`,
				allProperties.map((p) => p.id),
			);

			const propertyDocLists = await Promise.all(
				allProperties.map(async (property) => {
					const docs = await PropertyAPI.listDocuments({
						propertyId: property.id,
					});
					console.log(
						`[Document Loader] Property ${property.id} has ${docs.length} docs`,
					);
					return docs;
				}),
			);

			const merged = [...userDocs, ...propertyDocLists.flat()];
			const deduped = Array.from(
				new Map(merged.map((d) => [d.id, d])).values(),
			).sort(
				(a, b) =>
					new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
			);

			console.log(
				`[Document Loader] Total docs after dedup: ${deduped.length}`,
			);
			console.log(
				`[Document Loader] Property-doc store count: ${importDocs.length}`,
			);
			setExistingDocs(deduped);
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			console.error("[Document Loader] Error:", msg);
			setError("Failed to load existing files.");
		} finally {
			setLoadingExisting(false);
		}
	}

	useEffect(() => {
		void loadExistingDocs();
	}, [user, portfolios]);

	async function handleFile(file: File) {
		await uploadFileToAi(file);
	}

	async function handleImportPropertyDoc(item: PropertyImportDoc) {
		setProcessingDocId(item.key);
		setError(null);
		setResult(null);
		setOcrVisible(false);
		try {
			// If this file is already in the AI index (matched by filename + propertyId),
			// skip the upload entirely and re-extract directly via PATCH.
			const existingAiDoc = existingDocs.find(
				(d) =>
					d.fileName === item.doc.name &&
					(d.propertyIds ?? []).includes(item.propertyId),
			);

			if (existingAiDoc) {
				setUploading(true);
				try {
					const reextracted = await PropertyAPI.reextractDocument(
						existingAiDoc.id,
					);
					if (reextracted) {
						if (reextracted.aiSkipped === "rate_limited") {
							const minutes = Math.max(
								1,
								Math.ceil((reextracted.rateLimitCooldownMs ?? 0) / 60000),
							);
							setError(
								`AI extraction is temporarily rate-limited. Try again in about ${minutes} minute${minutes === 1 ? "" : "s"}.`,
							);
						}
						setResult({
							document: reextracted as unknown as UploadResult["document"],
							images: [],
							chunksCreated: 0,
						});
						void loadExistingDocs();
					} else {
						setError("Re-extraction failed. Please try again.");
					}
				} finally {
					setUploading(false);
				}
				return;
			}

			// Not in the AI index yet — fetch the file and upload it.
			const res = await fetch(
				`/api/properties/${item.propertyId}/documents/${item.doc.id}/view`,
			);
			if (!res.ok) {
				setError(`Failed to fetch property document: ${item.doc.name}`);
				return;
			}

			const blob = await res.blob();
			const mimeType = res.headers.get("content-type") || blob.type;
			const file = new File([blob], item.doc.name, {
				type: mimeType || "application/octet-stream",
			});

			await uploadFileToAi(file, [item.propertyId]);
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: "Failed to import property document",
			);
		} finally {
			setProcessingDocId(null);
		}
	}

	async function handleReprocessExisting(doc: AIDocument) {
		setError(null);
		setResult(null);
		setOcrVisible(false);
		setProcessingDocId(doc.id);

		try {
			const updated = await PropertyAPI.reextractDocument(doc.id);
			if (!updated) {
				setError("Reprocessing failed.");
				return;
			}

			if (updated.aiSkipped === "rate_limited") {
				const minutes = Math.max(
					1,
					Math.ceil((updated.rateLimitCooldownMs ?? 0) / 60000),
				);
				setError(
					`AI extraction is temporarily rate-limited. Try again in about ${minutes} minute${minutes === 1 ? "" : "s"}.`,
				);
			}

			const full = await PropertyAPI.getDocument(doc.id);
			setResult({
				document: {
					id: updated.id,
					fileName: updated.fileName,
					fileSize: updated.fileSize,
					mimeType: updated.mimeType,
					documentType: updated.documentType,
					confidence: updated.confidence ?? 0,
					indexed: updated.indexed,
					createdAt: updated.createdAt,
					fileUrl: updated.fileUrl,
					ocrText: updated.ocrText ?? "",
					extractedData:
						(updated.extractedData as Record<string, unknown>) ?? {},
				},
				images:
					full?.images.map((img) => ({
						imageUrl: img.imageUrl,
						pageNumber: img.pageNumber ?? 0,
					})) ?? [],
				chunksCreated: 0,
			});

			setExistingDocs((prev) =>
				prev.map((d) => (d.id === updated.id ? updated : d)),
			);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Reprocessing failed");
		} finally {
			setProcessingDocId(null);
		}
	}

	function onFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (file) handleFile(file);
		e.target.value = "";
	}

	function onDrop(e: React.DragEvent) {
		e.preventDefault();
		setDragging(false);
		const file = e.dataTransfer.files?.[0];
		if (file) handleFile(file);
	}

	const doc = result?.document;
	const extracted = doc?.extractedData ?? {};
	const fields = Object.entries(FIELD_LABELS).filter(
		([key]) =>
			extracted[key] !== undefined &&
			extracted[key] !== null &&
			extracted[key] !== "",
	);

	return (
		<div className="min-h-screen bg-background p-6 md:p-10">
			<div className="max-w-3xl">
				{/* Header */}
				<div className="mb-8">
					<h1 className="text-2xl font-headline font-bold text-on-surface mb-1">
						Document Extraction Test
					</h1>
					<p className="text-on-surface-variant text-sm">
						Upload a PDF or image. The pipeline extracts text and structured
						property fields using the active AI provider.
					</p>
				</div>

				{/* Drop zone */}
				<div
					className={`border-2 border-dashed rounded-md p-10 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors mb-6
						${dragging ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-border bg-card"}`}
					onClick={() => fileInputRef.current?.click()}
					onDragOver={(e) => {
						e.preventDefault();
						setDragging(true);
					}}
					onDragLeave={() => setDragging(false)}
					onDrop={onDrop}
				>
					<input
						ref={fileInputRef}
						type="file"
						className="hidden"
						accept=".pdf,.jpg,.jpeg,.png,.webp,.tiff,.bmp"
						onChange={onFileInputChange}
					/>
					{uploading ? (
						<>
							<div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
							<p className="text-on-surface-variant text-sm">Processing…</p>
						</>
					) : (
						<>
							<svg
								className="w-10 h-10 text-outline"
								fill="none"
								stroke="currentColor"
								strokeWidth={1.5}
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
								/>
							</svg>
							<p className="text-on-surface font-medium text-sm">
								Drop a document here or{" "}
								<span className="text-blue-500 underline">browse</span>
							</p>
							<p className="text-outline text-xs">
								PDF, JPG, PNG, WEBP, TIFF — max 25 MB
							</p>
						</>
					)}
				</div>

				{/* Property selector */}
				{myProperties.length > 0 && (
					<div className="mb-6 p-4 bg-card border border-border rounded-md">
						<h3 className="text-sm font-semibold text-on-surface mb-3">
							Link to Properties (Optional)
						</h3>
						<div className="space-y-2">
							{myProperties.map((prop) => (
								<label
									key={prop.id}
									className="flex items-center gap-2 cursor-pointer"
								>
									<input
										type="checkbox"
										checked={selectedPropertyIds.has(prop.id)}
										onChange={(e) => {
											const newSet = new Set(selectedPropertyIds);
											if (e.target.checked) {
												newSet.add(prop.id);
											} else {
												newSet.delete(prop.id);
											}
											setSelectedPropertyIds(newSet);
										}}
										className="rounded"
									/>
									<span className="text-sm text-on-surface">{prop.name}</span>
									<span className="text-xs text-outline">({prop.id})</span>
								</label>
							))}
						</div>
					</div>
				)}

				{/* Debug panel (dev only) */}
				{process.env.NODE_ENV === "development" && user && (
					<div className="mb-6 p-3 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-xs">
						<p className="font-mono text-slate-700 dark:text-slate-300">
							User: <span className="font-semibold">{user.id}</span>
						</p>
						<p className="font-mono text-slate-700 dark:text-slate-300 mt-1">
							Properties:{" "}
							<span className="font-semibold">{myProperties.length}</span>
						</p>
					</div>
				)}

				{/* Existing files */}
				<div className="mb-6 bg-card border border-border rounded-md overflow-hidden">
					<div className="px-4 py-3 border-b border-border flex items-center justify-between">
						<div>
							<h2 className="font-headline font-semibold text-on-surface text-sm uppercase tracking-widest">
								Existing Files
							</h2>
							<p className="text-xs text-on-surface-variant mt-1">
								All documents in your account (across all properties)
							</p>
						</div>
						<button
							onClick={() => void loadExistingDocs()}
							className="text-xs text-blue-500 underline"
							disabled={loadingExisting}
						>
							{loadingExisting ? "Refreshing..." : "Refresh"}
						</button>
					</div>
					<div className="max-h-64 overflow-y-auto divide-y divide-border">
						{loadingExisting ? (
							<p className="p-4 text-sm text-on-surface-variant">
								Loading files...
							</p>
						) : existingDocs.length === 0 ? (
							<p className="p-4 text-sm text-on-surface-variant">
								No uploaded files yet.
							</p>
						) : (
							existingDocs.map((d) => (
								<div
									key={d.id}
									className="p-3 flex items-center justify-between gap-3"
								>
									<div className="min-w-0">
										<p
											className="text-sm text-on-surface truncate"
											title={d.fileName}
										>
											{d.fileName}
										</p>
										<p className="text-xs text-outline">
											{Math.round((d.confidence ?? 0) * 100)}% confidence ·{" "}
											{new Date(d.createdAt).toLocaleString()}
										</p>
									</div>
									<button
										onClick={() => void handleReprocessExisting(d)}
										disabled={processingDocId === d.id}
										className="shrink-0 px-3 py-1.5 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
									>
										{processingDocId === d.id
											? "Processing..."
											: "Process With AI"}
									</button>
								</div>
							))
						)}
					</div>
				</div>

				{/* Property docs bridge */}
				{propertyDocsForImport.length > 0 && (
					<div className="mb-6 bg-card border border-border rounded-md overflow-hidden">
						<div className="px-4 py-3 border-b border-border">
							<h2 className="font-headline font-semibold text-on-surface text-sm uppercase tracking-widest">
								Property Documents
							</h2>
							<p className="text-xs text-on-surface-variant mt-1">
								Documents attached to property records. Use this to run AI
								extraction without re-uploading from disk.
							</p>
						</div>
						<div className="max-h-64 overflow-y-auto divide-y divide-border">
							{propertyDocsForImport.map((item) => (
								<div
									key={item.key}
									className="p-3 flex items-center justify-between gap-3"
								>
									<div className="min-w-0">
										<p
											className="text-sm text-on-surface truncate"
											title={item.doc.name}
										>
											{item.doc.name}
										</p>
										<p className="text-xs text-outline">
											{item.propertyName} ({item.propertyId})
										</p>
									</div>
									<button
										onClick={() => void handleImportPropertyDoc(item)}
										disabled={processingDocId === item.key || uploading}
										className="shrink-0 px-3 py-1.5 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
									>
										{processingDocId === item.key
											? "Processing..."
											: "Process With AI"}
									</button>
								</div>
							))}
						</div>
					</div>
				)}

				{/* Error */}
				{error && (
					<div className="mb-6 px-4 py-3 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
						{error}
					</div>
				)}

				{/* Results */}
				{doc && (
					<div className="space-y-6">
						{/* Document meta */}
						<div className="bg-card border border-border rounded-md p-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
							<span className="text-on-surface-variant">
								<span className="font-medium text-on-surface">File:</span>{" "}
								{doc.fileName}
							</span>
							<span className="text-on-surface-variant">
								<span className="font-medium text-on-surface">Type:</span>{" "}
								<span className="capitalize">
									{doc.documentType.replace(/_/g, " ")}
								</span>
							</span>
							<span className="text-on-surface-variant">
								<span className="font-medium text-on-surface">Confidence:</span>{" "}
								<span
									className={`font-bold ${confidenceColor(doc.confidence)}`}
								>
									{Math.round(doc.confidence * 100)}%
								</span>
							</span>
							<span className="text-on-surface-variant">
								<span className="font-medium text-on-surface">
									Indexed chunks:
								</span>{" "}
								{result?.chunksCreated ?? 0}
							</span>
							<a
								href={doc.fileUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="text-blue-500 underline"
							>
								View original ↗
							</a>
						</div>

						{/* Extracted fields */}
						<div className="bg-card border border-border rounded-md overflow-hidden">
							<div className="px-4 py-3 border-b border-border">
								<h2 className="font-headline font-semibold text-on-surface text-sm uppercase tracking-widest">
									Extracted Fields
								</h2>
							</div>
							{fields.length === 0 ? (
								<p className="p-4 text-on-surface-variant text-sm">
									No fields extracted.
								</p>
							) : (
								<dl className="divide-y divide-border">
									{fields.map(([key, label]) => (
										<div
											key={key}
											className="px-4 py-3 flex flex-col sm:flex-row sm:gap-4"
										>
											<dt className="text-xs font-medium text-outline uppercase tracking-wide w-44 shrink-0 pt-0.5">
												{label}
											</dt>
											<dd className="text-sm text-on-surface wrap-break-word">
												{formatValue(extracted[key])}
											</dd>
										</div>
									))}
								</dl>
							)}
						</div>

						{/* Extracted images */}
						{result?.images && result.images.length > 0 && (
							<div className="bg-card border border-border rounded-md overflow-hidden">
								<div className="px-4 py-3 border-b border-border">
									<h2 className="font-headline font-semibold text-on-surface text-sm uppercase tracking-widest">
										Extracted Images ({result.images.length})
									</h2>
								</div>
								<div className="p-4 flex flex-wrap gap-3">
									{result.images.map((img, i) => (
										<a
											key={i}
											href={img.imageUrl}
											target="_blank"
											rel="noopener noreferrer"
											className="block"
										>
											{/* eslint-disable-next-line @next/next/no-img-element */}
											<img
												src={img.imageUrl}
												alt={`Page ${img.pageNumber}`}
												className="max-w-xs max-h-64 object-contain rounded-md border border-border hover:opacity-80 transition-opacity"
											/>
											<p className="text-xs text-outline mt-1 text-center">
												Page {img.pageNumber}
											</p>
										</a>
									))}
								</div>
							</div>
						)}

						{/* Raw OCR text toggle */}
						<div className="bg-card border border-border rounded-md overflow-hidden">
							<button
								className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-surface-container transition-colors"
								onClick={() => setOcrVisible((v) => !v)}
							>
								<h2 className="font-headline font-semibold text-on-surface text-sm uppercase tracking-widest">
									Raw OCR Text
								</h2>
								<span className="text-outline text-xs">
									{ocrVisible ? "Hide ▲" : "Show ▼"}
								</span>
							</button>
							{ocrVisible && (
								<pre className="px-4 pb-4 text-xs text-on-surface-variant whitespace-pre-wrap wrap-break-word max-h-96 overflow-y-auto font-mono">
									{doc.ocrText || "(No OCR text extracted)"}
								</pre>
							)}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
