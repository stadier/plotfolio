import {
	cachePatterns,
	cachedAuthGetJSON,
	cachedGetJSON,
	invalidateCachedGet,
} from "@/lib/clientCache";
import type { Chat, ChatSummary } from "@/types/chat";
import type {
	AIDocument,
	AIDocumentType,
	DocumentImage,
	DocumentProcessingResult,
	DocumentQueryResponse,
} from "@/types/document";
import {
	AccessRequestStatus,
	Booking,
	DocumentAccessLevel,
	DocumentAccessRequest,
	OwnershipRecord,
	OwnershipTransfer,
	PortfolioPermissions,
	Property,
} from "@/types/property";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

export class PropertyAPI {
	static async getAllProperties(): Promise<Property[]> {
		try {
			const data = await cachedGetJSON<unknown>(`${API_BASE_URL}/properties`, {
				ttlMs: 2 * 60 * 1000,
			});
			// API returns array directly, not wrapped in object
			return Array.isArray(data) ? data : [];
		} catch (error) {
			console.error("Error fetching properties:", error);
			return [];
		}
	}

	static async getMyProperties(
		ownerId: string,
		portfolioId?: string,
		isOwnPortfolio?: boolean,
	): Promise<Property[]> {
		try {
			const params = new URLSearchParams();
			if (portfolioId) {
				params.set("portfolioId", portfolioId);
				if (isOwnPortfolio) {
					params.set("ownerId", ownerId);
				}
			} else {
				params.set("ownerId", ownerId);
			}
			const data = await cachedAuthGetJSON<unknown>(
				`${API_BASE_URL}/properties?${params.toString()}`,
				{ ttlMs: 2 * 60 * 1000 },
			);
			return Array.isArray(data) ? data : [];
		} catch (error) {
			console.error("Error fetching user properties:", error);
			return [];
		}
	}

	static async getProperty(id: string): Promise<Property | null> {
		try {
			return await cachedGetJSON<Property>(`${API_BASE_URL}/properties/${id}`, {
				ttlMs: 2 * 60 * 1000,
			});
		} catch (error) {
			console.error("Error fetching property:", error);
			return null;
		}
	}

