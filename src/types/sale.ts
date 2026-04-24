/**
 * Types for the Sales / Auctions / Offers / Disputes / Verification system.
 *
 * Flow overview:
 *   Property → Sale (private_sale | auction) → Offer/Bid → Contract →
 *   Signing → Payment → Stamping → Ownership Transfer + History
 *
 * A Sale is the transaction container. Offers can exist independently
 * (buyer-initiated on any FOR_SALE property) and accepting an Offer
 * auto-creates a Sale.
 */

/* ─── Sale ────────────────────────────────────────────────────── */

export enum SaleType {
	PRIVATE_SALE = "private_sale",
	AUCTION = "auction",
}

export enum SaleStatus {
	DRAFT = "draft",
	ACTIVE = "active", // listed / accepting offers or bids
	UNDER_OFFER = "under_offer", // an offer has been accepted, contract pending
	UNDER_CONTRACT = "under_contract", // contract generated, awaiting signing
	SIGNING = "signing", // one party has signed, waiting for the other
	AWAITING_PAYMENT = "awaiting_payment", // both signed, waiting for payment
	PAYMENT_RECEIVED = "payment_received", // payment confirmed, awaiting stamping
	STAMPING = "stamping", // contract being stamped/issued
	COMPLETED = "completed", // ownership transferred, history updated
	CANCELLED = "cancelled",
	DISPUTED = "disputed",
}

/** Computed step index for the wizard UI */
export enum SaleStep {
	SETUP = "setup",
	INVITE = "invite",
	OFFER_REVIEW = "offer_review",
	CONTRACT = "contract",
	SIGNING = "signing",
	PAYMENT = "payment",
	STAMPING = "stamping",
	TRANSFER = "transfer",
	COMPLETE = "complete",
}

export enum PaymentMethod {
	PLATFORM_STRIPE = "platform_stripe",
	PLATFORM_PAYSTACK = "platform_paystack",
	PLATFORM_FLUTTERWAVE = "platform_flutterwave",
	BANK_TRANSFER = "bank_transfer",
	WIRE = "wire",
	CASH = "cash",
	OTHER = "other",
}

export enum FeeType {
	PERCENTAGE = "percentage",
	FLAT = "flat",
	TIERED = "tiered",
}

export enum FeePaidBy {
	BUYER = "buyer",
	SELLER = "seller",
	SPLIT = "split",
}

/** Settings configurable by the seller per Sale */
export interface SaleSettings {
	/** Only verified users can place bids / make offers (default true) */
	requireVerifiedBuyer: boolean;
	/** Auction bidders must place a refundable deposit to bid */
	requireBidDeposit?: boolean;
	bidDepositAmount?: number;
	bidDepositPercent?: number;
	/** Allow installment payment offers */
	allowInstallments: boolean;
	maxInstallmentMonths?: number;
	/** Auction: bypass bidding with a fixed buy-it-now price */
	allowBuyItNow?: boolean;
	buyItNowPrice?: number;
	/** Country-driven: contract requires notarised upload after signing */
	requireNotarization?: boolean;
	/** Continue accepting offers even after a sale enters under-contract */
	keepAcceptingOffers?: boolean;
	/** Auction: minimum increment between bids */
	minBidIncrement?: number;
	/** Auction: auto-extend window if a bid lands in final N minutes */
	antiSnipingMinutes?: number;
}

/** Snapshot of platform fee config taken at Sale creation time */
export interface SaleFeeSnapshot {
	feeType: FeeType;
	feePercent?: number;
	flatFeeAmount?: number;
	tieredFees?: { upTo: number; percent: number }[];
	feePaidBy: FeePaidBy;
	splitBuyerPercent?: number;
	minFeeAmount?: number;
	maxFeeAmount?: number;
	/** Calculated final fee once amount is known */
	calculatedFeeAmount?: number;
}

export interface SaleSignature {
	userId: string;
	name: string;
	signature: string; // data URL of drawn signature
	signedAt: string;
}

export interface SaleWitness {
	name: string;
	email?: string;
	signature?: string;
	signedAt?: string;
}

export interface Sale {
	id: string;
	type: SaleType;
	status: SaleStatus;
	currentStep: SaleStep;

