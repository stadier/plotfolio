import { BookingAPI, PropertyAPI } from "@/lib/api";
import { cachedAuthGetJSON } from "@/lib/clientCache";
import { Booking, Property } from "@/types/property";
import type { ProviderSettings } from "@/types/providers";
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
		my: (ownerId: string, portfolioId?: string) =>
			["properties", "my", ownerId, portfolioId ?? ""] as const,
		detail: (id: string) => ["properties", "detail", id] as const,
		marketplace: ["properties", "marketplace"] as const,
	},
	bookings: {
		owner: (ownerId: string) => ["bookings", "owner", ownerId] as const,
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
	portfolioId?: string,
	isOwnPortfolio?: boolean,
	options?: Partial<UseQueryOptions<Property[]>>,
) {
	return useQuery({
		queryKey: queryKeys.properties.my(ownerId ?? "", portfolioId),
		queryFn: async () => {
			if (!ownerId) return [];
			return PropertyAPI.getMyProperties(ownerId, portfolioId, isOwnPortfolio);
		},
		enabled: !!ownerId,
		refetchOnMount: "always",
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
			const data = await PropertyAPI.getMarketplaceListings();
			if (data.length > 0) return data;
			// Fallback: filter all properties client-side if marketplace endpoint returns empty
			const all = await PropertyAPI.getAllProperties();
			return all.filter(
				(p) =>
					p.status === "for_sale" ||
					p.status === "for_rent" ||
					p.status === "for_lease",
			);
		},
		...options,
	});
}

// ── Booking queries ───────────────────────────────────────────────────────────

export function useOwnerBookings(ownerId: string | undefined) {
	return useQuery<Booking[]>({
		queryKey: queryKeys.bookings.owner(ownerId ?? ""),
		queryFn: () => BookingAPI.getBookings({ ownerId: ownerId! }),
		enabled: !!ownerId,
	});
}

// ── Settings queries ──────────────────────────────────────────────────────────

export function useProviderSettings(enabled = true) {
	return useQuery<ProviderSettings | null>({
		queryKey: queryKeys.settings.providers,
		queryFn: async () => {
			const data = await cachedAuthGetJSON<{
				providerSettings: ProviderSettings | null;
			}>("/api/settings/providers", { ttlMs: 5 * 60 * 1000 });
			return data.providerSettings ?? null;
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
				queryKey: ["properties"],
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
