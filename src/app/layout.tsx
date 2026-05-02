import type { AuthUser } from "@/components/AuthContext";
import { AuthProvider } from "@/components/AuthContext";
import DocumentTitle from "@/components/DocumentTitle";
import { FavouritesProvider } from "@/components/FavouritesContext";
import { PortfolioProvider } from "@/components/PortfolioContext";
import QueryProvider from "@/components/QueryProvider";
import { SubscriptionProvider } from "@/components/SubscriptionContext";
import ThemeProvider from "@/components/ThemeProvider";
import { NavigationTracker } from "@/components/ui/BackButton";
import { UploadProvider } from "@/components/uploads/UploadContext";
import UploadTray from "@/components/uploads/UploadTray";
import { getSessionUser } from "@/lib/session";
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

export default async function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	// Resolve auth on the server so the very first paint already knows
	// whether there's a logged-in user. This eliminates the flash of the
	// "Log In" button (and missing portfolio selector) on hard reload.
	let initialUser: AuthUser | null = null;
	try {
		const sessionUser = await getSessionUser();
		if (sessionUser) {
			initialUser = {
				id: sessionUser.id,
				name: sessionUser.name,
				username: sessionUser.username,
				displayName: sessionUser.displayName,
				email: sessionUser.email,
				avatar: sessionUser.avatar,
				banner: sessionUser.banner,
				phone: sessionUser.phone,
				type: sessionUser.type,
				joinDate: sessionUser.joinDate
					? typeof sessionUser.joinDate === "string"
						? sessionUser.joinDate
						: new Date(sessionUser.joinDate).toISOString()
					: undefined,
				salesCount: sessionUser.salesCount,
				followerCount: sessionUser.followerCount,
				allowBookings: sessionUser.allowBookings,
				displayCurrency: sessionUser.displayCurrency,
				isAdmin: !!sessionUser.isAdmin,
				verificationStatus: sessionUser.verificationStatus,
				settings: {
					aiDocumentProcessing: !!sessionUser.settings?.aiDocumentProcessing,
				},
			};
		}
	} catch (error) {
		console.error("RootLayout: failed to resolve session user", error);
		initialUser = null;
	}

	return (
		<html lang="en" suppressHydrationWarning>
			<body
				className={`${manrope.variable} ${inter.variable} antialiased`}
				suppressHydrationWarning
			>
				<ThemeProvider>
					<QueryProvider initialUserId={initialUser?.id ?? null}>
						<AuthProvider initialUser={initialUser}>
							<PortfolioProvider>
								<SubscriptionProvider>
									<UploadProvider>
										<DocumentTitle />
										<FavouritesProvider>
											<NavigationTracker />
											{children}
											<UploadTray />
										</FavouritesProvider>
									</UploadProvider>
								</SubscriptionProvider>
							</PortfolioProvider>
						</AuthProvider>
					</QueryProvider>
				</ThemeProvider>
			</body>
		</html>
	);
}
