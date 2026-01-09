'use client';

import { useEffect, useState } from 'react';

interface WebAwesomeProviderProps {
	children: React.ReactNode;
	projectCode?: string; // Your Web Awesome project code (e.g., "1b79d7600e8d4ca0")
}

export default function WebAwesomeProvider({ children, projectCode }: WebAwesomeProviderProps) {
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		// If using a project code, load from Web Awesome CDN
		if (projectCode) {
			const existingScript = document.querySelector(`script[src*="kit.webawesome.com"]`);
			if (!existingScript) {
				const script = document.createElement('script');
				script.src = `https://kit.webawesome.com/${projectCode}.js`;
				script.crossOrigin = 'anonymous';
				document.head.appendChild(script);
			}
		}
		setMounted(true);
	}, [projectCode]);

	// Prevent hydration mismatch by only rendering after mount
	if (!mounted) {
		return <div style={{ visibility: 'hidden' }}>{children}</div>;
	}

	return <>{children}</>;
}