	static async createProperty(
		property: Omit<Property, "id">,
	): Promise<Property | null> {
		try {
			const response = await fetch(`${API_BASE_URL}/properties`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(property),
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const created = await response.json();
			invalidateCachedGet(cachePatterns.properties);
			return created;
		} catch (error) {
			console.error("Error creating property:", error);
			return null;
		}
	}

	static async updateProperty(
		id: string,
		updates: Partial<Property>,
	): Promise<Property | null> {
		try {
			const response = await fetch(`${API_BASE_URL}/properties/${id}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(updates),
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const updated = await response.json();
			invalidateCachedGet(cachePatterns.properties);
			return updated;
		} catch (error) {
			console.error("Error updating property:", error);
			return null;
		}
	}

	static async deleteProperty(id: string): Promise<boolean> {
		try {
			const response = await fetch(`${API_BASE_URL}/properties/${id}`, {
				method: "DELETE",
			});
			if (response.ok) {
				invalidateCachedGet(cachePatterns.properties);
			}
			return response.ok;
		} catch (error) {
			console.error("Error deleting property:", error);
			return false;
		}
	}

	static async getMarketplaceListings(): Promise<Property[]> {
		try {
			const data = await cachedGetJSON<unknown>(
				`${API_BASE_URL}/properties?status=for_sale,for_rent,for_lease&include=activeSale`,
				{ ttlMs: 60 * 1000 },
			);
			return Array.isArray(data) ? data : [];
		} catch (error) {
			console.error("Error fetching marketplace listings:", error);
			return [];
		}
	}

	static async seedDatabase(): Promise<boolean> {
		try {
			const response = await fetch(`${API_BASE_URL}/seed`, {
				method: "POST",
			});

			return response.ok;
		} catch (error) {
			console.error("Error seeding database:", error);
			return false;
		}
	}

	// --- Document Access ---

	static async updateDocumentAccessLevel(
		propertyId: string,
		docId: string,
		accessLevel: DocumentAccessLevel,
	): Promise<boolean> {
		try {
			const response = await fetch(
				`${API_BASE_URL}/properties/${encodeURIComponent(propertyId)}/documents`,
				{
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ docId, accessLevel }),
				},
			);
			if (response.ok) {
				invalidateCachedGet(
					`${API_BASE_URL}/properties/${encodeURIComponent(propertyId)}/documents/access-requests`,
				);
			}
			return response.ok;
		} catch (error) {
			console.error("Error updating document access level:", error);
			return false;
		}
	}

	static async requestDocumentAccess(
		propertyId: string,
		data: {
			documentId: string;
			requesterId: string;
			requesterName: string;
			requesterEmail: string;
			requesterAvatar?: string;
			message?: string;
		},
	): Promise<DocumentAccessRequest | null> {
		try {
			const response = await fetch(
				`${API_BASE_URL}/properties/${encodeURIComponent(propertyId)}/documents/access-requests`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(data),
				},
			);
			if (!response.ok) return null;
			const created = await response.json();
			invalidateCachedGet(
				`${API_BASE_URL}/properties/${encodeURIComponent(propertyId)}/documents/access-requests`,
			);
			invalidateCachedGet(`${API_BASE_URL}/document-requests`);
			return created;
		} catch (error) {
			console.error("Error requesting document access:", error);
			return null;
		}
	}

	static async getDocumentAccessRequests(
		propertyId: string,
		params: { requesterId?: string; ownerId?: string },
	): Promise<DocumentAccessRequest[]> {
		try {
			const searchParams = new URLSearchParams();
			if (params.requesterId)
				searchParams.set("requesterId", params.requesterId);
			if (params.ownerId) searchParams.set("ownerId", params.ownerId);
			return await cachedGetJSON<DocumentAccessRequest[]>(
				`${API_BASE_URL}/properties/${encodeURIComponent(propertyId)}/documents/access-requests?${searchParams}`,
				{ ttlMs: 60 * 1000 },
			);
		} catch (error) {
			console.error("Error fetching access requests:", error);
			return [];
		}
	}

	static async respondToAccessRequest(
		propertyId: string,
		data: {
			requestId: string;
			status: AccessRequestStatus;
			ownerId: string;
			responseMessage?: string;
		},
	): Promise<DocumentAccessRequest | null> {
		try {
			const response = await fetch(
				`${API_BASE_URL}/properties/${encodeURIComponent(propertyId)}/documents/access-requests`,
				{
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(data),
				},
			);
			if (!response.ok) return null;
			const updated = await response.json();
			invalidateCachedGet(
				`${API_BASE_URL}/properties/${encodeURIComponent(propertyId)}/documents/access-requests`,
			);
			invalidateCachedGet(`${API_BASE_URL}/document-requests`);
			return updated;
		} catch (error) {
			console.error("Error responding to access request:", error);
			return null;
		}
	}

	static async getAllAccessRequestsForOwner(
		ownerId: string,
	): Promise<DocumentAccessRequest[]> {
		try {
			return await cachedGetJSON<DocumentAccessRequest[]>(
				`${API_BASE_URL}/document-requests?ownerId=${encodeURIComponent(ownerId)}`,
				{ ttlMs: 60 * 1000 },
			);
		} catch (error) {
			console.error("Error fetching owner access requests:", error);
			return [];
		}
	}

	/* ── Document AI Pipeline ────────────────────────────── */

	static async uploadDocument(
		file: File,
		userId: string,
		options?: {
			propertyIds?: string[];
			documentType?: AIDocumentType;
			skipIndexing?: boolean;
			forceUpload?: boolean;
		},
	): Promise<DocumentProcessingResult | null> {
		try {
			const formData = new FormData();
			formData.append("file", file);
			formData.append("userId", userId);
			if (options?.propertyIds?.length)
				formData.append("propertyIds", options.propertyIds.join(","));
			if (options?.documentType)
				formData.append("documentType", options.documentType);
			if (options?.skipIndexing) formData.append("skipIndexing", "true");
			if (options?.forceUpload) formData.append("forceUpload", "true");

			const response = await fetch(`${API_BASE_URL}/documents/upload`, {
				method: "POST",
				body: formData,
			});
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			const result = (await response.json()) as DocumentProcessingResult;
			// Newly uploaded doc must invalidate document list caches AND any
			// property the doc was attached to (PropertyService hydrates
			// `documents[]` via the propertyIds join, so the property GET cache
			// is now stale).
			invalidateCachedGet(cachePatterns.documents);
			if (options?.propertyIds?.length) {
				invalidateCachedGet(cachePatterns.properties);
			}
			return result;
		} catch (error) {
			console.error("Error uploading document:", error);
			return null;
		}
	}

	static async reextractDocument(id: string): Promise<AIDocument | null> {
		try {
			const response = await fetch(`${API_BASE_URL}/documents/${id}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ reextract: true }),
			});
			if (!response.ok) return null;
			const data = (await response.json()) as { document?: AIDocument };
			if (!data.document) return null;
			invalidateCachedGet(cachePatterns.documents);
			return data.document;
		} catch (error) {
			console.error("Error re-extracting document:", error);
			return null;
		}
	}

	static async updateDocument(
		id: string,
		updates: {
			propertyIds?: string[];
			documentType?: string;
			htmlContent?: string;
			fileName?: string;
		},
	): Promise<boolean> {
		try {
			const response = await fetch(`${API_BASE_URL}/documents/${id}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(updates),
			});
			if (response.ok) {
				invalidateCachedGet(cachePatterns.documents);
				// Property hydration includes documents — clear property caches too
				if (updates.propertyIds) {
					invalidateCachedGet(cachePatterns.properties);
				}
			}
			return response.ok;
		} catch (error) {
			console.error("Error updating document:", error);
			return false;
		}
	}

	static async listDocuments(filters?: {
		userId?: string;
		propertyId?: string;
		documentType?: string;
	}): Promise<AIDocument[]> {
		try {
			const params = new URLSearchParams();
			if (filters?.userId) params.set("userId", filters.userId);
			if (filters?.propertyId) params.set("propertyId", filters.propertyId);
			if (filters?.documentType)
				params.set("documentType", filters.documentType);

			const data = await cachedGetJSON<{ documents?: AIDocument[] }>(
				`${API_BASE_URL}/documents?${params}`,
				{ ttlMs: 2 * 60 * 1000 },
			);
			return data.documents ?? [];
		} catch (error) {
			console.error("Error listing documents:", error);
			return [];
		}
	}

	static async getDocument(
		id: string,
	): Promise<{ document: AIDocument; images: DocumentImage[] } | null> {
		try {
			return await cachedGetJSON<{
				document: AIDocument;
				images: DocumentImage[];
			}>(`${API_BASE_URL}/documents/${id}`, { ttlMs: 2 * 60 * 1000 });
		} catch (error) {
			console.error("Error fetching document:", error);
			return null;
		}
	}

	static async deleteDocument(id: string): Promise<boolean> {
		try {
			const response = await fetch(`${API_BASE_URL}/documents/${id}`, {
				method: "DELETE",
			});
			if (response.ok) {
				invalidateCachedGet(cachePatterns.documents);
				// Property hydration includes documents, so clear those too
				invalidateCachedGet(cachePatterns.properties);
			}
			return response.ok;
		} catch (error) {
			console.error("Error deleting document:", error);
			return false;
		}
	}

	static async reindexDocument(
		id: string,
	): Promise<{ chunksCreated: number } | null> {
		try {
			const response = await fetch(`${API_BASE_URL}/documents/${id}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ reindex: true }),
			});
			if (!response.ok) return null;
			return await response.json();
		} catch (error) {
			console.error("Error reindexing document:", error);
			return null;
		}
	}

	static async queryDocuments(
		query: string,
		options?: { userId?: string; propertyId?: string; limit?: number },
	): Promise<DocumentQueryResponse | null> {
		try {
			const response = await fetch(`${API_BASE_URL}/documents/query`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ query, ...options }),
			});
			if (!response.ok) return null;
			return await response.json();
		} catch (error) {
			console.error("Error querying documents:", error);
			return null;
		}
	}

	static async getDocumentImages(documentId: string): Promise<DocumentImage[]> {
		try {
			const data = await cachedGetJSON<{ images?: DocumentImage[] }>(
				`${API_BASE_URL}/documents/${documentId}/images`,
				{ ttlMs: 10 * 60 * 1000 },
			);
			return data.images ?? [];
		} catch (error) {
			console.error("Error fetching document images:", error);
			return [];
		}
	}
}

