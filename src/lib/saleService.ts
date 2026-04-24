/**
 * Sale service — business logic for creating/transitioning sales.
 * Wraps Mongoose model writes with the right side-effects:
 *   - Snapshotting fee config and country legal config at creation
 *   - Updating Property.status when status transitions occur
 *   - Creating OwnershipTransfer + OwnershipRecord on completion
 */

import { getCountryLegalConfig } from "@/lib/countryLegalConfig";
import connectDB from "@/lib/mongoose";
import {
	buildFeeSnapshot,
	calculateFee,
	DEFAULT_PLATFORM_SETTINGS,
} from "@/lib/saleFees";
import { OwnershipRecordModel } from "@/models/OwnershipRecord";
import { OwnershipTransferModel } from "@/models/OwnershipTransfer";
import { PropertyModel } from "@/models/Property";
import { OfferModel, PlatformSettingsModel, SaleModel } from "@/models/Sale";
import { IUser, UserModel } from "@/models/User";
import { PropertyStatus, TransferStatus } from "@/types/property";
import {
	OfferStatus,
	PlatformSettings,
	Sale,
	SaleStatus,
	SaleStep,
	SaleType,
} from "@/types/sale";
import crypto from "crypto";

/** Get current platform settings, falling back to defaults. */
export async function getPlatformSettings(): Promise<PlatformSettings> {
	await connectDB();
	const existing = await PlatformSettingsModel.findOne({
		id: "platform",
	}).lean<PlatformSettings | null>();
	if (existing) return existing;
	return { id: "platform", ...DEFAULT_PLATFORM_SETTINGS } as PlatformSettings;
}

interface CreateSaleInput {
	type: SaleType;
	propertyId: string;
	sellerId: string;
	askingPrice: number;
	reservePrice?: number;
	currency?: string;
	settings?: Partial<Sale["settings"]>;
	auctionStartsAt?: string;
	auctionEndsAt?: string;
	acceptedOfferId?: string;
	buyerId?: string;
	agreedAmount?: number;
}

export async function createSale(input: CreateSaleInput): Promise<Sale> {
	await connectDB();

	const property = await PropertyModel.findOne({
		id: input.propertyId,
	}).lean<any>();
	if (!property) throw new Error("Property not found");

	const seller = await UserModel.findOne({
		id: input.sellerId,
	}).lean<IUser | null>();
	if (!seller) throw new Error("Seller not found");

	const settings = await getPlatformSettings();
	const fees = buildFeeSnapshot(settings, input.type);

	const country = property.country;
	const legal = getCountryLegalConfig(country);

	const buyer = input.buyerId
		? await UserModel.findOne({ id: input.buyerId }).lean<IUser | null>()
		: null;

	const sale = await SaleModel.create({
		id: crypto.randomUUID(),
		type: input.type,
		status: input.acceptedOfferId ? SaleStatus.UNDER_OFFER : SaleStatus.ACTIVE,
		currentStep: input.acceptedOfferId
			? SaleStep.CONTRACT
			: input.type === SaleType.AUCTION
				? SaleStep.OFFER_REVIEW
				: SaleStep.INVITE,
		propertyId: input.propertyId,
		propertyName: property.name,
		portfolioId: property.portfolioId,
		sellerId: input.sellerId,
		sellerName: seller.displayName || seller.name,
		sellerEmail: seller.email,
		buyerId: input.buyerId,
		buyerName: buyer?.displayName || buyer?.name,
		buyerEmail: buyer?.email,
		askingPrice: input.askingPrice,
		reservePrice: input.reservePrice,
		currency:
			input.currency ?? legal?.currencyDefault ?? settings.defaultCurrency,
		agreedAmount: input.agreedAmount,
		fees,
		settings: {
			requireVerifiedBuyer: true,
			allowInstallments: false,
			requireNotarization: legal?.requiresNotarization ?? false,
			...input.settings,
		},
		acceptedOfferId: input.acceptedOfferId,
		country,
		countryClauseTitles: legal?.clauses.map((c) => c.title) ?? [],
		auctionStartsAt: input.auctionStartsAt,
		auctionEndsAt: input.auctionEndsAt,
		witnesses: [],
	});

	// Mark property as UNDER_CONTRACT (or keep FOR_SALE for active auctions
	// where seller wants to keep accepting offers — controlled by settings)
	if (input.acceptedOfferId) {
		await PropertyModel.updateOne(
			{ id: input.propertyId },
			{ $set: { status: PropertyStatus.UNDER_CONTRACT } },
		);
	} else if (input.type === SaleType.AUCTION) {
		await PropertyModel.updateOne(
			{ id: input.propertyId },
			{ $set: { status: PropertyStatus.FOR_SALE } },
		);
	}

	const obj = sale.toObject();
	const { _id, __v, ...clean } = obj as any;
	return clean as Sale;
}

