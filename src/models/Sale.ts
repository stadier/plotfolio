import {
	Bid,
	BidStatus,
	Dispute,
	DisputeStatus,
	DisputeType,
	FeePaidBy,
	FeeType,
	InstallmentStatus,
	Offer,
	OfferStatus,
	OfferType,
	PaymentMethod,
	PlatformCharge,
	PlatformChargeStatus,
	PlatformSettings,
	Sale,
	SaleStatus,
	SaleStep,
	SaleType,
	VerificationRequest,
	VerificationStatus,
} from "@/types/sale";
import mongoose, { Document, Schema } from "mongoose";

/* ─── Sale ────────────────────────────────────────────────────── */

const SaleSignatureSchema = new Schema(
	{
		userId: String,
		name: String,
		signature: String,
		signedAt: String,
	},
	{ _id: false },
);

const SaleWitnessSchema = new Schema(
	{
		name: String,
		email: String,
		signature: String,
		signedAt: String,
	},
	{ _id: false },
);

const InstallmentScheduleItemSchema = new Schema(
	{
		dueDate: String,
		amount: Number,
		status: {
			type: String,
			enum: Object.values(InstallmentStatus),
			default: InstallmentStatus.PENDING,
		},
		paidAt: String,
		reference: String,
	},
	{ _id: false },
);

const InstallmentPlanSchema = new Schema(
	{
		totalAmount: Number,
		downPayment: Number,
		installmentCount: Number,
		installmentAmount: Number,
		startDate: String,
		frequency: {
			type: String,
			enum: ["monthly", "quarterly", "biannual", "annual"],
			default: "monthly",
		},
		schedule: [InstallmentScheduleItemSchema],
		gracePeriodDays: Number,
	},
	{ _id: false },
);

const SaleSchema = new Schema<Sale & Document>(
	{
		id: { type: String, required: true, unique: true },
		type: {
			type: String,
			enum: Object.values(SaleType),
			required: true,
		},
		status: {
			type: String,
			enum: Object.values(SaleStatus),
			default: SaleStatus.DRAFT,
		},
		currentStep: {
			type: String,
			enum: Object.values(SaleStep),
			default: SaleStep.SETUP,
		},

		propertyId: { type: String, required: true, index: true },
		propertyName: String,
		portfolioId: { type: String, index: true },

		sellerId: { type: String, required: true, index: true },
		sellerName: String,
		sellerEmail: String,

		buyerId: { type: String, index: true },
		buyerName: String,
		buyerEmail: String,

		askingPrice: { type: Number, required: true },
		reservePrice: Number,
		currency: { type: String, default: "USD" },

		agreedAmount: Number,

		fees: {
			feeType: {
				type: String,
				enum: Object.values(FeeType),
			},
			feePercent: Number,
			flatFeeAmount: Number,
			tieredFees: [{ upTo: Number, percent: Number }],
			feePaidBy: {
				type: String,
				enum: Object.values(FeePaidBy),
			},
			splitBuyerPercent: Number,
			minFeeAmount: Number,
			maxFeeAmount: Number,
			calculatedFeeAmount: Number,
		},

		settings: {
			requireVerifiedBuyer: { type: Boolean, default: true },
			requireBidDeposit: Boolean,
			bidDepositAmount: Number,
			bidDepositPercent: Number,
			allowInstallments: { type: Boolean, default: false },
			maxInstallmentMonths: Number,
			allowBuyItNow: Boolean,
			buyItNowPrice: Number,
			requireNotarization: Boolean,
			keepAcceptingOffers: Boolean,
			minBidIncrement: Number,
			antiSnipingMinutes: Number,
		},

		acceptedOfferId: String,
		winningBidId: String,

		contractHtml: String,
		contractType: String,

		sellerSignature: SaleSignatureSchema,
		buyerSignature: SaleSignatureSchema,
		witnesses: { type: [SaleWitnessSchema], default: [] },

		paymentMethod: {
			type: String,
			enum: Object.values(PaymentMethod),
		},
		paymentReference: String,
		paymentProofUrl: String,
		paymentConfirmedAt: String,
		paymentConfirmedBy: String,
		installmentPlan: InstallmentPlanSchema,

		sealId: String,
		stampedContractUrl: String,
		stampedAt: String,

		country: String,
		countryClauseTitles: [String],

		auctionStartsAt: String,
		auctionEndsAt: String,

		completedAt: String,
		cancelledAt: String,
		cancelReason: String,
	},
	{ timestamps: true },
);

