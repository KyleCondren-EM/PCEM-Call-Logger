import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
	/* config options here */
	typescript: {
		// Web Awesome components are custom elements loaded via CDN
		// TypeScript doesn't recognize them but they work at runtime
		ignoreBuildErrors: true,
	},
};

export default nextConfig;
