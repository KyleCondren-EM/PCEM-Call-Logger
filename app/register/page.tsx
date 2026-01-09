'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Format full name: capitalize first letter of each word
const formatFullName = (value: string): string => {
	return value
		.split(' ')
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ');
};

// Format username: uppercase, no spaces, no special characters
const formatUsername = (value: string): string => {
	return value.toUpperCase().replace(/[^A-Z0-9]/g, ''); // Remove anything that's not a letter or number
};

export default function RegisterPage() {
	const router = useRouter();
	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [name, setName] = useState('');
	const [error, setError] = useState('');
	const [success, setSuccess] = useState('');
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError('');
		setSuccess('');
		setLoading(true);

		try {
			const res = await fetch('/api/auth/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username, password, name }),
			});

			const data = await res.json();

			if (!res.ok) {
				setError(data.error || 'Registration failed');
				setLoading(false);
				return;
			}

			// If pending approval, show success message
			if (data.pending) {
				setSuccess(data.message);
				setLoading(false);
				// Clear form
				setUsername('');
				setPassword('');
				setName('');
			} else {
				// First user - redirect to login
				router.push('/login');
			}
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
								name='user-plus'
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
							Create your account
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

						{success && (
							<div
								className='p-4 rounded-md text-sm'
								style={{
									backgroundColor: 'rgba(0, 128, 128, 0.1)',
									color: 'var(--color-secondary-teal)',
									border: '1px solid var(--color-secondary-teal)',
								}}>
								<div className='flex items-center gap-2 mb-2'>
									<wa-icon name='circle-check' />
									<span className='font-semibold'>Registration Successful!</span>
								</div>
								<p>{success}</p>
								<Link
									href='/login'
									className='inline-block mt-3 font-medium hover:underline'
									style={{ color: 'var(--color-primary-blue)' }}>
									Go to Login →
								</Link>
							</div>
						)}

						{!success && (
							<>
								<div className='space-y-4'>
									<div>
										<label className='block text-sm font-medium mb-1' style={{ color: 'var(--color-text-primary)' }}>
											Full Name
										</label>
										<div
											className='flex items-center gap-3 rounded-md px-3'
											style={{
												backgroundColor: 'var(--color-bg-secondary)',
												border: '1px solid var(--color-border)',
											}}>
											<wa-icon
												name='id-card'
												style={{
													color: 'var(--color-text-muted)',
													fontSize: '1rem',
													flexShrink: 0,
												}}
											/>
											<input
												type='text'
												required
												value={name}
												onChange={(e) => setName(formatFullName(e.target.value))}
												className='w-full py-2 bg-transparent outline-none'
												style={{
													color: 'var(--color-text-primary)',
												}}
												placeholder='Enter your full name'
											/>
										</div>
									</div>

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
												placeholder='Choose a username'
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
												minLength={6}
												value={password}
												onChange={(e) => setPassword(e.target.value)}
												className='w-full py-2 bg-transparent outline-none'
												style={{
													color: 'var(--color-text-primary)',
												}}
												placeholder='Create a password'
											/>
										</div>
										<p className='mt-1 text-xs' style={{ color: 'var(--color-text-muted)' }}>
											Must be at least 6 characters
										</p>
									</div>
								</div>

								<button type='submit' disabled={loading} className='btn btn-primary btn-full btn-lg'>
									{loading ? (
										<>
											<wa-spinner style={{ fontSize: '1rem' }} />
											Creating account...
										</>
									) : (
										<>
											<wa-icon name='user-plus' />
											Create account
										</>
									)}
								</button>
							</>
						)}

						<div className='text-center text-sm'>
							<span style={{ color: 'var(--color-text-muted)' }}>Already have an account? </span>
							<Link
								href='/login'
								style={{ color: 'var(--color-secondary-teal)' }}
								className='font-medium hover:underline'>
								Sign in here
							</Link>
						</div>
					</form>
				</div>
			</div>
		</div>
	);
}