/* ── Transfer API ──────────────────────────────────────────────────────────── */

export class TransferAPI {
	static async getMyTransfers(userId: string): Promise<OwnershipTransfer[]> {
		try {
			return await cachedGetJSON<OwnershipTransfer[]>(
				`${API_BASE_URL}/transfers?userId=${encodeURIComponent(userId)}`,
				{ ttlMs: 60 * 1000 },
			);
		} catch {
			return [];
		}
	}

	static async lookupUser(username: string): Promise<{
		found: boolean;
		user?: {
			id: string;
			name: string;
			username: string;
			displayName: string;
			email: string;
			avatar?: string;
			type: string;
		};
	}> {
		try {
			const clean = username.replace(/^@/, "").trim();
			if (!clean) return { found: false };
			return await cachedGetJSON<{
				found: boolean;
				user?: {
					id: string;
					name: string;
					username: string;
					displayName: string;
					email: string;
					avatar?: string;
					type: string;
				};
			}>(
				`${API_BASE_URL}/profile/lookup?username=${encodeURIComponent(clean)}`,
				{ ttlMs: 60 * 1000 },
			);
		} catch {
			return { found: false };
		}
	}

	static async getTransfers(
		propertyId: string,
		userId?: string,
	): Promise<OwnershipTransfer[]> {
		try {
			const params = new URLSearchParams();
			if (userId) params.set("userId", userId);
			return await cachedGetJSON<OwnershipTransfer[]>(
				`${API_BASE_URL}/properties/${propertyId}/transfers?${params}`,
				{ ttlMs: 60 * 1000 },
			);
		} catch {
			return [];
		}
	}

