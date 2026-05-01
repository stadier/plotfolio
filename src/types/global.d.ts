declare module "*.css";

declare module "pdf-parse/lib/pdf-parse.js" {
	interface PdfParseResult {
		text?: string;
	}

	type PdfParse = (dataBuffer: Buffer) => Promise<PdfParseResult>;

	const pdfParse: PdfParse;
	export default pdfParse;
}
