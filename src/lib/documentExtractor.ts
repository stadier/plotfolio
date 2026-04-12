import { PropertyStatus, PropertyType } from "@/types/property";

export interface ExtractedFields {
	name?: string;
	address?: string;
	description?: string;
	propertyType?: PropertyType;
	area?: string;
	zoning?: string;
	taxId?: string;
	lat?: string;
	lng?: string;
	purchasePrice?: string;
	currentValue?: string;
	purchaseDate?: string;
	boughtFrom?: string;
	witnesses?: string;
	signatures?: string;
	ownerName?: string;
	ownerEmail?: string;
	ownerPhone?: string;
	ownerType?: "individual" | "company" | "trust";
	status?: PropertyStatus;
	state?: string;
	city?: string;
	country?: string;
}

/* ── PDF text extraction via pdf.js ──────────────────── */

async function extractTextFromPDF(file: File): Promise<string> {
	const pdfjsLib = await import("pdfjs-dist");

	// Use local worker copied to /public (CDN doesn't carry v5)
	pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

	const buf = await file.arrayBuffer();
	const pdf = await pdfjsLib.getDocument({ data: buf }).promise;

	const pages: string[] = [];
	for (let i = 1; i <= pdf.numPages; i++) {
		const page = await pdf.getPage(i);
		const content = await page.getTextContent();
		const strings = content.items
			.filter((item) => "str" in item)
			.map((item) => (item as { str: string }).str);
		pages.push(strings.join(" "));
	}

	return pages.join("\n");
}

/* ── Image OCR via Tesseract.js ──────────────────────── */

async function extractTextFromImage(file: File): Promise<string> {
	const { recognize } = await import("tesseract.js");
	const {
		data: { text },
	} = await recognize(file, "eng");
	return text;
}

/* ── Detect file kind via magic bytes + MIME + extension ── */

type FileKind = "pdf" | "image" | "text" | "unknown";

async function detectFileKind(file: File): Promise<FileKind> {
	// Check MIME type first
	if (file.type === "application/pdf" || file.name.endsWith(".pdf"))
		return "pdf";
	if (
		file.type.startsWith("image/") ||
		/\.(jpe?g|png|webp|bmp|tiff?)$/i.test(file.name)
	)
		return "image";
	if (
		file.type.startsWith("text/") ||
		file.name.endsWith(".txt") ||
		file.name.endsWith(".csv")
	)
		return "text";

	// No MIME / no extension — check magic bytes
	const header = new Uint8Array(await file.slice(0, 8).arrayBuffer());

	// PDF: starts with %PDF
	if (
		header[0] === 0x25 &&
		header[1] === 0x50 &&
		header[2] === 0x44 &&
		header[3] === 0x46
	)
		return "pdf";
	// PNG: \x89PNG
	if (
		header[0] === 0x89 &&
		header[1] === 0x50 &&
		header[2] === 0x4e &&
		header[3] === 0x47
	)
		return "image";
	// JPEG: \xFF\xD8\xFF
	if (header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff)
		return "image";
	// TIFF: II or MM
	if (
		(header[0] === 0x49 && header[1] === 0x49) ||
		(header[0] === 0x4d && header[1] === 0x4d)
	)
		return "image";
	// WebP: RIFF....WEBP
	if (
		header[0] === 0x52 &&
		header[1] === 0x49 &&
		header[2] === 0x46 &&
		header[3] === 0x46
	)
		return "image";

	return "unknown";
}

/* ── Read text from any supported file ───────────────── */

export async function readTextFromFile(file: File): Promise<string> {
	const kind = await detectFileKind(file);

	switch (kind) {
		case "text":
			return file.text();
		case "pdf":
			return extractTextFromPDF(file);
		case "image":
			return extractTextFromImage(file);
		case "unknown":
			// Last resort — try as PDF first (common for extensionless uploads), then text
			try {
				return await extractTextFromPDF(file);
			} catch {
				return file.text();
			}
	}
}

/* ── Pattern matching: text → fields ─────────────────── */

