'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Format username: uppercase, no spaces, no special characters
const formatUsername = (value: string): string => {
	return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
};

export default function LoginPage() {
	const router = useRouter();
	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError('');
		setLoading(true);

		try {
			const res = await fetch('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username, password }),
			});

			const data = await res.json();

			if (!res.ok) {
				setError(data.error || 'Login failed');
				setLoading(false);
				return;
			}

			router.push('/');
			router.refresh();
		} catch {
			setError('An error occurred. Please try again.');
			setLoading(false);
		}
	};

	return (
		<div
			className='min-h-screen flex items-center justify-center p-4'
			style={{
				backgroundImage: `url(/assets/wave-short-top.png), url(/assets/white-wave-homepage-feature.png), url(/assets/fpo-homepage-featued-alt.jpg)`,
				backgroundRepeat: 'no-repeat, no-repeat, no-repeat',
				backgroundPosition: 'top center, bottom center, top center',
				backgroundSize: '100% auto, 100% auto, cover',
				minHeight: '100vh',
				position: 'relative',
			}}>
			<div
				className='max-w-md w-full relative z-10 rounded-lg'
				style={{
					backgroundColor: 'var(--color-bg-primary)',
					boxShadow: 'var(--shadow-xl)',
				}}>
				<div className='p-8 space-y-8'>
					{/* Header with brand colors */}
					<div className='text-center'>
						<div
							className='mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4'
							style={{ backgroundColor: 'var(--color-primary-yellow)' }}>
							<wa-icon
								name='phone'
								style={{
									color: 'var(--color-primary-blue)',
									fontSize: '2rem',
								}}
							/>
						</div>
						<h2 className='text-2xl font-bold' style={{ color: 'var(--color-primary-blue)' }}>
							PCEM Call Logger
						</h2>
						<h3 className='text-sm font-semibold mt-1' style={{ color: 'var(--color-text-secondary)' }}>
							Pinellas County Emergency Management
						</h3>
						<p className='mt-2 text-sm' style={{ color: 'var(--color-text-muted)' }}>
							Sign in to your account
						</p>
					</div>

					<form className='mt-8 space-y-6' onSubmit={handleSubmit}>
						{error && (
							<div
								className='p-3 rounded-md text-sm flex items-center gap-2'
								style={{
									backgroundColor: 'rgba(198, 0, 54, 0.1)',
									color: 'var(--color-primary-red)',
									border: '1px solid var(--color-primary-red)',
								}}>
								<wa-icon name='triangle-exclamation' />
								{error}
							</div>
						)}

						<div className='space-y-4'>
							<div>
								<label className='block text-sm font-medium mb-1' style={{ color: 'var(--color-text-primary)' }}>
									Username
								</label>
								<div
									className='flex items-center gap-3 rounded-md px-3'
									style={{
										backgroundColor: 'var(--color-bg-secondary)',
										border: '1px solid var(--color-border)',
									}}>
									<wa-icon
										name='user'
										style={{
											color: 'var(--color-text-muted)',
											fontSize: '1rem',
											flexShrink: 0,
										}}
									/>
									<input
										type='text'
										required
										value={username}
										onChange={(e) => setUsername(formatUsername(e.target.value))}
										className='w-full py-2 bg-transparent outline-none'
										style={{
											color: 'var(--color-text-primary)',
										}}
										placeholder='Enter your username'
									/>
								</div>
							</div>

							<div>
								<label className='block text-sm font-medium mb-1' style={{ color: 'var(--color-text-primary)' }}>
									Password
								</label>
								<div
									className='flex items-center gap-3 rounded-md px-3'
									style={{
										backgroundColor: 'var(--color-bg-secondary)',
										border: '1px solid var(--color-border)',
									}}>
									<wa-icon
										name='lock'
										style={{
											color: 'var(--color-text-muted)',
											fontSize: '1rem',
											flexShrink: 0,
										}}
									/>
									<input
										type='password'
										required
										value={password}
										onChange={(e) => setPassword(e.target.value)}
										className='w-full py-2 bg-transparent outline-none'
										style={{
											color: 'var(--color-text-primary)',
										}}
										placeholder='Enter your password'
									/>
								</div>
							</div>
						</div>

						<button type='submit' disabled={loading} className='btn btn-primary btn-full btn-lg'>
							{loading ? (
								<>
									<wa-spinner style={{ fontSize: '1rem' }} />
									Signing in...
								</>
							) : (
								<>
									<wa-icon name='right-to-bracket' />
									Sign in
								</>
							)}
						</button>

						<div className='text-center text-sm'>
							<span style={{ color: 'var(--color-text-muted)' }}>Don&apos;t have an account? </span>
							<Link
								href='/register'
								style={{ color: 'var(--color-secondary-teal)' }}
								className='font-medium hover:underline'>
								Register here
							</Link>
						</div>

						<div className='text-center text-sm'>
							<span style={{ color: 'var(--color-text-muted)' }}>Forgot your password? </span>
							<Link
								href='/request-reset'
								style={{ color: 'var(--color-secondary-teal)' }}
								className='font-medium hover:underline'>
								Request a reset
							</Link>
						</div>
					</form>
				</div>
			</div>
		</div>
	);
}