if (process.env.NODE_ENV !== "production" && mongoose.models.Sale) {
	try {
		mongoose.deleteModel("Sale");
	} catch {
		/* ignore */
	}
}

export const SaleModel =
	(mongoose.models.Sale as mongoose.Model<Sale & Document>) ||
	mongoose.model<Sale & Document>("Sale", SaleSchema);

/* ─── Offer ───────────────────────────────────────────────────── */

const OfferSchema = new Schema<Offer & Document>(
	{
		id: { type: String, required: true, unique: true },
		propertyId: { type: String, required: true, index: true },
		propertyName: String,
		saleId: { type: String, index: true },

		buyerId: { type: String, required: true, index: true },
		buyerName: String,
		buyerEmail: String,
		buyerAvatar: String,

		sellerId: { type: String, required: true, index: true },

		status: {
			type: String,
			enum: Object.values(OfferStatus),
			default: OfferStatus.PENDING,
		},
		offerType: {
			type: String,
			enum: Object.values(OfferType),
			default: OfferType.PURCHASE,
		},

		amount: { type: Number, required: true },
		currency: { type: String, default: "USD" },

		paymentType: {
			type: String,
			enum: ["full", "installment"],
			default: "full",
		},
		installmentPlan: InstallmentPlanSchema,

		message: String,
		counterAmount: Number,
		counterMessage: String,
		counteredAt: String,
		rejectedAt: String,
		acceptedAt: String,
		withdrawnAt: String,

		expiresAt: String,
	},
	{ timestamps: true },
);

if (process.env.NODE_ENV !== "production" && mongoose.models.Offer) {
	try {
		mongoose.deleteModel("Offer");
	} catch {
		/* ignore */
	}
}

export const OfferModel =
	(mongoose.models.Offer as mongoose.Model<Offer & Document>) ||
	mongoose.model<Offer & Document>("Offer", OfferSchema);

/* ─── Bid ─────────────────────────────────────────────────────── */

const BidSchema = new Schema<Bid & Document>(
	{
		id: { type: String, required: true, unique: true },
		saleId: { type: String, required: true, index: true },
		propertyId: { type: String, required: true, index: true },
		bidderId: { type: String, required: true, index: true },
		bidderName: String,
		bidderAvatar: String,
		amount: { type: Number, required: true },
		currency: String,
		status: {
			type: String,
			enum: Object.values(BidStatus),
			default: BidStatus.ACTIVE,
		},
		depositHeld: Boolean,
		depositPaymentIntentId: String,
	},
	{ timestamps: true },
);

if (process.env.NODE_ENV !== "production" && mongoose.models.Bid) {
	try {
		mongoose.deleteModel("Bid");
	} catch {
		/* ignore */
	}
}

export const BidModel =
	(mongoose.models.Bid as mongoose.Model<Bid & Document>) ||
	mongoose.model<Bid & Document>("Bid", BidSchema);

/* ─── Dispute ─────────────────────────────────────────────────── */

const DisputeEvidenceSchema = new Schema(
	{
		url: String,
		type: String,
		caption: String,
		uploadedAt: String,
		uploadedBy: String,
	},
	{ _id: false },
);

const DisputeSchema = new Schema<Dispute & Document>(
	{
		id: { type: String, required: true, unique: true },
		saleId: { type: String, index: true },
		offerId: String,
		propertyId: { type: String, index: true },
		raisedById: { type: String, required: true, index: true },
		raisedByName: String,
		againstUserId: { type: String, index: true },
		againstName: String,
		type: {
			type: String,
			enum: Object.values(DisputeType),
			required: true,
		},
		status: {
			type: String,
			enum: Object.values(DisputeStatus),
			default: DisputeStatus.OPEN,
		},
		description: { type: String, required: true },
		resolution: String,
		resolvedAt: String,
		resolvedBy: String,
		evidence: { type: [DisputeEvidenceSchema], default: [] },
	},
	{ timestamps: true },
);

