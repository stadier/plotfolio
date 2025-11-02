import { Property } from "@/types/property";

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

	static async getProperty(id: string): Promise<Property | null> {
		try {
			const response = await fetch(`${API_BASE_URL}/properties/${id}`);
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			const data = await response.json();
			return data.property || null;
		} catch (error) {
			console.error("Error fetching property:", error);
			return null;
		}
	}

	static async createProperty(
		property: Omit<Property, "id">
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

			const data = await response.json();
			return data.property || null;
		} catch (error) {
			console.error("Error creating property:", error);
			return null;
		}
	}

	static async updateProperty(
		id: string,
		updates: Partial<Property>
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

			const data = await response.json();
			return data.property || null;
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
}
