import {
	BillingInterval,
	PaymentGatewayType,
	SubscriptionStatus,
	SubscriptionTier,
} from "@/types/subscription";
import mongoose, { Document, Schema } from "mongoose";

export interface ISubscription {
	id: string;
	userId: string;
	tier: SubscriptionTier;
	status: SubscriptionStatus;
	billingInterval: BillingInterval;
	gateway: PaymentGatewayType;
	gatewayCustomerId: string;
	gatewaySubscriptionId: string;
	currentPeriodStart: Date;
	currentPeriodEnd: Date;
	cancelAtPeriodEnd: boolean;
	trialEnd?: Date;
}

const SubscriptionSchema = new Schema<ISubscription & Document>(
	{
		id: { type: String, required: true, unique: true },
		userId: { type: String, required: true, index: true },
		tier: {
			type: String,
			enum: Object.values(SubscriptionTier),
			required: true,
			default: SubscriptionTier.FREE,
		},
		status: {
			type: String,
			enum: Object.values(SubscriptionStatus),
			required: true,
			default: SubscriptionStatus.ACTIVE,
		},
		billingInterval: {
			type: String,
			enum: Object.values(BillingInterval),
			default: BillingInterval.MONTHLY,
		},
		gateway: {
			type: String,
			enum: Object.values(PaymentGatewayType),
		},
		gatewayCustomerId: { type: String },
		gatewaySubscriptionId: { type: String },
		currentPeriodStart: { type: Date },
		currentPeriodEnd: { type: Date },
		cancelAtPeriodEnd: { type: Boolean, default: false },
		trialEnd: { type: Date },
	},
	{ timestamps: true },
);

// Only one active subscription per user
SubscriptionSchema.index(
	{ userId: 1 },
	{
		unique: true,
		partialFilterExpression: {
			status: {
				$in: [
					SubscriptionStatus.ACTIVE,
					SubscriptionStatus.TRIALING,
					SubscriptionStatus.PAST_DUE,
				],
			},
		},
	},
);

if (process.env.NODE_ENV !== "production" && mongoose.models.Subscription) {
	try {
		mongoose.deleteModel("Subscription");
	} catch {
		/* ignore */
	}
}

export const SubscriptionModel = mongoose.model<ISubscription & Document>(
	"Subscription",
	SubscriptionSchema,
);
