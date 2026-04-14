"use client";

import {
	ContractClause,
	ContractParty,
	ContractType,
	SealConfig,
} from "@/types/seal";
import {
	Download,
	FileText,
	Loader2,
	Plus,
	Printer,
	Trash2,
} from "lucide-react";
import { useRef, useState } from "react";

interface SealItem {
	id: string;
	name: string;
	config: SealConfig;
	imageUrl?: string;
	isDefault: boolean;
}

interface DocumentGeneratorProps {
	propertyId: string;
	propertyName: string;
	propertyAddress: string;
	/** Prefilled seller/landlord info */
	ownerName: string;
	ownerEmail?: string;
	ownerPhone?: string;
	ownerType?: "individual" | "company" | "trust";
	/** User's seals for signing */
	seals?: SealItem[];
	onClose: () => void;
}

const CONTRACT_TYPES: {
	value: ContractType;
	label: string;
	description: string;
}[] = [
	{
		value: ContractType.SALE,
		label: "Sale",
		description: "Contract of sale — transfer of property for payment",
	},
	{
		value: ContractType.LEASE,
		label: "Lease",
		description: "Fixed-term lease agreement",
	},
	{
		value: ContractType.RENT,
		label: "Rent",
		description: "Monthly or short-term rental agreement",
	},
	{
		value: ContractType.TRANSFER,
		label: "Transfer",
		description: "Ownership transfer between parties",
	},
];

