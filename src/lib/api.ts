import type {
	AIDocument,
	AIDocumentType,
	DocumentImage,
	DocumentProcessingResult,
	DocumentQueryResponse,
} from "@/types/document";
import {
	AccessRequestStatus,
	DocumentAccessLevel,
	DocumentAccessRequest,
	Property,
} from "@/types/property";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

export class PropertyAPI {
	static async getAllProperties(): Promise<Property[]> {
		try {
			const response = await fetch(`${API_BASE_URL}/properties`);
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			const data = await response.json();
			// API returns array directly, not wrapped in object
			return Array.isArray(data) ? data : [];
		} catch (error) {
			console.error("Error fetching properties:", error);
			return [];
		}
	}

	static async getMyProperties(ownerId: string): Promise<Property[]> {
		try {
			const response = await fetch(
				`${API_BASE_URL}/properties?ownerId=${encodeURIComponent(ownerId)}`,
			);
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			const data = await response.json();
			return Array.isArray(data) ? data : [];
		} catch (error) {
			console.error("Error fetching user properties:", error);
			return [];
		}
	}

	static async getProperty(id: string): Promise<Property | null> {
		try {
			const response = await fetch(`${API_BASE_URL}/properties/${id}`);
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			return await response.json();
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

			return await response.json();
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

			return await response.json();
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

			return response.ok;
		} catch (error) {
			console.error("Error deleting property:", error);
			return false;
		}
	}

	static async getMarketplaceListings(): Promise<Property[]> {
		try {
			const response = await fetch(
				`${API_BASE_URL}/properties?status=for_sale`,
			);
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			const data = await response.json();
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
			return await response.json();
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
			const response = await fetch(
				`${API_BASE_URL}/properties/${encodeURIComponent(propertyId)}/documents/access-requests?${searchParams}`,
			);
			if (!response.ok) return [];
			return await response.json();
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
			return await response.json();
		} catch (error) {
			console.error("Error responding to access request:", error);
			return null;
		}
	}

	static async getAllAccessRequestsForOwner(
		ownerId: string,
	): Promise<DocumentAccessRequest[]> {
		try {
			const response = await fetch(
				`${API_BASE_URL}/document-requests?ownerId=${encodeURIComponent(ownerId)}`,
			);
			if (!response.ok) return [];
			return await response.json();
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
			propertyId?: string;
			documentType?: AIDocumentType;
			skipIndexing?: boolean;
		},
	): Promise<DocumentProcessingResult | null> {
		try {
			const formData = new FormData();
			formData.append("file", file);
			formData.append("userId", userId);
			if (options?.propertyId)
				formData.append("propertyId", options.propertyId);
			if (options?.documentType)
				formData.append("documentType", options.documentType);
			if (options?.skipIndexing) formData.append("skipIndexing", "true");

			const response = await fetch(`${API_BASE_URL}/documents/upload`, {
				method: "POST",
				body: formData,
			});
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			return await response.json();
		} catch (error) {
			console.error("Error uploading document:", error);
			return null;
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

			const response = await fetch(`${API_BASE_URL}/documents?${params}`);
			if (!response.ok) return [];
			const data = await response.json();
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
			const response = await fetch(`${API_BASE_URL}/documents/${id}`);
			if (!response.ok) return null;
			return await response.json();
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
			const response = await fetch(
				`${API_BASE_URL}/documents/${documentId}/images`,
			);
			if (!response.ok) return [];
			const data = await response.json();
			return data.images ?? [];
		} catch (error) {
			console.error("Error fetching document images:", error);
			return [];
		}
	}
}
