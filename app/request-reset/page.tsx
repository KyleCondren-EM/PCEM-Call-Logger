'use client';

import { useState } from 'react';
import Link from 'next/link';

// Format username: uppercase, no spaces, no special characters
const formatUsername = (value: string): string => {
	return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
};

export default function RequestResetPage() {
	const [username, setUsername] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [success, setSuccess] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError('');
		setLoading(true);

		try {
			const res = await fetch('/api/auth/request-password-reset', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username }),
			});

			const data = await res.json();

			if (!res.ok) {
				setError(data.error || 'Failed to submit request');
				setLoading(false);
				return;
			}

			setSuccess(true);
		} catch {
			setError('An error occurred. Please try again.');
		} finally {
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
					{/* Header */}
					<div className='text-center'>
						<div
							className='mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4'
							style={{ backgroundColor: 'var(--color-primary-yellow)' }}>
							<wa-icon
								name='key'
								style={{
									color: 'var(--color-primary-blue)',
									fontSize: '2rem',
								}}
							/>
						</div>
						<h2 className='text-2xl font-bold' style={{ color: 'var(--color-primary-blue)' }}>
							Request Password Reset
						</h2>
						<p className='mt-2 text-sm' style={{ color: 'var(--color-text-muted)' }}>
							Enter your username and an administrator will reset your password
						</p>
					</div>

					{success ? (
						<div className='space-y-6'>
							<div
								className='p-4 rounded-lg text-sm flex items-center gap-3'
								style={{
									backgroundColor: 'rgba(0, 133, 119, 0.1)',
									color: 'var(--color-secondary-teal)',
									border: '1px solid var(--color-secondary-teal)',
								}}>
								<wa-icon name='circle-check' style={{ fontSize: '1.5rem', flexShrink: 0 }} />
								<div>
									<p className='font-semibold'>Request Submitted</p>
									<p className='mt-1'>
										Your password reset request has been submitted. An administrator will reset your password soon.
									</p>
								</div>
							</div>

							<div className='text-center'>
								<Link
									href='/login'
									className='inline-flex items-center gap-2 font-medium hover:underline'
									style={{ color: 'var(--color-secondary-teal)' }}>
									<wa-icon name='arrow-left' />
									Back to Login
								</Link>
							</div>
						</div>
					) : (
						<form className='space-y-6' onSubmit={handleSubmit}>
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

							<button type='submit' disabled={loading} className='btn btn-primary btn-full btn-lg'>
								{loading ? (
									<>
										<wa-spinner style={{ fontSize: '1rem' }} />
										Submitting...
									</>
								) : (
									<>
										<wa-icon name='paper-plane' />
										Submit Request
									</>
								)}
							</button>

							<div className='text-center text-sm'>
								<Link
									href='/login'
									className='inline-flex items-center gap-2 font-medium hover:underline'
									style={{ color: 'var(--color-secondary-teal)' }}>
									<wa-icon name='arrow-left' />
									Back to Login
								</Link>
							</div>
						</form>
					)}
				</div>
			</div>
		</div>
	);
}
