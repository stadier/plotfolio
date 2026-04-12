import { AuthProvider } from "@/components/AuthContext";
import { FavouritesProvider } from "@/components/FavouritesContext";
import { PortfolioProvider } from "@/components/PortfolioContext";
import QueryProvider from "@/components/QueryProvider";
import ThemeProvider from "@/components/ThemeProvider";
import { NavigationTracker } from "@/components/ui/BackButton";
import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
	variable: "--font-manrope",
	subsets: ["latin"],
	weight: ["400", "600", "700", "800"],
});

const inter = Inter({
	variable: "--font-inter",
	subsets: ["latin"],
	weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
	title: "Plotfolio — Property Portfolio Management",
	description:
		"Manage your Nigerian land plots with interactive maps, survey document integration, and portfolio tracking.",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body
				className={`${manrope.variable} ${inter.variable} antialiased`}
				suppressHydrationWarning
			>
				<ThemeProvider>
					<QueryProvider>
						<AuthProvider>
							<PortfolioProvider>
								<FavouritesProvider>
									<NavigationTracker />
									{children}
								</FavouritesProvider>
							</PortfolioProvider>
						</AuthProvider>
					</QueryProvider>
				</ThemeProvider>
			</body>
		</html>
	);
}
