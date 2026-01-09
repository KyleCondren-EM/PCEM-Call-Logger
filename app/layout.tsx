import type { Metadata } from 'next';
import './globals.css';
import WebAwesomeProvider from '@/components/WebAwesomeProvider';

export const metadata: Metadata = {
	title: 'PCEM Call Logger',
	description: 'Call tracking and logging system - Pinellas County Emergency Management',
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang='en' suppressHydrationWarning>
			<body className='antialiased' suppressHydrationWarning>
				<WebAwesomeProvider projectCode={process.env.NEXT_PUBLIC_WEBAWESOME_PROJECT_CODE}>
					{children}
				</WebAwesomeProvider>
			</body>
		</html>
	);
}
