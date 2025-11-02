import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	/* config options here */
	reactCompiler: true,
	transpilePackages: ["react-map-gl", "mapbox-gl"],

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