	static async initiateTransfer(
		propertyId: string,
		data: {
			fromUserId: string;
			toEmail?: string;
			toUsername?: string;
			toName: string;
			message?: string;
			transferDate?: string;
			price?: number;
		},
	): Promise<{ transfer?: OwnershipTransfer; error?: string }> {
		try {
			const res = await fetch(
				`${API_BASE_URL}/properties/${propertyId}/transfers`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(data),
				},
			);
			const result = await res.json();
			if (!res.ok)
				return { error: result.error || "Failed to initiate transfer" };
			invalidateCachedGet(`${API_BASE_URL}/transfers`);
			invalidateCachedGet(`${API_BASE_URL}/properties/${propertyId}/transfers`);
			return { transfer: result };
		} catch {
			return { error: "Network error" };
		}
	}

	static async respondToTransfer(
		propertyId: string,
		data: {
			transferId: string;
			action: "accept" | "reject" | "cancel";
			userId: string;
			responseMessage?: string;
		},
	): Promise<{ transfer?: OwnershipTransfer; error?: string }> {
		try {
			const res = await fetch(
				`${API_BASE_URL}/properties/${propertyId}/transfers`,
				{
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(data),
				},
			);
			const result = await res.json();
			if (!res.ok)
				return { error: result.error || "Failed to update transfer" };
			invalidateCachedGet(`${API_BASE_URL}/transfers`);
			invalidateCachedGet(`${API_BASE_URL}/properties/${propertyId}/transfers`);
			return { transfer: result };
		} catch {
			return { error: "Network error" };
		}
	}
}

/* ── Ownership History API ─────────────────────────────────────────────────── */

export class OwnershipHistoryAPI {
	static async getHistory(propertyId: string): Promise<OwnershipRecord[]> {
		try {
			return await cachedGetJSON<OwnershipRecord[]>(
				`${API_BASE_URL}/properties/${propertyId}/ownership-history`,
				{ ttlMs: 2 * 60 * 1000 },
			);
		} catch {
			return [];
		}
	}

