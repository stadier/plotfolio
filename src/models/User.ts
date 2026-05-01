import { ProviderSettings } from "@/types/providers";
import { VerificationMethod, VerificationStatus } from "@/types/sale";
import {
	LetterheadConfig,
	SealConfig,
	SealShape,
	WatermarkConfig,
} from "@/types/seal";
import crypto from "crypto";
import mongoose, { Document, Schema } from "mongoose";

export interface IUser {
	id: string;
	name: string;
	username: string;
	displayName: string;
	email: string;
	passwordHash: string;
	avatar?: string;
	banner?: string;
	phone?: string;
	type: "individual" | "company" | "trust";
	joinDate: string;
	salesCount: number;
	followerCount: number;
	allowBookings: boolean;
	displayCurrency?: string;
	providerSettings?: Partial<ProviderSettings>;
	seals?: UserSealDoc[];
	defaultWatermark?: WatermarkConfig;
	letterhead?: LetterheadConfig;
	/** Legacy single session token (kept for backward compat — see sessionTokens). */
	sessionToken?: string;
	/** Active session tokens (one per device/browser). */
	sessionTokens?: string[];
	/** Platform admin — can access /admin backoffice */
	isAdmin?: boolean;
	/** User verification status (for trust/badging on sales) */
	verificationStatus?: VerificationStatus;
	verifiedAt?: string;
	verificationMethod?: VerificationMethod;
	verificationDocumentUrl?: string;
	verificationDocumentType?: string;
	verificationNotes?: string;
	verificationRejectionReason?: string;
}

export interface UserSealDoc {
	id: string;
	name: string;
	config: SealConfig;
	imageUrl?: string;
	isDefault: boolean;
	createdAt?: string;
	updatedAt?: string;
}

const UserSchema = new Schema<IUser & Document>(
	{
		id: { type: String, required: true, unique: true },
		name: { type: String, required: true },
		username: { type: String, required: true, unique: true },
		displayName: { type: String, required: true },
		email: { type: String, required: true, unique: true },
		passwordHash: { type: String, required: true },
		avatar: { type: String },
		banner: { type: String },
		phone: { type: String },
		type: {
			type: String,
			enum: ["individual", "company", "trust"],
			default: "individual",
		},
		joinDate: { type: String },
		salesCount: { type: Number, default: 0 },
		followerCount: { type: Number, default: 0 },
		allowBookings: { type: Boolean, default: false },
		displayCurrency: { type: String },
		providerSettings: {
			type: {
				mapRenderer: String,
				mapTiles: String,
				geocoding: String,
				ocr: String,
				aiModel: String,
				fileStorage: String,
			},
			default: undefined,
		},
		seals: {
			type: [
				{
					id: { type: String, required: true },
					name: { type: String, required: true },
					config: {
						text: [String],
						outerText: String,
						shape: {
							type: String,
							enum: Object.values(SealShape),
							default: SealShape.CIRCLE,
						},
						color: { type: String, default: "#1e3a5f" },
						backgroundColor: String,
						logoUrl: String,
						fontFamily: String,
						borderWidth: { type: Number, default: 3 },
						size: { type: Number, default: 200 },
					},
					imageUrl: String,
					isDefault: { type: Boolean, default: false },
				},
			],
			default: [],
		},
		defaultWatermark: {
			type: {
				type: { type: String },
				sealId: String,
				text: String,
				opacity: { type: Number, default: 0.15 },
				position: { type: String, default: "bottom-right" },
				includePlatformBrand: { type: Boolean, default: true },
			},
		},
		letterhead: {
			type: {
				companyName: { type: String },
				tagline: String,
				logoUrl: String,
				address: String,
				phone: String,
				email: String,
				website: String,
				registrationNumber: String,
				accentColor: { type: String, default: "#1e3a5f" },
				fontFamily: String,
				layout: {
					type: String,
					enum: ["centered", "left-aligned", "split"],
					default: "centered",
				},
				showDivider: { type: Boolean, default: true },
				showFooter: { type: Boolean, default: true },
			},
		},
		sessionToken: { type: String },
		sessionTokens: { type: [String], default: [] },
		isAdmin: { type: Boolean, default: false },
		verificationStatus: {
			type: String,
			enum: Object.values(VerificationStatus),
			default: VerificationStatus.UNVERIFIED,
		},
		verifiedAt: String,
		verificationMethod: {
			type: String,
			enum: Object.values(VerificationMethod),
		},
		verificationDocumentUrl: String,
		verificationDocumentType: String,
		verificationNotes: String,
		verificationRejectionReason: String,
	},
	{ timestamps: true },
);

// In development, delete cached model so schema changes are picked up on hot reload
if (process.env.NODE_ENV !== "production" && mongoose.models.User) {
	try {
		mongoose.deleteModel("User");
	} catch {
		/* ignore */
	}
}

export const UserModel = mongoose.model<IUser & Document>("User", UserSchema);

/* ─── password utilities ──────────────────────────────────────── */

export function hashPassword(password: string): string {
	const salt = crypto.randomBytes(16).toString("hex");
	const hash = crypto
		.pbkdf2Sync(password, salt, 100_000, 64, "sha512")
		.toString("hex");
	return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
	const [salt, hash] = stored.split(":");
	if (!salt || !hash) return false;
	const attempt = crypto
		.pbkdf2Sync(password, salt, 100_000, 64, "sha512")
		.toString("hex");
	return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(attempt));
}

/* ─── session token utilities ─────────────────────────────────── */

export function generateSessionToken(): string {
	return crypto.randomBytes(32).toString("hex");
}
