/**
 * HTML contract templates for document generation.
 * Generates printable / downloadable HTML contracts
 * with optional seal and Plotfolio branding watermark.
 */

import {
	ContractClause,
	ContractParty,
	ContractType,
	LetterheadConfig,
} from "@/types/seal";

interface ContractData {
	contractType: ContractType;
	propertyName: string;
	propertyAddress: string;
	propertyId: string;
	partyA: ContractParty;
	partyB: ContractParty;
	amount: number;
	currency: string;
	startDate?: string;
	endDate?: string;
	additionalClauses: ContractClause[];
	witnesses: ContractParty[];
	sealImageUrl?: string;
	sealName?: string;
	generatedDate: string;
	letterhead?: LetterheadConfig;
}

function formatDate(iso: string): string {
	try {
		return new Date(iso).toLocaleDateString("en-GB", {
			day: "numeric",
			month: "long",
			year: "numeric",
		});
	} catch {
		return iso;
	}
}

function formatAmount(amount: number, currency: string): string {
	try {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency,
		}).format(amount);
	} catch {
		return `${currency} ${amount.toLocaleString()}`;
	}
}

function partyLabel(type: ContractType, role: "a" | "b"): string {
	const labels: Record<ContractType, [string, string]> = {
		[ContractType.SALE]: ["Seller", "Buyer"],
		[ContractType.LEASE]: ["Landlord", "Tenant"],
		[ContractType.RENT]: ["Landlord", "Tenant"],
		[ContractType.TRANSFER]: ["Transferor", "Transferee"],
	};
	return (
		labels[type]?.[role === "a" ? 0 : 1] ??
		(role === "a" ? "Party A" : "Party B")
	);
}

function contractTitle(type: ContractType): string {
	const titles: Record<ContractType, string> = {
		[ContractType.SALE]: "Contract of Sale",
		[ContractType.LEASE]: "Lease Agreement",
		[ContractType.RENT]: "Rental Agreement",
		[ContractType.TRANSFER]: "Transfer Agreement",
	};
	return titles[type] ?? "Agreement";
}

function renderPartyBlock(party: ContractParty, label: string): string {
	return `
		<div class="party-block">
			<h3>${label}</h3>
			<p><strong>Name:</strong> ${escapeHtml(party.name)}</p>
			${party.email ? `<p><strong>Email:</strong> ${escapeHtml(party.email)}</p>` : ""}
			${party.phone ? `<p><strong>Phone:</strong> ${escapeHtml(party.phone)}</p>` : ""}
			${party.address ? `<p><strong>Address:</strong> ${escapeHtml(party.address)}</p>` : ""}
			<p><strong>Type:</strong> ${party.type.charAt(0).toUpperCase() + party.type.slice(1)}</p>
		</div>
	`;
}