	static async addRecord(
		propertyId: string,
		data: {
			ownerName: string;
			ownerEmail?: string;
			ownerType: string;
			acquiredDate?: string;
			transferredDate?: string;
			acquisitionMethod: string;
			price?: number;
			notes?: string;
		},
	): Promise<{ record?: OwnershipRecord; error?: string }> {
		try {
			const res = await fetch(
				`${API_BASE_URL}/properties/${propertyId}/ownership-history`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(data),
				},
			);
			const result = await res.json();
			if (!res.ok) return { error: result.error || "Failed to add record" };
			invalidateCachedGet(
				`${API_BASE_URL}/properties/${propertyId}/ownership-history`,
			);
			return { record: result };
		} catch {
			return { error: "Network error" };
		}
	}

	static async updateRecord(
		propertyId: string,
		recordId: string,
		updates: Partial<OwnershipRecord>,
	): Promise<{ record?: OwnershipRecord; error?: string }> {
		try {
			const res = await fetch(
				`${API_BASE_URL}/properties/${propertyId}/ownership-history`,
				{
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ recordId, ...updates }),
				},
			);
			const result = await res.json();
			if (!res.ok) return { error: result.error || "Failed to update record" };
			invalidateCachedGet(
				`${API_BASE_URL}/properties/${propertyId}/ownership-history`,
			);
			return { record: result };
		} catch {
			return { error: "Network error" };
		}
	}

	static async deleteRecord(
		propertyId: string,
		recordId: string,
	): Promise<{ error?: string }> {
		try {
			const res = await fetch(
				`${API_BASE_URL}/properties/${propertyId}/ownership-history?recordId=${recordId}`,
				{ method: "DELETE" },
			);
			if (!res.ok) {
				const result = await res.json().catch(() => ({}));
				return { error: result.error || "Failed to delete record" };
			}
			invalidateCachedGet(
				`${API_BASE_URL}/properties/${propertyId}/ownership-history`,
			);
			return {};
		} catch {
			return { error: "Network error" };
		}
	}
}

/* ── Booking API ───────────────────────────────────────────────────────────── */

