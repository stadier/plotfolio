"use client";

import { PropertyAPI } from "@/lib/api";
import type { AIDocument } from "@/types/document";
import { ExternalLink, FileText, Link2, Plus, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const DOC_TYPE_LABELS: Record<string, string> = {
	survey_plan: "Survey Plan",
	certificate_of_occupancy: "Certificate of Occupancy",
	contract_of_sale: "Contract of Sale",
	title_deed: "Title Deed",
	lease_agreement: "Lease Agreement",
	building_permit: "Building Permit",
	inspection_report: "Inspection Report",
	allocation_letter: "Allocation Letter",
	other: "Other",
};

function docTypeLabel(type: string) {
	return (
		DOC_TYPE_LABELS[type] ??
		type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
	);
}

function fileSize(bytes: number) {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function LinkedDocumentsSection({
	propertyId,
	userId,
	isOwner,
}: {
	propertyId: string;
	userId: string;
	isOwner?: boolean;
}) {
	const [docs, setDocs] = useState<AIDocument[]>([]);
	const [allDocs, setAllDocs] = useState<AIDocument[]>([]);
	const [loading, setLoading] = useState(true);
	const [showPicker, setShowPicker] = useState(false);

	const fetchLinked = useCallback(async () => {
		setLoading(true);
		try {
			const list = await PropertyAPI.listDocuments({
				propertyId,
				userId,
			});
			setDocs(list);
		} catch {
			// ignore
		} finally {
			setLoading(false);
		}
	}, [propertyId, userId]);

	useEffect(() => {
		fetchLinked();
	}, [fetchLinked]);

	async function loadAllDocs() {
		const list = await PropertyAPI.listDocuments({ userId });
		setAllDocs(list);
		setShowPicker(true);
	}

	async function linkDoc(doc: AIDocument) {
		const ids = [...(doc.propertyIds ?? []), propertyId];
		const ok = await PropertyAPI.updateDocument(doc.id, {
			propertyIds: ids,
		});
		if (ok) {
			setDocs((prev) => [...prev, { ...doc, propertyIds: ids }]);
			setAllDocs((prev) =>
				prev.map((d) => (d.id === doc.id ? { ...d, propertyIds: ids } : d)),
			);
		}
	}

	async function unlinkDoc(doc: AIDocument) {
		const ids = (doc.propertyIds ?? []).filter((id) => id !== propertyId);
		const ok = await PropertyAPI.updateDocument(doc.id, {
			propertyIds: ids,
		});
		if (ok) {
			setDocs((prev) => prev.filter((d) => d.id !== doc.id));
			setAllDocs((prev) =>
				prev.map((d) => (d.id === doc.id ? { ...d, propertyIds: ids } : d)),
			);
		}
	}

	const linkedIds = new Set(docs.map((d) => d.id));
	const unlinked = allDocs.filter((d) => !linkedIds.has(d.id));

	if (loading) return null;
	if (docs.length === 0 && !isOwner) return null;

	return (
		<section className="space-y-3">
			<div className="flex items-center justify-between">
				<h2 className="font-headline text-base font-semibold text-on-surface flex items-center gap-2">
					<Link2 className="w-4 h-4" />
					Linked Documents
				</h2>
				{isOwner && (
					<button
						type="button"
						onClick={showPicker ? () => setShowPicker(false) : loadAllDocs}
						className="flex items-center gap-1 text-xs text-primary hover:underline"
					>
						{showPicker ? (
							<>
								<X className="w-3 h-3" /> Close
							</>
						) : (
							<>
								<Plus className="w-3 h-3" /> Attach document
							</>
						)}
					</button>
				)}
			</div>

			{/* Picker: all unlinked docs */}
			{showPicker && (
				<div className="border border-border rounded-md bg-card max-h-48 overflow-y-auto">
					{unlinked.length === 0 ? (
						<p className="text-xs text-outline p-3">
							All your documents are already linked to this property.
						</p>
					) : (
						unlinked.map((doc) => (
							<button
								key={doc.id}
								type="button"
								onClick={() => linkDoc(doc)}
								className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface-container-high transition-colors border-b border-border last:border-b-0"
							>
								<FileText className="w-4 h-4 text-outline shrink-0" />
								<span className="flex-1 truncate text-on-surface">
									{doc.fileName}
								</span>
								<span className="text-badge text-outline shrink-0">
									{docTypeLabel(doc.documentType)}
								</span>
								<Plus className="w-3.5 h-3.5 text-primary shrink-0" />
							</button>
						))
					)}
				</div>
			)}

			{/* Linked docs list */}
			{docs.length > 0 ? (
				<div className="space-y-1.5">
					{docs.map((doc) => (
						<div
							key={doc.id}
							className="flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-md max-w-xl group"
						>
							<FileText className="w-4 h-4 text-outline shrink-0" />
							<div className="flex-1 min-w-0">
								{/* Use same-origin proxy for private B2 files */}
								<a
									href={`/api/documents/${doc.id}/view`}
									target="_blank"
									rel="noopener noreferrer"
									className="text-xs font-medium text-on-surface hover:text-primary truncate block"
								>
									{doc.fileName}
									<ExternalLink className="w-3 h-3 inline ml-1 opacity-0 group-hover:opacity-100" />
								</a>
								<div className="flex items-center gap-2 text-badge text-outline">
									<span>{docTypeLabel(doc.documentType)}</span>
									<span>&middot;</span>
									<span>{fileSize(doc.fileSize)}</span>
								</div>
							</div>
							{isOwner && (
								<button
									type="button"
									onClick={() => unlinkDoc(doc)}
									className="p-1 rounded text-outline hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
									title="Unlink from this property"
								>
									<X className="w-3.5 h-3.5" />
								</button>
							)}
						</div>
					))}
				</div>
			) : (
				isOwner && (
					<p className="text-xs text-outline">
						No documents linked yet. Click &ldquo;Attach document&rdquo; to link
						existing documents to this property.
					</p>
				)
			)}
		</section>
	);
}