function escapeHtml(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

function saleSpecificClauses(data: ContractData): string {
	return `
		<div class="clause">
			<h3>1. SALE OF PROPERTY</h3>
			<p>The ${partyLabel(data.contractType, "a")} agrees to sell, and the ${partyLabel(data.contractType, "b")} agrees to purchase, the property described herein for the sum of <strong>${formatAmount(data.amount, data.currency)}</strong> (the "Purchase Price").</p>
		</div>
		<div class="clause">
			<h3>2. PROPERTY DESCRIPTION</h3>
			<p>Property Name: <strong>${escapeHtml(data.propertyName)}</strong></p>
			${data.propertyAddress ? `<p>Address: <strong>${escapeHtml(data.propertyAddress)}</strong></p>` : ""}
			${data.propertyId ? `<p>Property ID: <strong>${escapeHtml(data.propertyId)}</strong></p>` : ""}
		</div>
		<div class="clause">
			<h3>3. PAYMENT TERMS</h3>
			<p>The Purchase Price shall be paid in full by the ${partyLabel(data.contractType, "b")} to the ${partyLabel(data.contractType, "a")} on or before the completion date, subject to the terms agreed upon by both parties.</p>
		</div>
		<div class="clause">
			<h3>4. TITLE AND OWNERSHIP</h3>
			<p>The ${partyLabel(data.contractType, "a")} warrants that they have good, marketable title to the property, free of all encumbrances, liens, and claims, except as otherwise disclosed in writing.</p>
		</div>
		<div class="clause">
			<h3>5. CLOSING AND TRANSFER</h3>
			<p>The closing of this transaction shall take place at a mutually agreed location and date. Upon receipt of the full Purchase Price, the ${partyLabel(data.contractType, "a")} shall deliver all title documents and transfer instrument to the ${partyLabel(data.contractType, "b")}.</p>
		</div>
		<div class="clause">
			<h3>6. PROPERTY CONDITION</h3>
			<p>The property is sold "as is" in its current condition. The ${partyLabel(data.contractType, "b")} acknowledges having inspected or having had the opportunity to inspect the property.</p>
		</div>
	`;
}

function leaseSpecificClauses(data: ContractData): string {
	const termText =
		data.startDate && data.endDate
			? `from <strong>${formatDate(data.startDate)}</strong> to <strong>${formatDate(data.endDate)}</strong>`
			: "as agreed by both parties";

	return `
		<div class="clause">
			<h3>1. LEASE OF PROPERTY</h3>
			<p>The ${partyLabel(data.contractType, "a")} agrees to lease the property described herein to the ${partyLabel(data.contractType, "b")} for an amount of <strong>${formatAmount(data.amount, data.currency)}</strong> per the agreed term.</p>
		</div>
		<div class="clause">
			<h3>2. PROPERTY DESCRIPTION</h3>
			<p>Property Name: <strong>${escapeHtml(data.propertyName)}</strong></p>
			${data.propertyAddress ? `<p>Address: <strong>${escapeHtml(data.propertyAddress)}</strong></p>` : ""}
			${data.propertyId ? `<p>Property ID: <strong>${escapeHtml(data.propertyId)}</strong></p>` : ""}
		</div>
		<div class="clause">
			<h3>3. LEASE TERM</h3>
			<p>The lease period shall be ${termText}. Renewal terms, if applicable, shall be negotiated before the expiration of this lease.</p>
		</div>
		<div class="clause">
			<h3>4. RENT PAYMENT</h3>
			<p>The ${partyLabel(data.contractType, "b")} shall pay the lease amount as specified above. Payment shall be made on or before the agreed date each period.</p>
		</div>
		<div class="clause">
			<h3>5. USE OF PROPERTY</h3>
			<p>The ${partyLabel(data.contractType, "b")} shall use the property for lawful purposes only and shall maintain the property in good condition throughout the lease term.</p>
		</div>
		<div class="clause">
			<h3>6. TERMINATION</h3>
			<p>Either party may terminate this agreement by giving written notice as specified herein. Early termination penalties, if any, shall apply as agreed.</p>
		</div>
	`;
}

function rentSpecificClauses(data: ContractData): string {
	const termText =
		data.startDate && data.endDate
			? `from <strong>${formatDate(data.startDate)}</strong> to <strong>${formatDate(data.endDate)}</strong>`
			: "on a month-to-month basis starting from the date of this agreement";

	return `
		<div class="clause">
			<h3>1. RENTAL AGREEMENT</h3>
			<p>The ${partyLabel(data.contractType, "a")} agrees to rent the property described herein to the ${partyLabel(data.contractType, "b")} at a monthly rent of <strong>${formatAmount(data.amount, data.currency)}</strong>.</p>
		</div>
		<div class="clause">
			<h3>2. PROPERTY DESCRIPTION</h3>
			<p>Property Name: <strong>${escapeHtml(data.propertyName)}</strong></p>
			${data.propertyAddress ? `<p>Address: <strong>${escapeHtml(data.propertyAddress)}</strong></p>` : ""}
			${data.propertyId ? `<p>Property ID: <strong>${escapeHtml(data.propertyId)}</strong></p>` : ""}
		</div>
		<div class="clause">
			<h3>3. RENTAL PERIOD</h3>
			<p>The rental period shall be ${termText}, unless terminated earlier in accordance with this agreement.</p>
		</div>
		<div class="clause">
			<h3>4. RENT PAYMENT</h3>
			<p>Rent is due on or before the 1st day of each calendar month. Late payment may attract penalties as agreed.</p>
		</div>
		<div class="clause">
			<h3>5. SECURITY DEPOSIT</h3>
			<p>If applicable, the ${partyLabel(data.contractType, "b")} shall pay a security deposit as agreed. The deposit shall be returned, less any lawful deductions, upon termination of the rental agreement.</p>
		</div>
		<div class="clause">
			<h3>6. MAINTENANCE AND REPAIRS</h3>
			<p>The ${partyLabel(data.contractType, "b")} shall maintain the property in reasonable condition. Major structural repairs remain the responsibility of the ${partyLabel(data.contractType, "a")}.</p>
		</div>
	`;
}

function transferSpecificClauses(data: ContractData): string {
	return `
		<div class="clause">
			<h3>1. TRANSFER OF PROPERTY</h3>
			<p>The ${partyLabel(data.contractType, "a")} agrees to transfer ownership of the property described herein to the ${partyLabel(data.contractType, "b")} for a consideration of <strong>${formatAmount(data.amount, data.currency)}</strong>.</p>
		</div>
		<div class="clause">
			<h3>2. PROPERTY DESCRIPTION</h3>
			<p>Property Name: <strong>${escapeHtml(data.propertyName)}</strong></p>
			${data.propertyAddress ? `<p>Address: <strong>${escapeHtml(data.propertyAddress)}</strong></p>` : ""}
			${data.propertyId ? `<p>Property ID: <strong>${escapeHtml(data.propertyId)}</strong></p>` : ""}
		</div>
		<div class="clause">
			<h3>3. TRANSFER CONDITIONS</h3>
			<p>The transfer shall be effective upon execution of this agreement and fulfilment of all conditions precedent as outlined herein.</p>
		</div>
		<div class="clause">
			<h3>4. WARRANTIES</h3>
			<p>The ${partyLabel(data.contractType, "a")} warrants that the property is free from encumbrances and that they have full authority to execute this transfer.</p>
		</div>
		<div class="clause">
			<h3>5. INDEMNIFICATION</h3>
			<p>Each party shall indemnify and hold harmless the other party from any claims arising from their breach of representations or warranties made herein.</p>
		</div>
	`;
}

function renderLetterheadHeader(lh: LetterheadConfig): string {
	const font = lh.fontFamily || "'Georgia', 'Times New Roman', serif";
	const c = lh.accentColor || "#1e3a5f";
	const logoHtml = lh.logoUrl
		? `<img src="${escapeHtml(lh.logoUrl)}" alt="" style="max-height:48px;max-width:100px;object-fit:contain;" />`
		: "";
	const contactParts = [lh.phone, lh.email, lh.website, lh.address].filter(
		Boolean,
	);
	const contactLine = contactParts
		.map((p) => escapeHtml(p!))
		.join("&nbsp;·&nbsp;");
	const regLine = lh.registrationNumber
		? `<div style="font-size:10px;color:#999;margin-top:2px;">Reg: ${escapeHtml(lh.registrationNumber)}</div>`
		: "";

	let inner: string;
	if (lh.layout === "split") {
		inner = `
			<div style="display:flex;justify-content:space-between;align-items:center;gap:16px;">
				<div style="display:flex;align-items:center;gap:10px;">
					${logoHtml}
					<div>
						<div style="font-family:${font};font-size:18px;font-weight:700;color:${c};letter-spacing:1px;">${escapeHtml(lh.companyName)}</div>
						${lh.tagline ? `<div style="font-size:10px;color:#777;">${escapeHtml(lh.tagline)}</div>` : ""}
					</div>
				</div>
				<div style="text-align:right;font-size:10px;color:#555;line-height:1.5;">
					${lh.address ? `<div>${escapeHtml(lh.address)}</div>` : ""}
					${lh.phone ? `<div>${escapeHtml(lh.phone)}</div>` : ""}
					${lh.email ? `<div>${escapeHtml(lh.email)}</div>` : ""}
					${lh.website ? `<div>${escapeHtml(lh.website)}</div>` : ""}
				</div>
			</div>
			${regLine}`;
	} else {
		const align = lh.layout === "left-aligned" ? "left" : "center";
		const flexAlign = lh.layout === "left-aligned" ? "flex-start" : "center";
		inner = `
			<div style="display:flex;flex-direction:column;align-items:${flexAlign};gap:4px;">
				${logoHtml}
				<div style="font-family:${font};font-size:18px;font-weight:700;color:${c};letter-spacing:2px;text-align:${align};">${escapeHtml(lh.companyName)}</div>
				${lh.tagline ? `<div style="font-size:10px;color:#777;">${escapeHtml(lh.tagline)}</div>` : ""}
				${contactLine ? `<div style="font-size:10px;color:#555;">${contactLine}</div>` : ""}
				${regLine}
			</div>`;
	}

	const divider = lh.showDivider
		? `<div style="border-bottom:2px solid ${c};margin-top:10px;"></div>`
		: "";

	return `<div class="letterhead-header" style="margin-bottom:24px;">${inner}${divider}</div>`;
}

function renderLetterheadFooter(lh: LetterheadConfig): string {
	const contactParts = [lh.phone, lh.email, lh.website, lh.address].filter(
		Boolean,
	);
	const contactLine = contactParts.map((p) => escapeHtml(p!)).join(" · ");
	const regPart = lh.registrationNumber
		? ` · Reg: ${escapeHtml(lh.registrationNumber)}`
		: "";
	return `
		<div class="letterhead-footer" style="margin-top:30px;padding-top:10px;border-top:1px solid #e2e8f0;text-align:center;font-size:10px;color:#999;">
			${contactLine || escapeHtml(lh.companyName)}${regPart}
		</div>`;
}

export function generateContractHtml(data: ContractData): string {
	const title = contractTitle(data.contractType);
	const labelA = partyLabel(data.contractType, "a");
	const labelB = partyLabel(data.contractType, "b");

	let specificClauses: string;
	switch (data.contractType) {
		case ContractType.SALE:
			specificClauses = saleSpecificClauses(data);
			break;
		case ContractType.LEASE:
			specificClauses = leaseSpecificClauses(data);
			break;
		case ContractType.RENT:
			specificClauses = rentSpecificClauses(data);
			break;
		case ContractType.TRANSFER:
			specificClauses = transferSpecificClauses(data);
			break;
		default:
			specificClauses = saleSpecificClauses(data);
	}

	const additionalClausesHtml = data.additionalClauses
		.map(
			(c, i) => `
		<div class="clause">
			<h3>${specificClauses.split("<h3>").length + i}. ${escapeHtml(c.title).toUpperCase()}</h3>
			<p>${escapeHtml(c.body)}</p>
		</div>
	`,
		)
		.join("");

	const witnessesHtml =
		data.witnesses.length > 0
			? `
		<div class="witnesses-section">
			<h3>WITNESSES</h3>
			<div class="witnesses-grid">
				${data.witnesses
					.map(
						(w, i) => `
					<div class="witness-block">
						<p class="witness-label">Witness ${i + 1}</p>
						<div class="signature-line"></div>
						<p>${escapeHtml(w.name)}</p>
						${w.email ? `<p class="small">${escapeHtml(w.email)}</p>` : ""}
					</div>
				`,
					)
					.join("")}
			</div>
		</div>
	`
			: "";

	const sealHtml = data.sealImageUrl
		? `
		<div class="seal-section">
			<img src="${data.sealImageUrl}" alt="${escapeHtml(data.sealName || "Seal")}" class="seal-image" />
			${data.sealName ? `<p class="seal-label">${escapeHtml(data.sealName)}</p>` : ""}
		</div>
	`
		: "";

	const letterheadHeaderHtml = data.letterhead
		? renderLetterheadHeader(data.letterhead)
		: "";
	const letterheadFooterHtml = data.letterhead?.showFooter
		? renderLetterheadFooter(data.letterhead)
		: "";

	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(title)}</title>
<style>
	@page { margin: 2cm; size: A4; }
	* { margin: 0; padding: 0; box-sizing: border-box; }
	body {
		font-family: 'Georgia', 'Times New Roman', serif;
		line-height: 1.7;
		color: #1a1a1a;
		max-width: 210mm;
		margin: 0 auto;
		padding: 40px;
		position: relative;
	}
	/* Plotfolio watermark */
	body::before {
		content: 'PLOTFOLIO';
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%) rotate(-35deg);
		font-size: 80px;
		font-family: sans-serif;
		font-weight: 900;
		letter-spacing: 12px;
		color: rgba(0, 0, 0, 0.04);
		pointer-events: none;
		z-index: 0;
		white-space: nowrap;
	}
	.header {
		text-align: center;
		border-bottom: 3px double #1a1a1a;
		padding-bottom: 20px;
		margin-bottom: 30px;
		position: relative;
		z-index: 1;
	}
	.header h1 {
		font-size: 26px;
		font-weight: bold;
		text-transform: uppercase;
		letter-spacing: 4px;
		margin-bottom: 6px;
	}
	.header .subtitle {
		font-size: 13px;
		color: #555;
		letter-spacing: 1px;
	}
	.header .date {
		font-size: 12px;
		color: #777;
		margin-top: 8px;
	}
	.parties {
		display: flex;
		gap: 30px;
		margin-bottom: 30px;
		position: relative;
		z-index: 1;
	}
	.party-block {
		flex: 1;
		padding: 16px;
		border: 1px solid #ddd;
		border-radius: 6px;
		background: #fafafa;
	}
	.party-block h3 {
		font-size: 14px;
		text-transform: uppercase;
		letter-spacing: 2px;
		color: #1e3a5f;
		margin-bottom: 8px;
		border-bottom: 1px solid #ddd;
		padding-bottom: 6px;
	}
	.party-block p {
		font-size: 13px;
		margin-bottom: 3px;
	}
	.clause {
		margin-bottom: 20px;
		position: relative;
		z-index: 1;
	}
	.clause h3 {
		font-size: 14px;
		font-weight: bold;
		text-transform: uppercase;
		letter-spacing: 1px;
		color: #1e3a5f;
		margin-bottom: 6px;
	}
	.clause p {
		font-size: 14px;
		text-align: justify;
	}
	.signatures {
		margin-top: 50px;
		display: flex;
		gap: 40px;
		position: relative;
		z-index: 1;
	}
	.signature-block {
		flex: 1;
		text-align: center;
	}
	.signature-line {
		width: 100%;
		border-bottom: 1px solid #333;
		margin-bottom: 6px;
		height: 50px;
	}
	.signature-block p {
		font-size: 12px;
		color: #555;
	}
	.witnesses-section {
		margin-top: 40px;
		position: relative;
		z-index: 1;
	}
	.witnesses-section h3 {
		font-size: 14px;
		text-transform: uppercase;
		letter-spacing: 2px;
		color: #1e3a5f;
		margin-bottom: 12px;
	}
	.witnesses-grid {
		display: flex;
		gap: 30px;
		flex-wrap: wrap;
	}
	.witness-block {
		flex: 1;
		min-width: 200px;
		text-align: center;
	}
	.witness-label {
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 1px;
		color: #777;
		margin-bottom: 4px;
	}
	.witness-block .small {
		font-size: 11px;
		color: #777;
	}
	.seal-section {
		text-align: center;
		margin-top: 30px;
		position: relative;
		z-index: 1;
	}
	.seal-image {
		width: 120px;
		height: 120px;
		object-fit: contain;
		opacity: 0.85;
	}
	.seal-label {
		font-size: 11px;
		color: #777;
		margin-top: 4px;
	}
	.footer {
		margin-top: 40px;
		padding-top: 16px;
		border-top: 1px solid #ddd;
		text-align: center;
		font-size: 11px;
		color: #999;
		position: relative;
		z-index: 1;
	}
	.footer .platform {
		font-weight: bold;
		color: #1e3a5f;
	}
	@media print {
		body { padding: 0; }
		body::before { position: fixed; }
	}