	propertyId: string;
	propertyName?: string;
	portfolioId?: string;

	sellerId: string;
	sellerName: string;
	sellerEmail: string;

	buyerId?: string; // null until a buyer is locked in
	buyerName?: string;
	buyerEmail?: string;

	/** Asking price (private sale) or starting price (auction) */
	askingPrice: number;
	/** Auction reserve — minimum to trigger sale */
	reservePrice?: number;
	currency: string;

	/** Final agreed amount once an offer/bid is accepted */
	agreedAmount?: number;

	/** Snapshot of platform fee config at creation */
	fees: SaleFeeSnapshot;

	settings: SaleSettings;

	/** Linked offer that created this sale (if any) */
	acceptedOfferId?: string;
	/** Auction: linked winning bid */
	winningBidId?: string;

	/** Generated unsigned contract */
	contractHtml?: string;
	contractType?: string;

	/** Signing */
	sellerSignature?: SaleSignature;
	buyerSignature?: SaleSignature;
	witnesses: SaleWitness[];

	/** Payment */
	paymentMethod?: PaymentMethod;
	paymentReference?: string;
	paymentProofUrl?: string;
	paymentConfirmedAt?: string;
	paymentConfirmedBy?: string;
	/** Linked accepted Offer's installment plan (if applicable) */
	installmentPlan?: InstallmentPlan;

	/** Stamping */
	sealId?: string;
	stampedContractUrl?: string;
	stampedAt?: string;

	/** Country legal config snapshot applied to the contract */
	country?: string;
	countryClauseTitles?: string[];

	/** Auction window */
	auctionStartsAt?: string;
	auctionEndsAt?: string;

	completedAt?: string;
	cancelledAt?: string;
	cancelReason?: string;

	createdAt?: string;
	updatedAt?: string;
}

/* ─── Offer ───────────────────────────────────────────────────── */

export enum OfferStatus {
	PENDING = "pending",
	COUNTERED = "countered",
	ACCEPTED = "accepted",
	REJECTED = "rejected",
	WITHDRAWN = "withdrawn",
	EXPIRED = "expired",
}

export enum OfferType {
	PURCHASE = "purchase",
	LEASE = "lease",
	RENT = "rent",
}

export enum InstallmentStatus {
	PENDING = "pending",
	PAID = "paid",
	OVERDUE = "overdue",
	WAIVED = "waived",
}

export interface InstallmentScheduleItem {
	dueDate: string; // ISO date
	amount: number;
	status: InstallmentStatus;
	paidAt?: string;
	reference?: string;
}

export interface InstallmentPlan {
	totalAmount: number;
	downPayment: number;
	installmentCount: number;
	installmentAmount: number;
	startDate: string;
	frequency: "monthly" | "quarterly" | "biannual" | "annual";
	schedule: InstallmentScheduleItem[];
	/** Grace period in days before installment is marked overdue */
	gracePeriodDays?: number;
}

export interface Offer {
	id: string;
	propertyId: string;
	propertyName?: string;
	saleId?: string; // linked sale (created on accept if not present)

	buyerId: string;
	buyerName: string;
	buyerEmail: string;
	buyerAvatar?: string;

	sellerId: string;

	status: OfferStatus;
	offerType: OfferType;

	amount: number;
	currency: string;

	paymentType: "full" | "installment";
	installmentPlan?: InstallmentPlan;

	message?: string;
	counterAmount?: number;
	counterMessage?: string;
	counteredAt?: string;
	rejectedAt?: string;
	acceptedAt?: string;
	withdrawnAt?: string;

	expiresAt?: string;

	createdAt?: string;
	updatedAt?: string;
}

/* ─── Bid (auction) ───────────────────────────────────────────── */

export enum BidStatus {
	ACTIVE = "active",
	OUTBID = "outbid",
	WITHDRAWN = "withdrawn",
	WON = "won",
	LOST = "lost",
}

export interface Bid {
	id: string;
	saleId: string;
	propertyId: string;
	bidderId: string;
	bidderName: string;
	bidderAvatar?: string;
	amount: number;
	currency: string;
	status: BidStatus;
	depositHeld?: boolean;
	depositPaymentIntentId?: string;
	createdAt?: string;
}

