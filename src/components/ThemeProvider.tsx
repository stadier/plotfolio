"use client";

import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react";

export type Theme = "light" | "dark" | "system";

interface ThemeContextValue {
	theme: Theme;
	resolvedTheme: "light" | "dark";
	setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
	theme: "system",
	resolvedTheme: "light",
	setTheme: () => {},
});

export function useTheme() {
	return useContext(ThemeContext);
}

function getSystemTheme(): "light" | "dark" {
	if (typeof window === "undefined") return "light";
	return window.matchMedia("(prefers-color-scheme: dark)").matches
		? "dark"
		: "light";
}

export default function ThemeProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const [theme, setThemeState] = useState<Theme>("system");
	const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");

	const applyTheme = useCallback((t: Theme) => {
		const resolved = t === "system" ? getSystemTheme() : t;
		setResolvedTheme(resolved);
		document.documentElement.classList.toggle("dark", resolved === "dark");
	}, []);

	// Load saved preference on mount
	useEffect(() => {
		const saved = localStorage.getItem("plotfolio-theme") as Theme | null;
		const initial = saved ?? "system";
		setThemeState(initial);
		applyTheme(initial);
	}, [applyTheme]);

	// Listen for system theme changes when in "system" mode
	useEffect(() => {
		const mq = window.matchMedia("(prefers-color-scheme: dark)");
		const handler = () => {
			if (theme === "system") applyTheme("system");
		};
		mq.addEventListener("change", handler);
		return () => mq.removeEventListener("change", handler);
	}, [theme, applyTheme]);

	const setTheme = useCallback(
		(t: Theme) => {
			setThemeState(t);
			localStorage.setItem("plotfolio-theme", t);
			applyTheme(t);
		},
		[applyTheme],
	);

	return (
		<ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
			{children}
		</ThemeContext.Provider>
	);
}