export default function DocumentGenerator({
	propertyId,
	propertyName,
	propertyAddress,
	ownerName,
	ownerEmail,
	ownerPhone,
	ownerType = "individual",
	seals = [],
	onClose,
}: DocumentGeneratorProps) {
	const [step, setStep] = useState<"form" | "preview">("form");
	const [contractType, setContractType] = useState<ContractType>(
		ContractType.SALE,
	);
	const [partyB, setPartyB] = useState<ContractParty>({
		name: "",
		email: "",
		phone: "",
		address: "",
		type: "individual",
	});
	const [amount, setAmount] = useState("");
	const [currency, setCurrency] = useState("USD");
	const [startDate, setStartDate] = useState("");
	const [endDate, setEndDate] = useState("");
	const [additionalClauses, setAdditionalClauses] = useState<ContractClause[]>(
		[],
	);
	const [witnesses, setWitnesses] = useState<ContractParty[]>([]);
	const [selectedSealId, setSelectedSealId] = useState<string>("");
	const [generating, setGenerating] = useState(false);
	const [generatedHtml, setGeneratedHtml] = useState("");
	const [error, setError] = useState<string | null>(null);
	const previewRef = useRef<HTMLIFrameElement>(null);

	const partyA: ContractParty = {
		name: ownerName,
		email: ownerEmail,
		phone: ownerPhone,
		type: ownerType,
	};

	const showDates =
		contractType === ContractType.LEASE || contractType === ContractType.RENT;

	const handleGenerate = async () => {
		setError(null);
		if (!partyB.name.trim()) {
			setError("Other party name is required.");
			return;
		}
		if (!amount || Number(amount) <= 0) {
			setError("Valid amount is required.");
			return;
		}

		setGenerating(true);
		try {
			const res = await fetch("/api/documents/generate", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					contractType,
					propertyId,
					propertyName,
					propertyAddress,
					partyA,
					partyB,
					amount: Number(amount),
					currency,
					startDate: startDate || undefined,
					endDate: endDate || undefined,
					additionalClauses,
					witnesses,
					sealId: selectedSealId || undefined,
				}),
			});

			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Generation failed");

			setGeneratedHtml(data.html);
			setStep("preview");
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to generate document",
			);
		} finally {
			setGenerating(false);
		}
	};

	const handlePrint = () => {
		const iframe = previewRef.current;
		if (iframe?.contentWindow) {
			iframe.contentWindow.print();
		}
	};

	const handleDownload = () => {
		const blob = new Blob([generatedHtml], { type: "text/html" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `${contractType}-contract-${propertyName.replace(/\s+/g, "-").toLowerCase()}.html`;
		a.click();
		URL.revokeObjectURL(url);
	};

	const addClause = () => {
		setAdditionalClauses((prev) => [...prev, { title: "", body: "" }]);
	};

	const removeClause = (index: number) => {
		setAdditionalClauses((prev) => prev.filter((_, i) => i !== index));
	};

	const updateClause = (
		index: number,
		field: "title" | "body",
		value: string,
	) => {
		setAdditionalClauses((prev) =>
			prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)),
		);
	};

	const addWitness = () => {
		setWitnesses((prev) => [
			...prev,
			{ name: "", email: "", type: "individual" },
		]);
	};

	const removeWitness = (index: number) => {
		setWitnesses((prev) => prev.filter((_, i) => i !== index));
	};

	const inputClass =
		"w-full max-w-sm typo-body bg-input border border-outline-variant sz-radius-md px-3 py-2 text-on-surface placeholder:text-outline focus:outline-none focus:border-primary transition-colors";

	if (step === "preview") {
		return (
			<div className="max-w-2xl">
				<div className="flex items-center justify-between mb-4">
					<h2 className="font-headline typo-section-title font-bold text-on-surface">
						Generated Contract
					</h2>
					<div className="flex gap-2">
						<button
							onClick={handlePrint}
							className="sz-btn border border-outline-variant text-on-surface-variant typo-btn font-bold uppercase tracking-widest hover:bg-surface-container-low transition-colors cursor-pointer flex items-center gap-1.5"
						>
							<Printer className="w-3.5 h-3.5" /> Print
						</button>
						<button
							onClick={handleDownload}
							className="sz-btn bg-primary text-on-primary typo-btn font-bold uppercase tracking-widest hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-1.5"
						>
							<Download className="w-3.5 h-3.5" /> Download
						</button>
					</div>
				</div>

				<div className="bg-card border border-outline-variant sz-radius-card overflow-hidden">
					<iframe
						ref={previewRef}
						srcDoc={generatedHtml}
						className="w-full border-0"
						style={{ minHeight: 600 }}
						title="Contract preview"
						sandbox="allow-same-origin"
					/>
				</div>

				<div className="flex gap-3 mt-4">
					<button
						onClick={() => setStep("form")}
						className="sz-btn border border-outline-variant text-on-surface-variant typo-btn font-bold uppercase tracking-widest hover:bg-surface-container-low transition-colors cursor-pointer"
					>
						Back to form
					</button>
					<button
						onClick={onClose}
						className="sz-btn border border-outline-variant text-on-surface-variant typo-btn font-bold uppercase tracking-widest hover:bg-surface-container-low transition-colors cursor-pointer"
					>
						Close
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="max-w-2xl">
			<div className="flex items-center gap-2 mb-4">
				<FileText className="w-5 h-5 text-primary" />
				<h2 className="font-headline typo-section-title font-bold text-on-surface">
					Generate Contract
				</h2>
			</div>
			<p className="typo-body-sm text-on-surface-variant mb-6">
				Create a professional contract for{" "}
				<strong className="text-on-surface">{propertyName}</strong>. The
				document will include your details, Plotfolio branding, and optional
				seal.
			</p>

			<div className="space-y-6">
				{/* Contract type */}
				<div>
					<span className="typo-body-sm font-medium text-on-surface-variant mb-2 block">
						Contract type
					</span>
					<div className="flex gap-2 flex-wrap">
						{CONTRACT_TYPES.map((ct) => (
							<button
								key={ct.value}
								type="button"
								onClick={() => setContractType(ct.value)}
								className={`px-3 py-1.5 sz-radius-md typo-body-sm font-medium border-2 transition-all cursor-pointer ${
									contractType === ct.value
										? "border-primary bg-primary/10 text-primary"
										: "border-outline-variant text-on-surface-variant hover:border-outline"
								}`}
								title={ct.description}
							>
								{ct.label}
							</button>
						))}
					</div>
				</div>

				{/* Other party */}
				<div className="bg-surface-container-lowest border border-outline-variant sz-radius-card p-4">
					<h3 className="typo-body font-semibold text-on-surface mb-3">
						{contractType === ContractType.SALE
							? "Buyer"
							: contractType === ContractType.TRANSFER
								? "Transferee"
								: "Tenant"}{" "}
						details
					</h3>
					<div className="space-y-3">
						<input
							type="text"
							value={partyB.name}
							onChange={(e) =>
								setPartyB((p) => ({ ...p, name: e.target.value }))
							}
							placeholder="Full name *"
							className={inputClass}
						/>
						<input
							type="email"
							value={partyB.email ?? ""}
							onChange={(e) =>
								setPartyB((p) => ({ ...p, email: e.target.value }))
							}
							placeholder="Email"
							className={inputClass}
						/>
						<input
							type="tel"
							value={partyB.phone ?? ""}
							onChange={(e) =>
								setPartyB((p) => ({ ...p, phone: e.target.value }))
							}
							placeholder="Phone"
							className={inputClass}
						/>
						<input
							type="text"
							value={partyB.address ?? ""}
							onChange={(e) =>
								setPartyB((p) => ({ ...p, address: e.target.value }))
							}
							placeholder="Address"
							className={inputClass}
						/>
						<select
							value={partyB.type}
							onChange={(e) =>
								setPartyB((p) => ({
									...p,
									type: e.target.value as "individual" | "company" | "trust",
								}))
							}
							className={inputClass + " appearance-none cursor-pointer"}
						>
							<option value="individual">Individual</option>
							<option value="company">Company</option>
							<option value="trust">Trust</option>
						</select>
					</div>
				</div>

				{/* Amount + Currency */}
				<div className="flex gap-3">
					<label className="flex-1 block">
						<span className="typo-body-sm font-medium text-on-surface-variant mb-1.5 block">
							Amount *
						</span>
						<input
							type="number"
							value={amount}
							onChange={(e) => setAmount(e.target.value)}
							placeholder="0.00"
							min={0}
							className={inputClass}
						/>
					</label>
					<label className="block">
						<span className="typo-body-sm font-medium text-on-surface-variant mb-1.5 block">
							Currency
						</span>
						<input
							type="text"
							value={currency}
							onChange={(e) => setCurrency(e.target.value.toUpperCase())}
							maxLength={3}
							className="w-20 typo-body bg-input border border-outline-variant sz-radius-md px-3 py-2 text-on-surface focus:outline-none focus:border-primary transition-colors"
						/>
					</label>
				</div>

				{/* Dates for lease/rent */}
				{showDates && (
					<div className="flex gap-3">
						<label className="flex-1 block">
							<span className="typo-body-sm font-medium text-on-surface-variant mb-1.5 block">
								Start date
							</span>
							<input
								type="date"
								value={startDate}
								onChange={(e) => setStartDate(e.target.value)}
								className={inputClass}
							/>
						</label>
						<label className="flex-1 block">
							<span className="typo-body-sm font-medium text-on-surface-variant mb-1.5 block">
								End date
							</span>
							<input
								type="date"
								value={endDate}
								onChange={(e) => setEndDate(e.target.value)}
								className={inputClass}
							/>
						</label>
					</div>
				)}

				{/* Additional clauses */}
				<div>
					<div className="flex items-center gap-2 mb-2">
						<span className="typo-body-sm font-medium text-on-surface-variant">
							Additional clauses
						</span>
						<button
							type="button"
							onClick={addClause}
							className="typo-caption text-primary hover:underline cursor-pointer flex items-center gap-1"
						>
							<Plus className="w-3 h-3" /> Add
						</button>
					</div>
					{additionalClauses.map((clause, i) => (
						<div
							key={i}
							className="flex gap-2 mb-2 items-start bg-surface-container-lowest border border-outline-variant sz-radius-md p-3"
						>
							<div className="flex-1 space-y-2">
								<input
									type="text"
									value={clause.title}
									onChange={(e) => updateClause(i, "title", e.target.value)}
									placeholder="Clause title"
									className={inputClass}
								/>
								<textarea
									value={clause.body}
									onChange={(e) => updateClause(i, "body", e.target.value)}
									placeholder="Clause content"
									rows={2}
									className={inputClass + " resize-y"}
								/>
							</div>
							<button
								type="button"
								onClick={() => removeClause(i)}
								className="p-1 text-outline hover:text-error cursor-pointer mt-1"
							>
								<Trash2 className="w-4 h-4" />
							</button>
						</div>
					))}
				</div>

				{/* Witnesses */}
				<div>
					<div className="flex items-center gap-2 mb-2">
						<span className="typo-body-sm font-medium text-on-surface-variant">
							Witnesses
						</span>
						<button
							type="button"
							onClick={addWitness}
							className="typo-caption text-primary hover:underline cursor-pointer flex items-center gap-1"
						>
							<Plus className="w-3 h-3" /> Add
						</button>
					</div>
					{witnesses.map((w, i) => (
						<div key={i} className="flex gap-2 mb-2 items-center">
							<input
								type="text"
								value={w.name}
								onChange={(e) =>
									setWitnesses((prev) =>
										prev.map((wt, wi) =>
											wi === i ? { ...wt, name: e.target.value } : wt,
										),
									)
								}
								placeholder="Witness name"
								className={inputClass}
							/>
							<button
								type="button"
								onClick={() => removeWitness(i)}
								className="p-1 text-outline hover:text-error cursor-pointer"
							>
								<Trash2 className="w-4 h-4" />
							</button>
						</div>
					))}
				</div>

				{/* Seal selection */}
				{seals.length > 0 && (
					<div>
						<span className="typo-body-sm font-medium text-on-surface-variant mb-2 block">
							Apply seal
						</span>
						<div className="flex gap-3 flex-wrap">
							<button
								type="button"
								onClick={() => setSelectedSealId("")}
								className={`px-3 py-1.5 sz-radius-md typo-body-sm font-medium border-2 transition-all cursor-pointer ${
									!selectedSealId
										? "border-primary bg-primary/10 text-primary"
										: "border-outline-variant text-on-surface-variant hover:border-outline"
								}`}
							>
								None
							</button>
							{seals.map((seal) => (
								<button
									key={seal.id}
									type="button"
									onClick={() => setSelectedSealId(seal.id)}
									className={`flex items-center gap-2 px-3 py-1.5 sz-radius-md typo-body-sm font-medium border-2 transition-all cursor-pointer ${
										selectedSealId === seal.id
											? "border-primary bg-primary/10 text-primary"
											: "border-outline-variant text-on-surface-variant hover:border-outline"
									}`}
								>
									{seal.imageUrl && (
										<img
											src={seal.imageUrl}
											alt={seal.name}
											className="w-6 h-6 object-contain"
										/>
									)}
									{seal.name}
								</button>
							))}
						</div>
					</div>
				)}

				{error && (
					<p className="typo-body-sm text-error font-medium">{error}</p>
				)}

				{/* Actions */}
				<div className="flex items-center gap-3 pt-2">
					<button
						type="button"
						onClick={handleGenerate}
						disabled={generating}
						className="sz-btn bg-primary text-on-primary typo-btn font-bold uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
					>
						{generating ? (
							<>
								<Loader2 className="w-4 h-4 animate-spin" /> Generating…
							</>
						) : (
							<>
								<FileText className="w-4 h-4" /> Generate contract
							</>
						)}
					</button>
					<button
						type="button"
						onClick={onClose}
						className="sz-btn border border-outline-variant text-on-surface-variant typo-btn font-bold uppercase tracking-widest hover:bg-surface-container-low transition-colors cursor-pointer"
					>
						Cancel
					</button>
				</div>
			</div>
		</div>
	);
}