export function matchTextToFields(text: string): ExtractedFields {
	const fields: ExtractedFields = {};
	const t = text.replace(/\s+/g, " ");
	const tLower = t.toLowerCase();

	// Helper: first non-empty capture from an array of regexes
	function first(patterns: RegExp[]): string | undefined {
		for (const p of patterns) {
			const m = t.match(p);
			if (m?.[1]) return m[1].trim();
		}
		return undefined;
	}

	// ── Plot / property name ──
	// "Plot 1234", "Block A, Plot 5", "Property No. 42", C of O title, file name
	fields.name = first([
		/(?:block\s+[A-Za-z0-9]+[,\s]+)?plot\s*(?:no\.?|number|#)?\s*[:.]?\s*([A-Za-z0-9\-\/,. ]{1,50})/i,
		/(?:property|parcel)\s*(?:no\.?|number|#)?\s*[:.]?\s*([A-Za-z0-9\-\/,. ]{2,40})/i,
		/certificate\s+of\s+occupancy\s*[-—–:]?\s*([A-Za-z0-9\-{} ]{2,60})/i,
	]);

	// ── Address / location ──
	// "situated at", "lying and being at", "located at", "address:", district names
	fields.address = first([
		/(?:situate[d]?\s+(?:at|in)|lying\s+(?:and\s+being\s+)?(?:at|in))\s*[:.]?\s*([A-Za-z0-9\-\/,'.()\s]{5,120}?)(?:\s+in\s+the|\s+within|\s+measuring|\.)/i,
		/(?:address|location)\s*[:.]?\s*([A-Za-z0-9\-\/,. ]{5,80})/i,
		/(?:district|area|estate|layout)\s*[:.]?\s*([A-Za-z0-9\-\/,. ]{3,60})/i,
	]);

	// ── Area ──
	// sqm, square metres, m², hectares, acres
	const areaMatch = t.match(
		/([\d,.]+)\s*(?:sq\.?\s*m(?:et(?:er|re)s?)?|sqm|m²)/i,
	);
	if (areaMatch) {
		fields.area = areaMatch[1].replace(/,/g, "");
	}
	if (!fields.area) {
		const haMatch = t.match(/([\d,.]+)\s*(?:hectares?|ha)\b/i);
		if (haMatch) {
			const ha = parseFloat(haMatch[1].replace(/,/g, ""));
			fields.area = String(Math.round(ha * 10000));
		}
	}
	if (!fields.area) {
		const acreMatch = t.match(/([\d,.]+)\s*(?:acres?)\b/i);
		if (acreMatch) {
			const ac = parseFloat(acreMatch[1].replace(/,/g, ""));
			fields.area = String(Math.round(ac * 4046.86));
		}
	}
	// "measuring approximately 600" near "sqm" or "square"
	if (!fields.area) {
		const measMatch = t.match(/measuring\s+(?:approximately\s+)?([\d,.]+)/i);
		if (measMatch) fields.area = measMatch[1].replace(/,/g, "");
	}

	// ── Coordinates ──
	const latMatch = t.match(/(?:lat(?:itude)?)\s*[:.]?\s*([\d.]+)[°]?\s*[NS]?/i);
	const lngMatch = t.match(
		/(?:lon(?:g(?:itude)?)?)\s*[:.]?\s*([\d.]+)[°]?\s*[EW]?/i,
	);
	if (latMatch) fields.lat = latMatch[1];
	if (lngMatch) fields.lng = lngMatch[1];
	if (!fields.lat || !fields.lng) {
		const coordPair =
			t.match(/[NS]\s*([\d.]+)[°,\s]+[EW]\s*([\d.]+)/i) ||
			t.match(/([\d.]+)[°]?\s*[NS][,\s]+([\d.]+)[°]?\s*[EW]/i);
		if (coordPair) {
			fields.lat = coordPair[1];
			fields.lng = coordPair[2];
		}
	}

	// ── Price / consideration ──
	fields.purchasePrice = first([
		/(?:price|cost|amount|consideration|sum\s+of|for\s+a\s+(?:total\s+)?(?:sum|consideration)\s+of)\s*[:.]?\s*(?:[\$€£₦¥N]|USD|EUR|GBP|NGN|naira)?\s*([\d,]+(?:\.\d+)?)/i,
		/[\$€£₦¥]\s*([\d,]+(?:\.\d+)?)/,
		/(?:USD|EUR|GBP|NGN)\s*([\d,]+(?:\.\d+)?)/i,
	]);
	if (fields.purchasePrice)
		fields.purchasePrice = fields.purchasePrice.replace(/,/g, "");

	fields.currentValue = first([
		/(?:current\s*value|market\s*value|valuation)\s*[:.]?\s*(?:[\$€£₦¥N]|USD|EUR|GBP|NGN)?\s*([\d,]+(?:\.\d+)?)/i,
	]);
	if (fields.currentValue)
		fields.currentValue = fields.currentValue.replace(/,/g, "");

	// ── Date ──
	// ISO: 2022-06-15
	const isoDate = t.match(/(\d{4}-\d{2}-\d{2})/);
	if (isoDate) {
		fields.purchaseDate = isoDate[1];
	}
	// "15 June 2022", "June 15, 2022"
	const monthNames =
		"January|February|March|April|May|June|July|August|September|October|November|December";
	const monthMap: Record<string, string> = {
		january: "01",
		february: "02",
		march: "03",
		april: "04",
		may: "05",
		june: "06",
		july: "07",
		august: "08",
		september: "09",
		october: "10",
		november: "11",
		december: "12",
	};
	if (!fields.purchaseDate) {
		// "this 15th day of June, 2022" (common in Nigerian legal docs)
		const ordinalDate = t.match(
			new RegExp(
				`(?:this\\s+)?(\\d{1,2})(?:st|nd|rd|th)?\\s+day\\s+of\\s+(${monthNames})[,\\s]+(\\d{4})`,
				"i",
			),
		);
		if (ordinalDate) {
			const m = monthMap[ordinalDate[2].toLowerCase()];
			const d = ordinalDate[1].padStart(2, "0");
			fields.purchaseDate = `${ordinalDate[3]}-${m}-${d}`;
		}
	}
	if (!fields.purchaseDate) {
		// "15 June 2022" or "June 15, 2022"
		const longDate = t.match(
			new RegExp(`(\\d{1,2})\\s+(${monthNames})\\s+(\\d{4})`, "i"),
		);
		if (longDate) {
			const m = monthMap[longDate[2].toLowerCase()];
			const d = longDate[1].padStart(2, "0");
			fields.purchaseDate = `${longDate[3]}-${m}-${d}`;
		}
	}
	if (!fields.purchaseDate) {
		// "June 2022" — day-less, use 1st
		const monthYear = t.match(
			new RegExp(`(${monthNames})[,\\s]+(\\d{4})`, "i"),
		);
		if (monthYear) {
			const m = monthMap[monthYear[1].toLowerCase()];
			fields.purchaseDate = `${monthYear[2]}-${m}-01`;
		}
	}
	if (!fields.purchaseDate) {
		const slashDate = t.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
		if (slashDate) {
			fields.purchaseDate = `${slashDate[3]}-${slashDate[2].padStart(2, "0")}-${slashDate[1].padStart(2, "0")}`;
		}
	}

	// ── Owner / grantee ──
	// "granted to [NAME]", "grantee: [NAME]", "in fav(o)ur of [NAME]",
	// "allocated to [NAME]", "RIGHT OF OCCUPANCY is hereby granted to [NAME]"
	fields.ownerName = first([
		/(?:granted\s+to|right\s+of\s+occupancy\s+.*?granted\s+to)\s+([A-Z][A-Za-z\-'.() ]{2,60}?)(?:\s+(?:of|over|in|at|,|\(|hereinafter))/i,
		/(?:grantee|assignee|lessee|allottee)\s*[:.]?\s*([A-Z][A-Za-z\-'. ]{2,40})/i,
		/(?:owner|purchaser|buyer|allocated\s+to)\s*[:.]?\s*([A-Z][A-Za-z\-'. ]{2,40})/i,
		/(?:in\s+(?:favour|favor)\s+of)\s*[:.]?\s*([A-Z][A-Za-z\-'. ]{2,40})/i,
	]);

	// ── Grantor / seller ──
	fields.boughtFrom = first([
		/(?:grantor|assignor|lessor)\s*[:.]?\s*([A-Z][A-Za-z\-'. ]{2,40})/i,
		/(?:seller|vendor|sold\s+by|transferred\s+from)\s*[:.]?\s*([A-Z][A-Za-z\-'. ]{2,40})/i,
	]);

	// ── Email ──
	const emailMatch = t.match(
		/([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/,
	);
	if (emailMatch) fields.ownerEmail = emailMatch[1];

	// ── Phone ──
	const phoneMatch = t.match(/(\+?\d[\d\s\-]{8,15}\d)/);
	if (phoneMatch) fields.ownerPhone = phoneMatch[1].trim();

	// ── Tax ID / C of O registration number ──
	fields.taxId = first([
		/(?:certificate\s+(?:no|number|#)|c\s*of?\s*o\s*(?:no|number|#)?|registration\s*(?:no|number|#))\s*[:.]?\s*([A-Za-z0-9\-\/]{3,30})/i,
		/(?:file\s*(?:no|number|ref)|reference\s*(?:no|number))\s*[:.]?\s*([A-Za-z0-9\-\/. ]{3,30})/i,
		/(?:tax\s*id|tin)\s*[:.]?\s*([A-Za-z0-9\-\/]{3,25})/i,
	]);

	// ── Zoning / land use ──
	fields.zoning = first([
		/(?:zoning|zone|land\s*use)\s*[:.]?\s*([A-Za-z0-9\- ]{2,25})/i,
	]);

	// ── Property type ──
	if (/commercial/.test(tLower)) fields.propertyType = PropertyType.COMMERCIAL;
	else if (/industrial/.test(tLower))
		fields.propertyType = PropertyType.INDUSTRIAL;
	else if (/agricultur|farm/.test(tLower))
		fields.propertyType = PropertyType.AGRICULTURAL;
	else if (/vacant\s*land|undeveloped|bare\s*land/.test(tLower))
		fields.propertyType = PropertyType.VACANT_LAND;
	else if (/mixed[\s-]*use/.test(tLower))
		fields.propertyType = PropertyType.MIXED_USE;
	else if (/residential|dwelling|house/.test(tLower))
		fields.propertyType = PropertyType.RESIDENTIAL;

	// ── Witnesses ──
	fields.witnesses = first([
		/(?:witness(?:es)?|in\s+the\s+presence\s+of|before\s+(?:us|me))\s*[:.]?\s*([A-Z][A-Za-z\-'. ,&]{2,80})/i,
	]);

	// ── Signatures / signatories ──
	fields.signatures = first([
		/(?:sign(?:ed|atory|atories)|executed\s+by|sealed\s+and\s+delivered)\s*[:.]?\s*([A-Z][A-Za-z\-'. ,&]{2,80})/i,
	]);

	return fields;
}

/* ── AI extraction via server endpoint ────────────────── */

async function extractFieldsWithAI(
	text: string,
): Promise<ExtractedFields | null> {
	try {
		const res = await fetch("/api/extract-fields", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ text }),
		});
		if (!res.ok) {
			console.warn(`[documentExtractor] AI endpoint returned ${res.status}`);
			return null;
		}
		const { fields } = await res.json();
		return fields as ExtractedFields;
	} catch (err) {
		console.warn(
			"[documentExtractor] AI extraction failed, using regex fallback:",
			err,
		);
		return null;
	}
}

/** Extract fields from a single file. Uses AI when available, regex as fallback. */
export async function extractFieldsFromDocument(
	file: File,
): Promise<ExtractedFields> {
	const text = await readTextFromFile(file);

	// Try AI extraction first
	const aiFields = await extractFieldsWithAI(text);
	if (aiFields) {
		const matched = Object.keys(aiFields).filter(
			(k) => aiFields[k as keyof ExtractedFields] !== undefined,
		);
		if (matched.length > 0) return aiFields;
	}

	// Fall back to regex
	const fields = matchTextToFields(text);
	return fields;
}

/** Merge two ExtractedFields — values from `a` take priority. */
export function mergeFields(
	a: ExtractedFields,
	b: ExtractedFields,
): ExtractedFields {
	const merged = { ...a };
	for (const key of Object.keys(b) as (keyof ExtractedFields)[]) {
		if (b[key] !== undefined && !a[key]) {
			(merged as Record<string, unknown>)[key] = b[key];
		}
	}
	return merged;
}
