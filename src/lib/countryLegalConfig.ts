/**
 * Country-specific legal configuration for sale contracts.
 *
 * Lookup by ISO-2 code (e.g. "NG", "US"). When a Sale is created the
 * relevant country's clauses are appended to the generated contract
 * and `requiresNotarization` is reflected on Sale.settings.
 */

import { CountryLegalConfig } from "@/types/sale";

export const COUNTRY_LEGAL_CONFIGS: Record<string, CountryLegalConfig> = {
	NG: {
		country: "NG",
		displayName: "Nigeria",
		jurisdiction: "Federal Republic of Nigeria",
		currencyDefault: "NGN",
		requiresNotarization: false,
		requiresGovernmentConsent: true,
		governmentConsentNote:
			"Transactions involving land in Nigeria typically require Governor's Consent under the Land Use Act 1978. Buyer and seller acknowledge their joint responsibility to obtain such consent.",
		clauses: [
			{
				title: "Right of Occupancy",
				body: "The Parties acknowledge that all land in Nigeria is vested in the Governor of the relevant State pursuant to the Land Use Act 1978, and that what is being transferred is a right of occupancy and the unexpired residue thereof, subject to the Governor's consent where applicable.",
			},
			{
				title: "Stamp Duty",
				body: "The Parties acknowledge that this instrument is liable to stamp duty under the Stamp Duties Act, and the Buyer shall be responsible for the payment of all stamp duties unless otherwise agreed in writing.",
			},
			{
				title: "Governor's Consent",
				body: "Where required, the Parties shall jointly procure the consent of the Governor of the State in which the property is situated, and the cost of obtaining such consent shall be borne by the Buyer unless otherwise agreed.",
			},
		],
	},
	GH: {
		country: "GH",
		displayName: "Ghana",
		jurisdiction: "Republic of Ghana",
		currencyDefault: "GHS",
		requiresNotarization: false,
		clauses: [
			{
				title: "Land Title Registration",
				body: "The Buyer shall, at their own expense, register this transaction with the Lands Commission in accordance with the Land Act, 2020 (Act 1036) of Ghana.",
			},
			{
				title: "Stamp Duty",
				body: "The Buyer shall pay all stamp duty payable on this instrument under the Stamp Duty Act, 2005 (Act 689).",
			},
		],
	},
	KE: {
		country: "KE",
		displayName: "Kenya",
		jurisdiction: "Republic of Kenya",
		currencyDefault: "KES",
		requiresNotarization: false,
		clauses: [
			{
				title: "Land Control Board Consent",
				body: "Where this transaction relates to agricultural land, it shall be subject to the consent of the relevant Land Control Board pursuant to the Land Control Act (Cap 302) of Kenya.",
			},
			{
				title: "Stamp Duty",
				body: "The Buyer shall pay stamp duty at the prevailing rate under the Stamp Duty Act (Cap 480).",
			},
		],
	},
	ZA: {
		country: "ZA",
		displayName: "South Africa",
		jurisdiction: "Republic of South Africa",
		currencyDefault: "ZAR",
		requiresNotarization: true,
		clauses: [
			{
				title: "Conveyancing",
				body: "Transfer of the Property shall be effected by a duly admitted conveyancer in the relevant Deeds Registry in accordance with the Deeds Registries Act 47 of 1937. All conveyancing costs shall be for the account of the Buyer unless otherwise agreed.",
			},
			{
				title: "Transfer Duty / VAT",
				body: "Transfer Duty (or VAT, where applicable) shall be paid by the Buyer in accordance with the Transfer Duty Act 40 of 1949 and/or the Value-Added Tax Act 89 of 1991.",
			},
		],
	},
	US: {
		country: "US",
		displayName: "United States",
		jurisdiction: "United States of America",
		currencyDefault: "USD",
		requiresNotarization: true,
		clauses: [
			{
				title: "Title Insurance",
				body: "The Parties agree that title insurance shall be obtained at closing, with the cost borne by the Buyer unless local custom in the property's jurisdiction provides otherwise.",
			},
			{
				title: "Recording",
				body: "The deed shall be recorded with the appropriate County Recorder's office in the county where the Property is located. Recording fees shall be paid by the Buyer.",
			},
			{
				title: "Disclosures",
				body: "The Seller has made all disclosures required by applicable State and Federal law, including but not limited to lead-based paint disclosures (where applicable under 42 U.S.C. \u00a7 4852d) and any State-mandated property condition disclosures.",
			},
		],
	},
	UK: {
		country: "UK",
		displayName: "United Kingdom",
		jurisdiction: "United Kingdom",
		currencyDefault: "GBP",
		requiresNotarization: false,
		clauses: [
			{
				title: "Land Registration",
				body: "The Buyer shall register this transfer at HM Land Registry within the period prescribed by the Land Registration Act 2002. Registration fees shall be borne by the Buyer.",
			},
			{
				title: "Stamp Duty Land Tax",
				body: "The Buyer shall pay all Stamp Duty Land Tax (or, in Scotland, Land and Buildings Transaction Tax; or, in Wales, Land Transaction Tax) payable on this transaction.",
			},
		],
	},
	AE: {
		country: "AE",
		displayName: "United Arab Emirates",
		jurisdiction: "United Arab Emirates",
		currencyDefault: "AED",
		requiresNotarization: true,
		clauses: [
			{
				title: "Registration with Land Department",
				body: "Title transfer is subject to registration with the relevant Emirate's Land Department (e.g. Dubai Land Department). Transfer and registration fees shall be borne by the Buyer unless otherwise agreed.",
			},
		],
	},
};

export function getCountryLegalConfig(
	country?: string,
): CountryLegalConfig | undefined {
	if (!country) return undefined;
	return COUNTRY_LEGAL_CONFIGS[country.toUpperCase()];
}

export function listSupportedCountries(): CountryLegalConfig[] {
	return Object.values(COUNTRY_LEGAL_CONFIGS);
}
