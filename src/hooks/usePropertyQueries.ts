import { PropertyAPI } from "@/lib/api";
import { Property } from "@/types/property";
import {
	useMutation,
	useQuery,
	useQueryClient,
	type UseQueryOptions,
} from "@tanstack/react-query";

// ── Query keys ────────────────────────────────────────────────────────────────

export const queryKeys = {
	properties: {
		all: ["properties"] as const,
		my: (ownerId: string) => ["properties", "my", ownerId] as const,
		detail: (id: string) => ["properties", "detail", id] as const,
		marketplace: ["properties", "marketplace"] as const,
	},
	settings: {
		providers: ["settings", "providers"] as const,
	},
};

// ── Property queries ──────────────────────────────────────────────────────────

export function useAllProperties(
	options?: Partial<UseQueryOptions<Property[]>>,
) {
	return useQuery({
		queryKey: queryKeys.properties.all,
		queryFn: () => PropertyAPI.getAllProperties(),
		...options,
	});
}

export function useMyProperties(
	ownerId: string | undefined,
	options?: Partial<UseQueryOptions<Property[]>>,
) {
	return useQuery({
		queryKey: queryKeys.properties.my(ownerId ?? ""),
		queryFn: async () => {
			if (!ownerId) return [];
			let data = await PropertyAPI.getMyProperties(ownerId);
			if (data.length === 0) {
				await PropertyAPI.seedDatabase();
				data = await PropertyAPI.getMyProperties(ownerId);
			}
			return data;
		},
		enabled: !!ownerId,
		...options,
	});
}

export function useProperty(
	id: string,
	options?: Partial<UseQueryOptions<Property | null>>,
) {
	return useQuery({
		queryKey: queryKeys.properties.detail(id),
		queryFn: () => PropertyAPI.getProperty(id),
		enabled: !!id,
		...options,
	});
}

export function useMarketplaceListings(
	options?: Partial<UseQueryOptions<Property[]>>,
) {
	return useQuery({
		queryKey: queryKeys.properties.marketplace,
		queryFn: async () => {
			let data = await PropertyAPI.getMarketplaceListings();
			if (data.length === 0) {
				const all = await PropertyAPI.getAllProperties();
				data = all.filter((p) => p.status === "for_sale");
			}
			return data;
		},
		...options,
	});
}

// ── Settings queries ──────────────────────────────────────────────────────────

export function useProviderSettings(enabled = true) {
	return useQuery({
		queryKey: queryKeys.settings.providers,
		queryFn: async () => {
			const res = await fetch("/api/settings/providers");
			if (!res.ok) throw new Error("Failed to fetch providers");
			const data = await res.json();
			return data.providerSettings;
		},
		enabled,
	});
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateProperty() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (property: Omit<Property, "id">) =>
			PropertyAPI.createProperty(property),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.properties.all,
			});
		},
	});
}

export function useUpdateProperty() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ id, updates }: { id: string; updates: Partial<Property> }) =>
			PropertyAPI.updateProperty(id, updates),
		onSuccess: (_data, { id }) => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.properties.all,
			});
			queryClient.invalidateQueries({
				queryKey: queryKeys.properties.detail(id),
			});
		},
	});
}

export function useDeleteProperty() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => PropertyAPI.deleteProperty(id),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.properties.all,
			});
		},
	});
}
