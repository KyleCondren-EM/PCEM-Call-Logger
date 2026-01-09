'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ResetPasswordPage() {
	const router = useRouter();
	const [newPassword, setNewPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [checkingAuth, setCheckingAuth] = useState(true);

	useEffect(() => {
		// Check if user needs to reset password
		const checkAuth = async () => {
			try {
				const res = await fetch('/api/auth/me');
				if (!res.ok) {
					router.push('/login');
					return;
				}
				const user = await res.json();
				if (!user.mustResetPassword) {
					// User doesn't need to reset, redirect to home
					router.push('/');
					return;
				}
			} catch {
				router.push('/login');
			} finally {
				setCheckingAuth(false);
			}
		};
		checkAuth();
	}, [router]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError('');

		if (newPassword.length < 6) {
			setError('Password must be at least 6 characters');
			return;
		}

		if (newPassword !== confirmPassword) {
			setError('Passwords do not match');
			return;
		}

		setLoading(true);

		try {
			const res = await fetch('/api/auth/change-password', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ newPassword, confirmPassword }),
			});

			const data = await res.json();

			if (!res.ok) {
				setError(data.error || 'Failed to change password');
				setLoading(false);
				return;
			}

			// Password changed successfully, redirect to home
			router.push('/');
			router.refresh();
		} catch {
			setError('An error occurred. Please try again.');
			setLoading(false);
		}
	};

	if (checkingAuth) {
		return (
			<div
				className='min-h-screen flex items-center justify-center'
				style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
				<wa-spinner style={{ fontSize: '3rem' }} />
			</div>
		);
	}

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
				<div className='p-8 space-y-6'>
					{/* Header */}
					<div className='text-center'>
						<div
							className='inline-flex items-center justify-center w-16 h-16 rounded-full mb-4'
							style={{ backgroundColor: 'rgba(47, 74, 137, 0.1)' }}>
							<wa-icon
								name='key'
								style={{
									color: 'var(--color-primary-blue)',
									fontSize: '2rem',
								}}
							/>
						</div>
						<h1 className='text-2xl font-bold' style={{ color: 'var(--color-text-primary)' }}>
							Reset Your Password
						</h1>
						<p className='mt-2 text-sm' style={{ color: 'var(--color-text-secondary)' }}>
							Your password has been reset by an administrator. Please create a new password to continue.
						</p>
					</div>

					{/* Error Message */}
					{error && (
						<div
							className='p-3 rounded-lg text-sm flex items-center gap-2'
							style={{ backgroundColor: 'rgba(198, 0, 54, 0.1)', color: 'var(--color-primary-red)' }}>
							<wa-icon name='triangle-exclamation' />
							{error}
						</div>
					)}

					{/* Form */}
					<form onSubmit={handleSubmit} className='space-y-4'>
						{/* New Password */}
						<div>
							<label className='block text-sm font-medium mb-1' style={{ color: 'var(--color-text-secondary)' }}>
								New Password <span style={{ color: 'var(--color-primary-red)' }}>*</span>
							</label>
							<div className='relative'>
								<wa-icon
									name='lock'
									style={{
										position: 'absolute',
										left: '12px',
										top: '50%',
										transform: 'translateY(-50%)',
										color: 'var(--color-text-muted)',
										fontSize: '1rem',
										flexShrink: 0,
									}}
								/>
								<input
									type='password'
									required
									value={newPassword}
									onChange={(e) => setNewPassword(e.target.value)}
									placeholder='Enter new password'
									className='w-full py-2 rounded-lg transition-all'
									style={{
										paddingLeft: '40px',
										paddingRight: '16px',
										border: '2px solid var(--color-border-light)',
										backgroundColor: 'var(--color-bg-primary)',
										color: 'var(--color-text-primary)',
									}}
									onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary-blue)')}
									onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border-light)')}
								/>
							</div>
						</div>

						{/* Confirm Password */}
						<div>
							<label className='block text-sm font-medium mb-1' style={{ color: 'var(--color-text-secondary)' }}>
								Confirm Password <span style={{ color: 'var(--color-primary-red)' }}>*</span>
							</label>
							<div className='relative'>
								<wa-icon
									name='lock'
									style={{
										position: 'absolute',
										left: '12px',
										top: '50%',
										transform: 'translateY(-50%)',
										color: 'var(--color-text-muted)',
										fontSize: '1rem',
										flexShrink: 0,
									}}
								/>
								<input
									type='password'
									required
									value={confirmPassword}
									onChange={(e) => setConfirmPassword(e.target.value)}
									placeholder='Confirm new password'
									className='w-full py-2 rounded-lg transition-all'
									style={{
										paddingLeft: '40px',
										paddingRight: '16px',
										border: '2px solid var(--color-border-light)',
										backgroundColor: 'var(--color-bg-primary)',
										color: 'var(--color-text-primary)',
									}}
									onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary-blue)')}
									onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border-light)')}
								/>
							</div>
						</div>

						{/* Password Requirements */}
						<div className='text-xs' style={{ color: 'var(--color-text-muted)' }}>
							<p>Password must be at least 6 characters long.</p>
						</div>

						{/* Submit Button */}
						<button
							type='submit'
							disabled={loading}
							className='w-full py-3 rounded-lg font-semibold text-white transition-all flex items-center justify-center gap-2'
							style={{
								backgroundColor: loading ? 'var(--color-text-muted)' : 'var(--color-primary-blue)',
								cursor: loading ? 'not-allowed' : 'pointer',
							}}>
							{loading ? (
								<>
									<wa-spinner style={{ fontSize: '1rem' }} />
									Changing Password...
								</>
							) : (
								<>
									<wa-icon name='check' />
									Set New Password
								</>
							)}
						</button>
					</form>
				</div>
			</div>
		</div>
	);
}
