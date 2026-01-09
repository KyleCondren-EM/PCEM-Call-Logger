'use client';

import { useState, useEffect } from 'react';

type Theme = 'light' | 'dark';

export default function ThemeToggle() {
	const [theme, setTheme] = useState<Theme>('light');
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
		// Check for saved theme preference or system preference
		const savedTheme = localStorage.getItem('pcem-theme') as Theme | null;
		const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

		const initialTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
		setTheme(initialTheme);
		document.documentElement.setAttribute('data-theme', initialTheme);
	}, []);

	const toggleTheme = () => {
		const newTheme = theme === 'light' ? 'dark' : 'light';
		setTheme(newTheme);
		localStorage.setItem('pcem-theme', newTheme);
		document.documentElement.setAttribute('data-theme', newTheme);
	};

	// Don't render until mounted to avoid hydration mismatch
	if (!mounted) {
		return (
			<button
				className='p-2 rounded-lg transition-colors'
				style={{
					backgroundColor: 'rgba(255,255,255,0.1)',
					color: 'var(--color-text-light)',
				}}
				aria-label='Toggle theme'>
				<wa-icon name='circle-half-stroke' style={{ fontSize: '1.25rem' }} />
			</button>
		);
	}

	return (
		<button
			onClick={toggleTheme}
			className='p-2 rounded-lg transition-colors'
			style={{
				backgroundColor: 'rgba(255,255,255,0.1)',
				color: 'var(--color-text-light)',
			}}
			onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)')}
			onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)')}
			aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
			title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
			{theme === 'light' ? (
				<wa-icon name='moon' style={{ fontSize: '1.25rem' }} />
			) : (
				<wa-icon name='sun' style={{ fontSize: '1.25rem' }} />
			)}
		</button>
	);
}
