import { ProviderSettings } from "@/types/providers";
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
	providerSettings?: Partial<ProviderSettings>;
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
	},
	{ timestamps: true },
);

export const UserModel =
	mongoose.models.User || mongoose.model<IUser & Document>("User", UserSchema);

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
