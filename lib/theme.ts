/**
 * Pinellas County Branding Theme
 * Based on Official Pinellas County Branding Guidelines
 *
 * Typography: Nirmala UI (primary), Calibri (alternative)
 * Design Philosophy: "Pinellas County: we're not square" - organic, fluid shapes
 */

export const theme = {
	colors: {
		// Primary Logo Colors (Digital RGB)
		primary: {
			blue: '#2F4A89', // R 47 G 74 B 137
			yellow: '#F3D52B', // R 243 G 213 B 43
			red: '#C60036', // R 198 G 0 B 54
		},

		// Secondary Colors (Strategic Plan branches)
		secondary: {
			purple: '#6B2D8B', // PMS 267c - C 75 M 100 Y 0 K 0
			red: '#DA291C', // PMS 485c - C 0 M 90 Y 85 K 0
			green: '#006341', // PMS 3425c - C 90 M 30 Y 95 K 30
			teal: '#00A499', // PMS 3262c - C 80 M 10 Y 45 K 0
			gold: '#FDDA24', // PMS 109c - C 0 M 32 Y 100 K 0
		},

		// Functional colors derived from brand
		background: {
			primary: '#FFFFFF',
			secondary: '#F5F7FA',
			dark: '#2F4A89',
		},

		text: {
			primary: '#1A1A1A',
			secondary: '#4A5568',
			light: '#FFFFFF',
			muted: '#718096',
		},

		// UI State colors
		state: {
			success: '#006341', // Using brand green
			warning: '#F3D52B', // Using brand yellow
			error: '#C60036', // Using brand red
			info: '#2F4A89', // Using brand blue
		},

		// Border colors
		border: {
			light: '#E2E8F0',
			medium: '#CBD5E0',
			dark: '#2F4A89',
		},
	},

	// Typography - Nirmala UI with Calibri fallback
	fonts: {
		primary: '"Nirmala UI", "Calibri", "Segoe UI", sans-serif',
		heading: '"Nirmala UI Bold", "Calibri Bold", "Segoe UI Bold", sans-serif',
		body: '"Nirmala UI Regular", "Calibri", "Segoe UI", sans-serif',
	},

	fontSizes: {
		'xs': '0.75rem', // 12px
		'sm': '0.875rem', // 14px
		'base': '1rem', // 16px (body copy recommendation: 11-12pt)
		'lg': '1.125rem', // 18px
		'xl': '1.25rem', // 20px
		'2xl': '1.5rem', // 24px
		'3xl': '1.875rem', // 30px
		'4xl': '2.25rem', // 36px
	},

	fontWeights: {
		light: 300, // Semilight
		normal: 400, // Regular
		semibold: 600,
		bold: 700, // Bold - for headings
	},

	// Spacing based on 8px grid
	spacing: {
		'xs': '0.25rem', // 4px
		'sm': '0.5rem', // 8px
		'md': '1rem', // 16px
		'lg': '1.5rem', // 24px
		'xl': '2rem', // 32px
		'2xl': '3rem', // 48px
		'3xl': '4rem', // 64px
	},

	// Border radius - organic shapes (circles and waves)
	borderRadius: {
		none: '0',
		sm: '0.25rem', // 4px
		md: '0.5rem', // 8px
		lg: '1rem', // 16px
		xl: '1.5rem', // 24px
		full: '9999px', // Circular - key brand element
	},

	// Shadows for depth
	shadows: {
		sm: '0 1px 2px 0 rgba(47, 74, 137, 0.05)',
		md: '0 4px 6px -1px rgba(47, 74, 137, 0.1), 0 2px 4px -1px rgba(47, 74, 137, 0.06)',
		lg: '0 10px 15px -3px rgba(47, 74, 137, 0.1), 0 4px 6px -2px rgba(47, 74, 137, 0.05)',
		xl: '0 20px 25px -5px rgba(47, 74, 137, 0.1), 0 10px 10px -5px rgba(47, 74, 137, 0.04)',
	},

	// Transitions
	transitions: {
		fast: '150ms ease-in-out',
		normal: '250ms ease-in-out',
		slow: '350ms ease-in-out',
	},
} as const;

// CSS Custom Properties generator for use in globals.css
export const cssVariables = `
  /* Pinellas County Brand Colors */
  --color-primary-blue: ${theme.colors.primary.blue};
  --color-primary-yellow: ${theme.colors.primary.yellow};
  --color-primary-red: ${theme.colors.primary.red};
  
  --color-secondary-purple: ${theme.colors.secondary.purple};
  --color-secondary-red: ${theme.colors.secondary.red};
  --color-secondary-green: ${theme.colors.secondary.green};
  --color-secondary-teal: ${theme.colors.secondary.teal};
  --color-secondary-gold: ${theme.colors.secondary.gold};
  
  --color-bg-primary: ${theme.colors.background.primary};
  --color-bg-secondary: ${theme.colors.background.secondary};
  --color-bg-dark: ${theme.colors.background.dark};
  
  --color-text-primary: ${theme.colors.text.primary};
  --color-text-secondary: ${theme.colors.text.secondary};
  --color-text-light: ${theme.colors.text.light};
  --color-text-muted: ${theme.colors.text.muted};
  
  --color-success: ${theme.colors.state.success};
  --color-warning: ${theme.colors.state.warning};
  --color-error: ${theme.colors.state.error};
  --color-info: ${theme.colors.state.info};
  
  --color-border-light: ${theme.colors.border.light};
  --color-border-medium: ${theme.colors.border.medium};
  --color-border-dark: ${theme.colors.border.dark};
  
  /* Typography */
  --font-primary: ${theme.fonts.primary};
  --font-heading: ${theme.fonts.heading};
  --font-body: ${theme.fonts.body};
  
  /* Shadows */
  --shadow-sm: ${theme.shadows.sm};
  --shadow-md: ${theme.shadows.md};
  --shadow-lg: ${theme.shadows.lg};
  --shadow-xl: ${theme.shadows.xl};
  
  /* Border Radius */
  --radius-sm: ${theme.borderRadius.sm};
  --radius-md: ${theme.borderRadius.md};
  --radius-lg: ${theme.borderRadius.lg};
  --radius-xl: ${theme.borderRadius.xl};
  --radius-full: ${theme.borderRadius.full};
  
  /* Transitions */
  --transition-fast: ${theme.transitions.fast};
  --transition-normal: ${theme.transitions.normal};
  --transition-slow: ${theme.transitions.slow};
`;

export type Theme = typeof theme;
export default theme;
