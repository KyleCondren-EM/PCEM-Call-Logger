'use client';

import { useState, useEffect, useRef } from 'react';

// Reason options with Web Awesome icons
const REASON_OPTIONS = [
	{ value: 'EM Data/Technical', label: 'EM Data/Technical', icon: 'database' },
	{ value: 'Health Care Facility', label: 'Health Care Facility', icon: 'hospital' },
	{ value: 'Hurricane Info Request', label: 'Hurricane Info', icon: 'hurricane' },
	{ value: 'Incident Related', label: 'Incident Related', icon: 'triangle-exclamation' },
	{ value: 'Logistics', label: 'Logistics', icon: 'truck-fast' },
	{ value: 'Non-EM Related', label: 'Non-EM Related', icon: 'circle-info' },
	{ value: 'Utilities', label: 'Utilities', icon: 'bolt' },
	{ value: 'Other', label: 'Other', icon: 'ellipsis' },
];

// Format phone number as user types: (XXX) XXX-XXXX
const formatPhoneNumber = (value: string): string => {
	// Remove all non-digit characters
	const digits = value.replace(/\D/g, '');

	// Format based on length
	if (digits.length === 0) return '';
	if (digits.length <= 3) return `(${digits}`;
	if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
	if (digits.length <= 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
	// If more than 10 digits, cap at 10
	return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
};

// Format caller name: capitalize first letter of each word (preserve other capitals)
const formatCallerName = (value: string): string => {
	return value
		.split(' ')
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ');
};

interface CallFormProps {
	onSuccess: () => void;
}

export default function CallForm({ onSuccess }: CallFormProps) {
	const [caller, setCaller] = useState('');
	const [callerPhone, setCallerPhone] = useState('');
	const [reasons, setReasons] = useState<string[]>([]);
	const [otherReason, setOtherReason] = useState('');
	const [timeStart, setTimeStart] = useState('');
	const [timeEnd, setTimeEnd] = useState('');
	const [comments, setComments] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');

	// Call timer state
	const [callInProgress, setCallInProgress] = useState(false);
	const [elapsedSeconds, setElapsedSeconds] = useState(0);
	const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const startTimeRef = useRef<Date | null>(null);

	// Timer effect
	useEffect(() => {
		if (callInProgress && startTimeRef.current) {
			timerRef.current = setInterval(() => {
				const now = new Date();
				const elapsed = Math.floor((now.getTime() - startTimeRef.current!.getTime()) / 1000);
				setElapsedSeconds(elapsed);
			}, 1000);
		} else {
			if (timerRef.current) {
				clearInterval(timerRef.current);
				timerRef.current = null;
			}
		}
		return () => {
			if (timerRef.current) {
				clearInterval(timerRef.current);
			}
		};
	}, [callInProgress]);

	// Format elapsed time as HH:MM:SS
	const formatElapsedTime = (seconds: number) => {
		const hrs = Math.floor(seconds / 3600);
		const mins = Math.floor((seconds % 3600) / 60);
		const secs = seconds % 60;
		if (hrs > 0) {
			return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
		}
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	};

	// Start call timer
	const startCall = () => {
		const now = new Date();
		startTimeRef.current = now;
		const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
		setTimeStart(localDateTime);
		setTimeEnd('');
		setElapsedSeconds(0);
		setCallInProgress(true);
	};

	// End call timer
	const endCall = () => {
		const now = new Date();
		const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
		setTimeEnd(localDateTime);
		setCallInProgress(false);
	};

	const toggleReason = (value: string) => {
		setReasons((prev) => (prev.includes(value) ? prev.filter((r) => r !== value) : [...prev, value]));
	};

	const clearForm = () => {
		setCaller('');
		setCallerPhone('');
		setReasons([]);
		setOtherReason('');
		setTimeStart('');
		setTimeEnd('');
		setComments('');
		setError('');
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError('');

		// Validate caller name is at least 2 characters
		if (caller.trim().length < 2) {
			setError('Please enter a valid caller name (at least 2 characters)');
			return;
		}

		// Validate phone number has exactly 10 digits
		const phoneDigits = callerPhone.replace(/\D/g, '');
		if (phoneDigits.length !== 10) {
			setError('Please enter a valid 10-digit phone number');
			return;
		}

		// Validate at least one reason is selected
		if (reasons.length === 0) {
			setError('Please select at least one reason for the call');
			return;
		}

		// Validate Other reason has text if selected
		if (reasons.includes('Other') && !otherReason.trim()) {
			setError('Please specify the other reason');
			return;
		}

		// Validate end time is not before start time
		if (timeEnd && timeStart && new Date(timeEnd) < new Date(timeStart)) {
			setError('End time cannot be before start time');
			return;
		}

		setLoading(true);

		// Strip non-digits from phone number for storage
		const cleanPhone = phoneDigits;

		// Build reason string, replacing "Other" with the actual text if provided
		const reasonString = reasons
			.map((r) => (r === 'Other' && otherReason.trim() ? `Other: ${otherReason.trim()}` : r))
			.join(', ');

		try {
			const res = await fetch('/api/calls', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					caller,
					callerPhone: cleanPhone,
					reason: reasonString,
					timeStart,
					timeEnd: timeEnd || null,
					comments: comments || null,
				}),
			});

			const data = await res.json();

			if (!res.ok) {
				setError(data.error || 'Failed to log call');
				setLoading(false);
				return;
			}

			clearForm();
			setLoading(false);
			onSuccess();
		} catch (err) {
			setError('An error occurred. Please try again.');
			setLoading(false);
		}
	};

	const setCurrentTime = (field: 'start' | 'end') => {
		const now = new Date();
		const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

		if (field === 'start') {
			setTimeStart(localDateTime);
		} else {
			setTimeEnd(localDateTime);
		}
	};

	return (
		<form onSubmit={handleSubmit} className='space-y-4'>
			{error && (
				<wa-callout variant='danger'>
					<wa-icon slot='icon' name='exclamation-triangle' />
					{error}
				</wa-callout>
			)}

			{/* Caller Name - Full Width with Unknown button */}
			<div>
				<label className='block text-sm font-medium mb-1' style={{ color: 'var(--color-text-secondary)' }}>
					Caller Name <span style={{ color: 'var(--color-primary-red)' }}>*</span>
				</label>
				<div className='flex gap-2 items-center'>
					<div className='flex-1 relative'>
						<wa-icon
							name='user'
							style={{
								position: 'absolute',
								left: '12px',
								top: '50%',
								transform: 'translateY(-50%)',
								color: 'var(--color-text-muted)',
								fontSize: '1rem',
								zIndex: 1,
							}}
						/>
						<input
							type='text'
							required
							className='w-full px-3 py-2 rounded-lg transition-all'
							style={{
								border: '2px solid var(--color-border-light)',
								backgroundColor: 'var(--color-bg-primary)',
								paddingLeft: '2.5rem',
							}}
							value={caller}
							onChange={(e) => setCaller(formatCallerName(e.target.value))}
							onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary-blue)')}
							onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border-light)')}
							placeholder='Enter caller name'
						/>
					</div>
					<button
						type='button'
						onClick={() => setCaller('Unknown')}
						className='px-3 py-2 rounded-lg text-sm transition-all'
						style={{
							border: '2px solid var(--color-border-light)',
							backgroundColor: 'var(--color-bg-secondary)',
							color: 'var(--color-text-secondary)',
						}}
						onMouseOver={(e) => {
							e.currentTarget.style.borderColor = 'var(--color-primary-blue)';
							e.currentTarget.style.backgroundColor = 'var(--color-bg-primary)';
						}}
						onMouseOut={(e) => {
							e.currentTarget.style.borderColor = 'var(--color-border-light)';
							e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)';
						}}
						title='Set as Unknown'>
						<wa-icon name='question' style={{ margin: '0' }} />
					</button>
				</div>
			</div>

			{/* Phone Number - Full Width with Unknown button */}
			<div>
				<label className='block text-sm font-medium mb-1' style={{ color: 'var(--color-text-secondary)' }}>
					Phone Number <span style={{ color: 'var(--color-primary-red)' }}>*</span>
				</label>
				<div className='flex gap-2 items-center'>
					<div className='flex-1 relative'>
						<wa-icon
							name='phone'
							style={{
								position: 'absolute',
								left: '12px',
								top: '50%',
								transform: 'translateY(-50%)',
								color: 'var(--color-text-muted)',
								fontSize: '1rem',
								zIndex: 1,
							}}
						/>
						<input
							type='tel'
							required
							className='w-full px-3 py-2 rounded-lg transition-all'
							style={{
								border: '2px solid var(--color-border-light)',
								backgroundColor: 'var(--color-bg-primary)',
								paddingLeft: '2.5rem',
							}}
							value={callerPhone}
							onChange={(e) => setCallerPhone(formatPhoneNumber(e.target.value))}
							onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary-blue)')}
							onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border-light)')}
							placeholder='(XXX) XXX-XXXX'
						/>
					</div>
					<button
						type='button'
						onClick={() => setCallerPhone('(000) 000-0000')}
						className='px-3 py-2 rounded-lg text-sm transition-all'
						style={{
							border: '2px solid var(--color-border-light)',
							backgroundColor: 'var(--color-bg-secondary)',
							color: 'var(--color-text-secondary)',
						}}
						onMouseOver={(e) => {
							e.currentTarget.style.borderColor = 'var(--color-primary-blue)';
							e.currentTarget.style.backgroundColor = 'var(--color-bg-primary)';
						}}
						onMouseOut={(e) => {
							e.currentTarget.style.borderColor = 'var(--color-border-light)';
							e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)';
						}}
						title='Set as Unknown'>
						<wa-icon name='question' style={{ margin: '0' }} />
					</button>
				</div>
			</div>

			{/* Reason for Call - Visual Multi-Select Buttons */}
			<div>
				<label className='block text-sm font-medium mb-2' style={{ color: 'var(--color-text-secondary)' }}>
					Reason for Call <span style={{ color: 'var(--color-primary-red)' }}>*</span>
				</label>
				<div
					style={{
						display: 'flex',
						flexWrap: 'wrap',
						gap: '0.5rem',
					}}>
					{REASON_OPTIONS.map((option) => {
						const isSelected = reasons.includes(option.value);
						return (
							<button
								key={option.value}
								type='button'
								onClick={() => toggleReason(option.value)}
								className='rounded-lg flex flex-col items-center justify-center gap-1 sm:gap-2 p-2 sm:p-3 transition-all duration-200 relative'
								style={{
									flex: '1 1 80px',
									minWidth: '75px',
									maxWidth: '130px',
									minHeight: '65px',
									border: isSelected ? '2px solid var(--color-primary-blue)' : '2px solid var(--color-border-light)',
									backgroundColor: isSelected ? 'rgba(47, 74, 137, 0.1)' : 'var(--color-bg-primary)',
									boxShadow: isSelected ? 'var(--shadow-md)' : 'none',
									cursor: 'pointer',
								}}
								onMouseOver={(e) => {
									if (!isSelected) {
										e.currentTarget.style.borderColor = 'var(--color-primary-blue)';
										e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
									}
								}}
								onMouseOut={(e) => {
									if (!isSelected) {
										e.currentTarget.style.borderColor = 'var(--color-border-light)';
										e.currentTarget.style.boxShadow = 'none';
									}
								}}>
								<wa-icon
									name={option.icon}
									style={{
										fontSize: '1.25rem',
										margin: '0',
										color: isSelected ? 'var(--color-primary-blue)' : 'var(--color-text-muted)',
									}}
								/>
								<span
									className='text-xs text-center leading-tight'
									style={{
										color: isSelected ? 'var(--color-primary-blue)' : 'var(--color-text-secondary)',
										fontWeight: isSelected ? '600' : '400',
										whiteSpace: 'nowrap',
									}}>
									{option.label}
								</span>
								{isSelected && (
									<wa-icon
										name='circle-check'
										variant='solid'
										style={{
											position: 'absolute',
											top: '6px',
											right: '6px',
											fontSize: '0.75rem',
											color: 'var(--color-primary-blue)',
										}}
									/>
								)}
							</button>
						);
					})}
				</div>

				{/* Other Reason Text Input - Shows when "Other" is selected */}
				{reasons.includes('Other') && (
					<div className='mt-3'>
						<wa-input
							label='Please specify the other reason'
							required
							value={otherReason}
							autocomplete='off'
							oninput={(e: Event) => {
								const input = e.target as HTMLInputElement;
								setOtherReason(input.value);
							}}>
							<wa-icon name='pen' slot='prefix' />
						</wa-input>
					</div>
				)}
			</div>

			<div className='grid grid-cols-1 gap-4'>
				<div>
					<label className='block text-sm font-medium mb-1' style={{ color: 'var(--color-text-secondary)' }}>
						Call Start Time <span style={{ color: 'var(--color-primary-red)' }}>*</span>
					</label>
					<div className='flex gap-2 items-center'>
						<input
							type='datetime-local'
							required
							className='flex-1 px-3 py-2 rounded-lg transition-all'
							style={{
								border: '2px solid var(--color-border-light)',
								backgroundColor: 'var(--color-bg-primary)',
							}}
							value={timeStart}
							onChange={(e) => setTimeStart(e.target.value)}
							onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary-blue)')}
							onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border-light)')}
						/>
						<button type='button' onClick={() => setCurrentTime('start')} className='btn btn-neutral'>
							<wa-icon name='clock' />
							Now
						</button>
					</div>
				</div>

				<div>
					<label className='block text-sm font-medium mb-1' style={{ color: 'var(--color-text-secondary)' }}>
						Call End Time
					</label>
					<div className='flex gap-2 items-center'>
						<input
							type='datetime-local'
							className='flex-1 px-3 py-2 rounded-lg transition-all'
							style={{
								border: '2px solid var(--color-border-light)',
								backgroundColor: 'var(--color-bg-primary)',
							}}
							value={timeEnd}
							onChange={(e) => setTimeEnd(e.target.value)}
							onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary-blue)')}
							onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border-light)')}
						/>
						<button type='button' onClick={() => setCurrentTime('end')} className='btn btn-neutral'>
							<wa-icon name='clock' />
							Now
						</button>
					</div>
				</div>
			</div>

			<wa-textarea
				label='Comments / Notes'
				rows={3}
				value={comments}
				oninput={(e: Event) => setComments((e.target as HTMLTextAreaElement).value)}
			/>

			<div className='flex gap-3'>
				<button type='button' onClick={clearForm} disabled={loading} className='btn btn-danger flex-1'>
					<wa-icon name='eraser' />
					Clear
				</button>

				<button type='submit' disabled={loading} className='btn btn-success flex-[2]'>
					{loading ? (
						<>
							<wa-spinner />
							Saving Call...
						</>
					) : (
						<>
							<wa-icon name='check' />
							Save
						</>
					)}
				</button>
			</div>
		</form>
	);
}