export class BookingAPI {
	static async createBooking(
		booking: Omit<Booking, "id" | "status" | "createdAt" | "updatedAt">,
	): Promise<{ booking?: Booking; error?: string }> {
		try {
			const response = await fetch(`${API_BASE_URL}/bookings`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(booking),
			});
			const data = await response.json();
			if (!response.ok)
				return { error: data.error || "Failed to create booking" };
			invalidateCachedGet(`${API_BASE_URL}/bookings`);
			return { booking: data.booking };
		} catch {
			return { error: "Network error" };
		}
	}

	static async getBookings(params: {
		ownerId?: string;
		requesterId?: string;
	}): Promise<Booking[]> {
		try {
			const search = new URLSearchParams();
			if (params.ownerId) search.set("ownerId", params.ownerId);
			if (params.requesterId) search.set("requesterId", params.requesterId);
			const data = await cachedGetJSON<{ bookings?: Booking[] }>(
				`${API_BASE_URL}/bookings?${search.toString()}`,
				{ ttlMs: 60 * 1000 },
			);
			return data.bookings ?? [];
		} catch {
			return [];
		}
	}

	static async updateBooking(
		id: string,
		update: {
			status: string;
			ownerMessage?: string;
			proposedDate?: string;
			proposedTime?: string;
		},
	): Promise<{ booking?: Booking; error?: string }> {
		try {
			const response = await fetch(`${API_BASE_URL}/bookings/${id}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(update),
			});
			const data = await response.json();
			if (!response.ok)
				return { error: data.error || "Failed to update booking" };
			invalidateCachedGet(`${API_BASE_URL}/bookings`);
			return { booking: data.booking };
		} catch {
			return { error: "Network error" };
		}
	}
}

/* ── Portfolio API ─────────────────────────────────────────────────────────── */

import type {
	Portfolio,
	PortfolioMember,
	PortfolioRole,
} from "@/types/property";

export interface PortfolioWithRole extends Portfolio {
	role: PortfolioRole;
}

export interface PortfolioMemberWithUser extends PortfolioMember {
	resolvedPermissions?: PortfolioPermissions;
	type?: "email_invitation";
	email?: string;
	user: {
		id: string;
		name: string;
		username: string;
		displayName: string;
		email: string;
		avatar?: string;
	} | null;
}

export class PortfolioAPI {
	static async list(): Promise<PortfolioWithRole[]> {
		try {
			return await cachedGetJSON<PortfolioWithRole[]>(
				`${API_BASE_URL}/portfolios`,
				{ ttlMs: 2 * 60 * 1000 },
			);
		} catch {
			return [];
		}
	}

	static async get(
		id: string,
	): Promise<(Portfolio & { memberCount: number }) | null> {
		try {
			return await cachedGetJSON<Portfolio & { memberCount: number }>(
				`${API_BASE_URL}/portfolios/${id}`,
				{ ttlMs: 2 * 60 * 1000 },
			);
		} catch {
			return null;
		}
	}

	static async create(data: {
		name: string;
		description?: string;
		avatar?: string;
	}): Promise<PortfolioWithRole | null> {
		try {
			const res = await fetch(`${API_BASE_URL}/portfolios`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(data),
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.error || "Failed to create portfolio");
			}
			const created = await res.json();
			invalidateCachedGet(`${API_BASE_URL}/portfolios`);
			return created;
		} catch (error) {
			console.error("Error creating portfolio:", error);
			return null;
		}
	}

	static async update(
		id: string,
		data: { name?: string; description?: string; avatar?: string },
	): Promise<Portfolio | null> {
		try {
			const res = await fetch(`${API_BASE_URL}/portfolios/${id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(data),
			});
			if (!res.ok) return null;
			const updated = await res.json();
			invalidateCachedGet(`${API_BASE_URL}/portfolios`);
			invalidateCachedGet(`${API_BASE_URL}/portfolios/${id}`);
			return updated;
		} catch {
			return null;
		}
	}

	static async remove(id: string): Promise<{ error?: string }> {
		try {
			const res = await fetch(`${API_BASE_URL}/portfolios/${id}`, {
				method: "DELETE",
			});
			const data = await res.json();
			if (!res.ok) return { error: data.error || "Failed to delete" };
			invalidateCachedGet(`${API_BASE_URL}/portfolios`);
			invalidateCachedGet(`${API_BASE_URL}/portfolios/${id}`);
			return {};
		} catch {
			return { error: "Network error" };
		}
	}

	static async uploadAvatar(
		id: string,
		file: File,
	): Promise<{ avatar?: string; error?: string }> {
		try {
			// Direct browser → B2 upload, then attach the resulting key.
			const { uploadDirect } = await import("@/lib/uploadClient");
			const { key } = await uploadDirect(file, {
				scope: "portfolio-avatar",
				portfolioId: id,
			});
			const res = await fetch(`${API_BASE_URL}/portfolios/${id}/avatar`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ key }),
			});
			const data = await res.json();
			if (!res.ok) return { error: data.error || "Upload failed" };
			invalidateCachedGet(`${API_BASE_URL}/portfolios`);
			invalidateCachedGet(`${API_BASE_URL}/portfolios/${id}`);
			return { avatar: data.avatar };
		} catch (err) {
			return {
				error: err instanceof Error ? err.message : "Network error",
			};
		}
	}

	// ── Members ──

	static async getMembers(
		portfolioId: string,
	): Promise<PortfolioMemberWithUser[]> {
		try {
			return await cachedGetJSON<PortfolioMemberWithUser[]>(
				`${API_BASE_URL}/portfolios/${portfolioId}/members`,
				{ ttlMs: 60 * 1000 },
			);
		} catch {
			return [];
		}
	}

	static async inviteMember(
		portfolioId: string,
		data: { identifier: string; role: PortfolioRole },
	): Promise<{ member?: PortfolioMemberWithUser; error?: string }> {
		try {
			const res = await fetch(
				`${API_BASE_URL}/portfolios/${portfolioId}/members`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(data),
				},
			);
			const result = await res.json();
			if (!res.ok) return { error: result.error || "Failed to invite" };
			invalidateCachedGet(`${API_BASE_URL}/portfolios/${portfolioId}/members`);
			invalidateCachedGet(`${API_BASE_URL}/portfolios`);
			return { member: result };
		} catch {
			return { error: "Network error" };
		}
	}

	static async updateMember(
		portfolioId: string,
		memberId: string,
		data: {
			role?: PortfolioRole;
			status?: string;
			permissions?: Partial<PortfolioPermissions>;
		},
	): Promise<{ error?: string }> {
		try {
			const res = await fetch(
				`${API_BASE_URL}/portfolios/${portfolioId}/members/${memberId}`,
				{
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(data),
				},
			);
			if (!res.ok) {
				const result = await res.json().catch(() => ({}));
				return { error: result.error || "Failed to update" };
			}
			invalidateCachedGet(`${API_BASE_URL}/portfolios/${portfolioId}/members`);
			invalidateCachedGet(`${API_BASE_URL}/portfolios`);
			return {};
		} catch {
			return { error: "Network error" };
		}
	}

	static async removeMember(
		portfolioId: string,
		memberId: string,
	): Promise<{ error?: string }> {
		try {
			const res = await fetch(
				`${API_BASE_URL}/portfolios/${portfolioId}/members/${memberId}`,
				{ method: "DELETE" },
			);
			if (!res.ok) {
				const result = await res.json().catch(() => ({}));
				return { error: result.error || "Failed to remove" };
			}
			invalidateCachedGet(`${API_BASE_URL}/portfolios/${portfolioId}/members`);
			invalidateCachedGet(`${API_BASE_URL}/portfolios`);
			return {};
		} catch {
			return { error: "Network error" };
		}
	}

	static async cancelEmailInvitation(
		portfolioId: string,
		invitationId: string,
	): Promise<{ error?: string }> {
		try {
			const res = await fetch(
				`${API_BASE_URL}/portfolios/${portfolioId}/email-invitations/${invitationId}`,
				{ method: "DELETE" },
			);
			if (!res.ok) {
				const result = await res.json().catch(() => ({}));
				return { error: result.error || "Failed to cancel invitation" };
			}
			invalidateCachedGet(`${API_BASE_URL}/portfolios`);
			return {};
		} catch {
			return { error: "Network error" };
		}
	}
}

