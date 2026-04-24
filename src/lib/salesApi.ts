/**
 * API client for the Sales / Offers / Bids / Disputes / Verification system.
 * Mirrors the patterns of `src/lib/api.ts` but split out for clarity.
 */

import type {
	Bid,
	Dispute,
	DisputeType,
	InstallmentPlan,
	Offer,
	OfferType,
	PaymentMethod,
	PlatformSettings,
	Sale,
	SaleSettings,
	SaleType,
	VerificationRequest,
	VerificationStatus,
} from "@/types/sale";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api";

async function request<T>(
	url: string,
	init?: RequestInit,
): Promise<{ data?: T; error?: string }> {
	try {
		const res = await fetch(url, {
			...init,
			headers: {
				"Content-Type": "application/json",
				...(init?.headers ?? {}),
			},
		});
		const json = await res.json().catch(() => ({}));
		if (!res.ok) {
			return { error: json?.error ?? `Request failed (${res.status})` };
		}
		return { data: json as T };
	} catch (err) {
		return {
			error: err instanceof Error ? err.message : "Network error",
		};
	}
}

/* ── Sales ────────────────────────────────────────────────────── */

export class SaleAPI {
	static async list(filter: {
		propertyId?: string;
		sellerId?: string;
		buyerId?: string;
		status?: string;
	}): Promise<Sale[]> {
		const params = new URLSearchParams();
		Object.entries(filter).forEach(([k, v]) => v && params.set(k, v));
		const { data } = await request<Sale[]>(
			`${API_BASE}/sales?${params.toString()}`,
		);
		return data ?? [];
	}

	static async get(id: string): Promise<Sale | null> {
		const { data } = await request<Sale>(`${API_BASE}/sales/${id}`);
		return data ?? null;
	}

	static async create(input: {
		type: SaleType;
		propertyId: string;
		askingPrice: number;
		reservePrice?: number;
		currency?: string;
		settings?: Partial<SaleSettings>;
		auctionStartsAt?: string;
		auctionEndsAt?: string;
	}): Promise<{ sale?: Sale; error?: string }> {
		const { data, error } = await request<Sale>(`${API_BASE}/sales`, {
			method: "POST",
			body: JSON.stringify(input),
		});
		return { sale: data, error };
	}

	static async update(
		id: string,
		updates: Partial<Sale>,
	): Promise<{ sale?: Sale; error?: string }> {
		const { data, error } = await request<Sale>(`${API_BASE}/sales/${id}`, {
			method: "PATCH",
			body: JSON.stringify(updates),
		});
		return { sale: data, error };
	}

	static async cancel(id: string, reason?: string) {
		return SaleAPI.update(id, {
			status: "cancelled" as Sale["status"],
			cancelReason: reason,
		});
	}

	static async sign(
		id: string,
		role: "seller" | "buyer" | "witness",
		signature: string,
		witnessIndex?: number,
	): Promise<{ sale?: Sale; error?: string }> {
		const { data, error } = await request<Sale>(
			`${API_BASE}/sales/${id}/sign`,
			{
				method: "POST",
				body: JSON.stringify({ role, signature, witnessIndex }),
			},
		);
		return { sale: data, error };
	}

	static async submitPayment(
		id: string,
		method: PaymentMethod,
		opts: {
			reference?: string;
			proofUrl?: string;
			installmentIndex?: number;
		} = {},
	): Promise<{ sale?: Sale; error?: string }> {
		const { data, error } = await request<Sale>(
			`${API_BASE}/sales/${id}/payment`,
			{
				method: "POST",
				body: JSON.stringify({ action: "submit", method, ...opts }),
			},
		);
		return { sale: data, error };
	}

	static async confirmPayment(
		id: string,
		installmentIndex?: number,
	): Promise<{ sale?: Sale; error?: string }> {
		const { data, error } = await request<Sale>(
			`${API_BASE}/sales/${id}/payment`,
			{
				method: "POST",
				body: JSON.stringify({
					action: "confirm",
					installmentIndex,
				}),
			},
		);
		return { sale: data, error };
	}

	static async stamp(
		id: string,
		opts: { sealId?: string; stampedContractUrl?: string } = {},
	): Promise<{ sale?: Sale; error?: string }> {
		const { data, error } = await request<Sale>(
			`${API_BASE}/sales/${id}/stamp`,
			{
				method: "POST",
				body: JSON.stringify(opts),
			},
		);
		return { sale: data, error };
	}
}

/* ── Offers ──────────────────────────────────────────────────── */

export class OfferAPI {
	static async list(filter: {
		propertyId?: string;
		buyerId?: string;
		sellerId?: string;
		status?: string;
	}): Promise<Offer[]> {
		const params = new URLSearchParams();
		Object.entries(filter).forEach(([k, v]) => v && params.set(k, v));
		const { data } = await request<Offer[]>(
			`${API_BASE}/offers?${params.toString()}`,
		);
		return data ?? [];
	}

