"use client";

import {
	DEFAULT_ROLE_PERMISSIONS,
	Portfolio,
	PortfolioPermissions,
	PortfolioRole,
} from "@/types/property";
import {
	createContext,
	ReactNode,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react";
import { useAuth } from "./AuthContext";

export type PortfolioWithRole = Portfolio & {
	role: PortfolioRole;
	permissions?: PortfolioPermissions;
	memberCount?: number;
};

export interface PendingInvite {
	id: string;
	portfolioId: string;
	role: PortfolioRole;
	portfolio: { id: string; name: string; slug: string; avatar?: string } | null;
}

interface PortfolioContextValue {
	portfolios: PortfolioWithRole[];
	activePortfolio: PortfolioWithRole | null;
	activePermissions: PortfolioPermissions;
	setActivePortfolioId: (id: string) => void;
	pendingInvites: PendingInvite[];
	loading: boolean;
	refresh: () => Promise<void>;
}

const PortfolioContext = createContext<PortfolioContextValue | null>(null);

const ACTIVE_PORTFOLIO_KEY = "plotfolio-active-portfolio";

export function PortfolioProvider({ children }: { children: ReactNode }) {
	const { user } = useAuth();
	const [portfolios, setPortfolios] = useState<PortfolioWithRole[]>([]);
	const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
	const [activeId, setActiveId] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);

	const refresh = useCallback(async () => {
		if (!user) {
			setPortfolios([]);
			setPendingInvites([]);
			setActiveId(null);
			setLoading(false);
			return;
		}

		try {
			const [portfolioRes, inviteRes] = await Promise.all([
				fetch("/api/portfolios"),
				fetch("/api/portfolios/invites"),
			]);

			if (portfolioRes.ok) {
				const data: PortfolioWithRole[] = await portfolioRes.json();
				setPortfolios(data);

				// Restore saved active portfolio, or default to the first one
				const saved = localStorage.getItem(ACTIVE_PORTFOLIO_KEY);
				const match = data.find((p) => p.id === saved);
				if (match) {
					setActiveId(match.id);
				} else if (data.length > 0) {
					setActiveId(data[0].id);
				}
			}

			if (inviteRes.ok) {
				const invites: PendingInvite[] = await inviteRes.json();
				setPendingInvites(invites);
			}
		} catch {
			// silent
		} finally {
			setLoading(false);
		}
	}, [user]);

	useEffect(() => {
		refresh();
	}, [refresh]);

	const setActivePortfolioId = useCallback(
		(id: string) => {
			const match = portfolios.find((p) => p.id === id);
			if (match) {
				setActiveId(id);
				localStorage.setItem(ACTIVE_PORTFOLIO_KEY, id);
			}
		},
		[portfolios],
	);

	const activePortfolio = portfolios.find((p) => p.id === activeId) ?? null;
	const activePermissions: PortfolioPermissions =
		activePortfolio?.permissions ??
		DEFAULT_ROLE_PERMISSIONS[activePortfolio?.role ?? PortfolioRole.ADMIN];

	return (
		<PortfolioContext.Provider
			value={{
				portfolios,
				activePortfolio,
				activePermissions,
				setActivePortfolioId,
				pendingInvites,
				loading,
				refresh,
			}}
		>
			{children}
		</PortfolioContext.Provider>
	);
}

export function usePortfolio() {
	const ctx = useContext(PortfolioContext);
	if (!ctx)
		throw new Error("usePortfolio must be used within PortfolioProvider");
	return ctx;
}
