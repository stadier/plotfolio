"use client";

import { useEffect } from "react";
import { usePortfolio } from "./PortfolioContext";

export default function DocumentTitle() {
	const { activePortfolio } = usePortfolio();

	useEffect(() => {
		document.title = activePortfolio?.name
			? `Plotfolio — ${activePortfolio.name}`
			: "Plotfolio";
	}, [activePortfolio?.name]);

	return null;
}