	static async create(input: {
		propertyId: string;
		amount: number;
		currency?: string;
		offerType?: OfferType;
		paymentType?: "full" | "installment";
		installmentPlan?: InstallmentPlan;
		message?: string;
		expiresAt?: string;
	}): Promise<{ offer?: Offer; error?: string }> {
		const { data, error } = await request<Offer>(`${API_BASE}/offers`, {
			method: "POST",
			body: JSON.stringify(input),
		});
		return { offer: data, error };
	}

	static async accept(id: string) {
		return request<{ sale: Sale; offerId: string }>(
			`${API_BASE}/offers/${id}`,
			{
				method: "PATCH",
				body: JSON.stringify({ action: "accept" }),
			},
		);
	}

	static async counter(
		id: string,
		counterAmount: number,
		counterMessage?: string,
	) {
		return request<Offer>(`${API_BASE}/offers/${id}`, {
			method: "PATCH",
			body: JSON.stringify({
				action: "counter",
				counterAmount,
				counterMessage,
			}),
		});
	}

	static async reject(id: string) {
		return request<Offer>(`${API_BASE}/offers/${id}`, {
			method: "PATCH",
			body: JSON.stringify({ action: "reject" }),
		});
	}

	static async withdraw(id: string) {
		return request<Offer>(`${API_BASE}/offers/${id}`, {
			method: "PATCH",
			body: JSON.stringify({ action: "withdraw" }),
		});
	}
}

/* ── Bids ────────────────────────────────────────────────────── */

export class BidAPI {
	static async list(filter: {
		saleId?: string;
		propertyId?: string;
		bidderId?: string;
	}): Promise<Bid[]> {
		const params = new URLSearchParams();
		Object.entries(filter).forEach(([k, v]) => v && params.set(k, v));
		const { data } = await request<Bid[]>(
			`${API_BASE}/bids?${params.toString()}`,
		);
		return data ?? [];
	}

	static async place(saleId: string, amount: number) {
		return request<Bid>(`${API_BASE}/bids`, {
			method: "POST",
			body: JSON.stringify({ saleId, amount }),
		});
	}
}

/* ── Disputes ────────────────────────────────────────────────── */

export class DisputeAPI {
	static async list(filter: { saleId?: string; propertyId?: string }) {
		const params = new URLSearchParams();
		Object.entries(filter).forEach(([k, v]) => v && params.set(k, v));
		const { data } = await request<Dispute[]>(
			`${API_BASE}/disputes?${params.toString()}`,
		);
		return data ?? [];
	}

	static async raise(input: {
		saleId?: string;
		offerId?: string;
		propertyId?: string;
		againstUserId?: string;
		againstName?: string;
		type: DisputeType;
		description: string;
		evidence?: { url: string; type: string; caption?: string }[];
	}) {
		return request<Dispute>(`${API_BASE}/disputes`, {
			method: "POST",
			body: JSON.stringify(input),
		});
	}
}

/* ── Verification ────────────────────────────────────────────── */

export class VerificationAPI {
	static async getStatus(): Promise<{
		status: VerificationStatus;
		verifiedAt?: string;
		latestRequest?: VerificationRequest | null;
		rejectionReason?: string;
	} | null> {
		const { data } = await request<any>(`${API_BASE}/verification`);
		return data;
	}

	static async submit(input: {
		documentUrl?: string;
		documentType?: string;
		notes?: string;
	}) {
		return request<VerificationRequest>(`${API_BASE}/verification`, {
			method: "POST",
			body: JSON.stringify(input),
		});
	}
}

/* ── Admin ───────────────────────────────────────────────────── */

export class AdminAPI {
	static async getPlatformSettings(): Promise<PlatformSettings | null> {
		const { data } = await request<PlatformSettings>(
			`${API_BASE}/admin/platform-settings`,
		);
		return data ?? null;
	}

	static async updatePlatformSettings(updates: Partial<PlatformSettings>) {
		return request<PlatformSettings>(`${API_BASE}/admin/platform-settings`, {
			method: "PUT",
			body: JSON.stringify(updates),
		});
	}

	static async listVerifications(
		status?: string,
	): Promise<VerificationRequest[]> {
		const url = status
			? `${API_BASE}/admin/verifications?status=${status}`
			: `${API_BASE}/admin/verifications`;
		const { data } = await request<VerificationRequest[]>(url);
		return data ?? [];
	}

	static async reviewVerification(
		id: string,
		action: "approve" | "reject",
		reason?: string,
	) {
		return request<VerificationRequest>(
			`${API_BASE}/admin/verifications/${id}`,
			{
				method: "PATCH",
				body: JSON.stringify({ action, reason }),
			},
		);
	}
}
