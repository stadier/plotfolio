import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	/* config options here */
	reactCompiler: true,
	transpilePackages: ["react-map-gl", "mapbox-gl"],

	images: {
		localPatterns: [
			{
				pathname: "/api/media/view/**",
			},
			{
				pathname: "/**",
			},
		],
		remotePatterns: [
			{
				protocol: "https",
				hostname: "api.dicebear.com",
			},
			{
				protocol: "https",
				hostname: "picsum.photos",
			},
			{
				protocol: "https",
				hostname: "*.backblazeb2.com",
			},
		],
	},

	// Turbopack config (empty to silence webpack config warning in Next.js 16)
	turbopack: {},

	// Webpack config for Mapbox compatibility
	// Only applies when running with: npm run dev:webpack or npm run dev:mapbox
	webpack: (config, { isServer }) => {
		// Fix for mapbox-gl in client bundles
		if (!isServer) {
			config.resolve.alias = {
				...config.resolve.alias,
				"mapbox-gl": "mapbox-gl/dist/mapbox-gl.js",
			};
		}
		return config;
	},
};

export default nextConfig;