</style>
</head>
<body>

${letterheadHeaderHtml}

<div class="header">
	<h1>${escapeHtml(title)}</h1>
	<div class="subtitle">For: ${escapeHtml(data.propertyName)}</div>
	<div class="date">Date: ${formatDate(data.generatedDate)}</div>
</div>

<div class="parties">
	${renderPartyBlock(data.partyA, labelA)}
	${renderPartyBlock(data.partyB, labelB)}
</div>

<div class="preamble clause">
	<p>This ${title} ("Agreement") is entered into on <strong>${formatDate(data.generatedDate)}</strong> between the ${labelA} and the ${labelB} as identified above, concerning the property described below.</p>
</div>

${specificClauses}

${additionalClausesHtml}

<div class="clause">
	<h3>GENERAL PROVISIONS</h3>
	<p>This Agreement constitutes the entire understanding between the parties concerning its subject matter and supersedes all prior agreements. Any amendments must be in writing and signed by both parties. This Agreement shall be governed by the applicable laws of the jurisdiction in which the property is located.</p>
</div>

<div class="signatures">
	<div class="signature-block">
		<div class="signature-line"></div>
		<p><strong>${escapeHtml(data.partyA.name)}</strong></p>
		<p>${labelA}</p>
	</div>
	<div class="signature-block">
		<div class="signature-line"></div>
		<p><strong>${escapeHtml(data.partyB.name)}</strong></p>
		<p>${labelB}</p>
	</div>
</div>

${witnessesHtml}
${sealHtml}

${letterheadFooterHtml}

<div class="footer">
	<p>Generated on <span class="platform">Plotfolio</span> — ${formatDate(data.generatedDate)}</p>
	<p>This document is computer-generated. Verify all details before execution.</p>
</div>

</body>
</html>`;
}