/* ── Chat API ──────────────────────────────────────────────────────────────── */

export class ChatAPI {
	static async getChats(): Promise<ChatSummary[]> {
		try {
			const data = await cachedGetJSON<{ chats?: ChatSummary[] }>(
				`${API_BASE_URL}/chat`,
				{ ttlMs: 15 * 1000 },
			);
			return data.chats ?? [];
		} catch {
			return [];
		}
	}

	static async getChat(id: string): Promise<Chat | null> {
		try {
			const data = await cachedGetJSON<{ chat?: Chat | null }>(
				`${API_BASE_URL}/chat/${id}`,
				{ ttlMs: 10 * 1000 },
			);
			return data.chat ?? null;
		} catch {
			return null;
		}
	}

	static async startChat(params: {
		recipientId: string;
		propertyId?: string;
		propertyTitle?: string;
		propertyImage?: string;
		initialMessage?: string;
	}): Promise<{ chat?: Chat; error?: string }> {
		try {
			const res = await fetch(`${API_BASE_URL}/chat`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(params),
			});
			const data = await res.json();
			if (!res.ok) return { error: data.error || "Failed to start chat" };
			invalidateCachedGet(`${API_BASE_URL}/chat`);
			return { chat: data.chat };
		} catch {
			return { error: "Network error" };
		}
	}

	static async sendMessage(
		chatId: string,
		message: string,
	): Promise<{ error?: string }> {
		try {
			const res = await fetch(`${API_BASE_URL}/chat/${chatId}`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ message }),
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				return { error: data.error || "Failed to send message" };
			}
			invalidateCachedGet(`${API_BASE_URL}/chat`);
			invalidateCachedGet(`${API_BASE_URL}/chat/${chatId}`);
			return {};
		} catch {
			return { error: "Network error" };
		}
	}
}