/** Accept an offer — creates a Sale (or links to existing draft sale). */
export async function acceptOffer(
	offerId: string,
	actingUserId: string,
): Promise<{ sale: Sale; offerId: string }> {
	await connectDB();
	const offer = await OfferModel.findOne({ id: offerId });
	if (!offer) throw new Error("Offer not found");
	if (offer.sellerId !== actingUserId)
		throw new Error("Only the seller can accept this offer");
	if (
		offer.status !== OfferStatus.PENDING &&
		offer.status !== OfferStatus.COUNTERED
	)
		throw new Error("Offer is not in an acceptable state");

	offer.status = OfferStatus.ACCEPTED;
	offer.acceptedAt = new Date().toISOString();
	await offer.save();

	// Reject all other pending offers on the same property unless seller
	// chose keepAcceptingOffers
	let sale: Sale;
	if (offer.saleId) {
		const existing = await SaleModel.findOne({ id: offer.saleId });
		if (!existing) throw new Error("Linked sale not found");
		existing.buyerId = offer.buyerId;
		existing.buyerName = offer.buyerName;
		existing.buyerEmail = offer.buyerEmail;
		existing.agreedAmount = offer.amount;
		existing.installmentPlan = offer.installmentPlan;
		existing.status = SaleStatus.UNDER_OFFER;
		existing.currentStep = SaleStep.CONTRACT;
		await existing.save();
		const obj = existing.toObject();
		const { _id, __v, ...clean } = obj as any;
		sale = clean as Sale;
	} else {
		sale = await createSale({
			type: SaleType.PRIVATE_SALE,
			propertyId: offer.propertyId,
			sellerId: offer.sellerId,
			askingPrice: offer.amount,
			buyerId: offer.buyerId,
			agreedAmount: offer.amount,
			currency: offer.currency,
			acceptedOfferId: offer.id,
			settings: {
				allowInstallments: offer.paymentType === "installment",
			},
		});
		offer.saleId = sale.id;
		await offer.save();
	}

	return { sale, offerId: offer.id };
}

/** Mark sale completed — perform ownership transfer + create record. */
export async function completeSale(saleId: string): Promise<Sale> {
	await connectDB();
	const sale = await SaleModel.findOne({ id: saleId });
	if (!sale) throw new Error("Sale not found");
	if (sale.status === SaleStatus.COMPLETED) {
		const obj = sale.toObject();
		const { _id, __v, ...clean } = obj as any;
		return clean as Sale;
	}

	if (!sale.buyerId) throw new Error("Sale has no buyer");

	const property = await PropertyModel.findOne({ id: sale.propertyId });
	if (!property) throw new Error("Property not found");

	const buyer = await UserModel.findOne({
		id: sale.buyerId,
	}).lean<IUser | null>();
	if (!buyer) throw new Error("Buyer user not found");

	const finalAmount = sale.agreedAmount ?? sale.askingPrice;

	// Calculate platform fee
	const feeAmount = calculateFee(sale.fees, finalAmount);
	sale.fees.calculatedFeeAmount = feeAmount;

	// Create OwnershipTransfer (record-of-truth for the change)
	const transferId = crypto.randomUUID();
	await OwnershipTransferModel.create({
		id: transferId,
		propertyId: sale.propertyId,
		propertyName: sale.propertyName ?? property.name,
		fromUserId: sale.sellerId,
		fromName: sale.sellerName,
		fromEmail: sale.sellerEmail,
		toUserId: sale.buyerId,
		toName: sale.buyerName ?? buyer.displayName,
		toEmail: sale.buyerEmail ?? buyer.email,
		status: TransferStatus.COMPLETED,
		price: finalAmount,
		transferDate: new Date().toISOString(),
		message: `Auto-completed via Sale ${sale.id}`,
	});

	// Create OwnershipRecord (history)
	await OwnershipRecordModel.create({
		id: crypto.randomUUID(),
		propertyId: sale.propertyId,
		ownerId: sale.buyerId,
		ownerName: sale.buyerName ?? buyer.displayName,
		ownerEmail: sale.buyerEmail ?? buyer.email,
		ownerType: buyer.type ?? "individual",
		acquiredDate: new Date().toISOString(),
		acquisitionMethod: "purchase",
		price: finalAmount,
		transferId,
	});

	// Update property owner + status
	property.owner = {
		id: buyer.id,
		name: buyer.name,
		username: buyer.username,
		displayName: buyer.displayName,
		email: buyer.email,
		phone: buyer.phone,
		avatar: buyer.avatar,
		banner: buyer.banner,
		type: buyer.type,
	} as any;
	property.status = PropertyStatus.OWNED;
	property.soldPrice = finalAmount;
	property.soldDate = new Date() as any;
	property.boughtFrom = sale.sellerName;
	await property.save();

	sale.status = SaleStatus.COMPLETED;
	sale.currentStep = SaleStep.COMPLETE;
	sale.completedAt = new Date().toISOString();
	await sale.save();

	const obj = sale.toObject();
	const { _id, __v, ...clean } = obj as any;
	return clean as Sale;
}