/* ─── Dispute ─────────────────────────────────────────────────── */

export enum DisputeType {
	PAYMENT = "payment",
	TITLE = "title",
	CONDITION = "condition",
	CONTRACT = "contract",
	INSTALLMENT_MISSED = "installment_missed",
	OTHER = "other",
}

export enum DisputeStatus {
	OPEN = "open",
	UNDER_REVIEW = "under_review",
	RESOLVED = "resolved",
	ESCALATED = "escalated",
	WITHDRAWN = "withdrawn",
}

export interface DisputeEvidence {
	url: string;
	type: string;
	caption?: string;
	uploadedAt: string;
	uploadedBy: string;
}

export interface Dispute {
	id: string;
	saleId?: string;
	offerId?: string;
	propertyId?: string;
	raisedById: string;
	raisedByName: string;
	againstUserId?: string;
	againstName?: string;
	type: DisputeType;
	status: DisputeStatus;
	description: string;
	resolution?: string;
	resolvedAt?: string;
	resolvedBy?: string;
	evidence: DisputeEvidence[];
	createdAt?: string;
	updatedAt?: string;
}

/* ─── Platform Settings (singleton, admin-controlled) ─────────── */

export interface TieredFee {
	upTo: number; // amount cap for this tier (use Infinity for last)
	percent: number;
}

export interface PlatformSettings {
	id: string; // singleton — fixed id "platform"

	// Private sale fees
	feeType: FeeType;
	feePercent?: number;
	flatFeeAmount?: number;
	tieredFees?: TieredFee[];
	feePaidBy: FeePaidBy;
	splitBuyerPercent?: number;
	minFeeAmount?: number;
	maxFeeAmount?: number;

	// Auction-specific fees (defaults to private sale config if absent)
	auctionFeeType?: FeeType;
	auctionFeePercent?: number;
	auctionFlatFeeAmount?: number;
	auctionTieredFees?: TieredFee[];

	// Verification
	autoApproveVerifications?: boolean;
	verificationRequiredForBidding?: boolean;
	verificationRequiredForOffers?: boolean;

	// Currency / display
	defaultCurrency?: string;

	updatedAt?: string;
	updatedBy?: string;
}

/* ─── Platform Charge (audit log of fees collected) ───────────── */

export enum PlatformChargeStatus {
	PENDING = "pending",
	COLLECTED = "collected",
	REFUNDED = "refunded",
	FAILED = "failed",
}

export interface PlatformCharge {
	id: string;
	saleId: string;
	payerId: string;
	amount: number;
	currency: string;
	gateway: "stripe" | "paystack" | "flutterwave" | "manual";
	paymentIntentId?: string;
	transferId?: string;
	status: PlatformChargeStatus;
	collectedAt?: string;
	createdAt?: string;
	updatedAt?: string;
}

/* ─── User Verification ───────────────────────────────────────── */

export enum VerificationStatus {
	UNVERIFIED = "unverified",
	PENDING = "pending",
	VERIFIED = "verified",
	REJECTED = "rejected",
}

export enum VerificationMethod {
	IDENTITY_DOC = "identity_doc",
	ADMIN_APPROVED = "admin_approved",
	PHONE = "phone",
	MANUAL = "manual",
}

export interface VerificationRequest {
	id: string;
	userId: string;
	userName: string;
	userEmail: string;
	documentUrl?: string;
	documentType?: string; // e.g. "passport", "drivers_license", "national_id"
	notes?: string;
	status: VerificationStatus;
	submittedAt: string;
	reviewedAt?: string;
	reviewedBy?: string;
	rejectionReason?: string;
}

/* ─── Country Legal Config ────────────────────────────────────── */

export interface CountryLegalClause {
	title: string;
	body: string;
}

export interface CountryLegalConfig {
	country: string; // ISO-2 code (e.g. "NG", "US")
	displayName: string;
	jurisdiction?: string;
	currencyDefault: string;
	requiresNotarization: boolean;
	requiresGovernmentConsent?: boolean;
	governmentConsentNote?: string;
	clauses: CountryLegalClause[];
}
