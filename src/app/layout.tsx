import { AuthProvider } from "@/components/AuthContext";
import DocumentTitle from "@/components/DocumentTitle";
import { FavouritesProvider } from "@/components/FavouritesContext";
import { PortfolioProvider } from "@/components/PortfolioContext";
import QueryProvider from "@/components/QueryProvider";
import { SubscriptionProvider } from "@/components/SubscriptionContext";
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
	title: "Plotfolio",
	description:
		"Manage your property portfolio with interactive maps, survey document integration, and portfolio tracking.",
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
								<SubscriptionProvider>
									<DocumentTitle />
									<FavouritesProvider>
										<NavigationTracker />
										{children}
									</FavouritesProvider>
								</SubscriptionProvider>
							</PortfolioProvider>
						</AuthProvider>
					</QueryProvider>
				</ThemeProvider>
			</body>
		</html>
	);
}