if (process.env.NODE_ENV !== "production" && mongoose.models.Dispute) {
	try {
		mongoose.deleteModel("Dispute");
	} catch {
		/* ignore */
	}
}

export const DisputeModel =
	(mongoose.models.Dispute as mongoose.Model<Dispute & Document>) ||
	mongoose.model<Dispute & Document>("Dispute", DisputeSchema);

/* ─── Platform Settings (singleton) ───────────────────────────── */

const PlatformSettingsSchema = new Schema<PlatformSettings & Document>(
	{
		id: { type: String, required: true, unique: true },
		feeType: {
			type: String,
			enum: Object.values(FeeType),
		},
		feePercent: Number,
		flatFeeAmount: Number,
		tieredFees: [{ upTo: Number, percent: Number }],
		feePaidBy: {
			type: String,
			enum: Object.values(FeePaidBy),
		},
		splitBuyerPercent: Number,
		minFeeAmount: Number,
		maxFeeAmount: Number,
		auctionFeeType: {
			type: String,
			enum: Object.values(FeeType),
		},
		auctionFeePercent: Number,
		auctionFlatFeeAmount: Number,
		auctionTieredFees: [{ upTo: Number, percent: Number }],
		autoApproveVerifications: Boolean,
		verificationRequiredForBidding: Boolean,
		verificationRequiredForOffers: Boolean,
		defaultCurrency: String,
		updatedBy: String,
	},
	{ timestamps: true },
);

if (process.env.NODE_ENV !== "production" && mongoose.models.PlatformSettings) {
	try {
		mongoose.deleteModel("PlatformSettings");
	} catch {
		/* ignore */
	}
}

export const PlatformSettingsModel =
	(mongoose.models.PlatformSettings as mongoose.Model<
		PlatformSettings & Document
	>) ||
	mongoose.model<PlatformSettings & Document>(
		"PlatformSettings",
		PlatformSettingsSchema,
	);

/* ─── Platform Charge ─────────────────────────────────────────── */

const PlatformChargeSchema = new Schema<PlatformCharge & Document>(
	{
		id: { type: String, required: true, unique: true },
		saleId: { type: String, required: true, index: true },
		payerId: { type: String, required: true, index: true },
		amount: Number,
		currency: String,
		gateway: {
			type: String,
			enum: ["stripe", "paystack", "flutterwave", "manual"],
		},
		paymentIntentId: String,
		transferId: String,
		status: {
			type: String,
			enum: Object.values(PlatformChargeStatus),
			default: PlatformChargeStatus.PENDING,
		},
		collectedAt: String,
	},
	{ timestamps: true },
);

if (process.env.NODE_ENV !== "production" && mongoose.models.PlatformCharge) {
	try {
		mongoose.deleteModel("PlatformCharge");
	} catch {
		/* ignore */
	}
}

export const PlatformChargeModel =
	(mongoose.models.PlatformCharge as mongoose.Model<
		PlatformCharge & Document
	>) ||
	mongoose.model<PlatformCharge & Document>(
		"PlatformCharge",
		PlatformChargeSchema,
	);

/* ─── Verification Request ────────────────────────────────────── */

const VerificationRequestSchema = new Schema<VerificationRequest & Document>(
	{
		id: { type: String, required: true, unique: true },
		userId: { type: String, required: true, index: true },
		userName: String,
		userEmail: String,
		documentUrl: String,
		documentType: String,
		notes: String,
		status: {
			type: String,
			enum: Object.values(VerificationStatus),
			default: VerificationStatus.PENDING,
		},
		submittedAt: String,
		reviewedAt: String,
		reviewedBy: String,
		rejectionReason: String,
	},
	{ timestamps: true },
);

if (
	process.env.NODE_ENV !== "production" &&
	mongoose.models.VerificationRequest
) {
	try {
		mongoose.deleteModel("VerificationRequest");
	} catch {
		/* ignore */
	}
}

export const VerificationRequestModel =
	(mongoose.models.VerificationRequest as mongoose.Model<
		VerificationRequest & Document
	>) ||
	mongoose.model<VerificationRequest & Document>(
		"VerificationRequest",
		VerificationRequestSchema,
	);
