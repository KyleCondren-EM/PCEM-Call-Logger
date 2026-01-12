'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CallForm from '@/components/CallForm';
import ThemeToggle from '@/components/ThemeToggle';

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

interface Call {
	id: string;
	caller: string;
	callerPhone: string;
	reason: string;
	timeStart: string;
	timeEnd: string | null;
	comments: string | null;
	callTaker: {
		id: string;
		name: string;
		username: string;
	};
	createdAt: string;
}

interface User {
	userId: string;
	username: string;
	name: string;
	email?: string | null;
	phone?: string | null;
	jobTitle?: string | null;
	department?: string | null;
	profileImage?: string | null;
	role: string;
	mustResetPassword?: boolean;
	passwordResetRequested?: boolean;
}

type CallFilter = 'all' | 'my-calls' | 'today' | 'this-week' | 'has-comments' | 'custom';

export default function Home() {
	const router = useRouter();
	const [calls, setCalls] = useState<Call[]>([]);
	const [search, setSearch] = useState('');
	const [activeFilter, setActiveFilter] = useState<CallFilter>('all');
	const [loading, setLoading] = useState(true);
	const [showForm, setShowForm] = useState(true);
	const [mounted, setMounted] = useState(false);
	const [user, setUser] = useState<User | null>(null);
	const [pendingUsersCount, setPendingUsersCount] = useState(0);
	const [passwordResetRequestsCount, setPasswordResetRequestsCount] = useState(0);
	const [currentPage, setCurrentPage] = useState(1);
	const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
	const [exporting, setExporting] = useState(false);
	const [showPasswordResetConfirm, setShowPasswordResetConfirm] = useState(false);
	const [passwordResetLoading, setPasswordResetLoading] = useState(false);
	const [dateFrom, setDateFrom] = useState('');
	const [dateTo, setDateTo] = useState('');
	const [showDateFilter, setShowDateFilter] = useState(false);
	const callsPerPage = 5;

	// Modal states
	const [viewingCall, setViewingCall] = useState<Call | null>(null);
	const [editingCall, setEditingCall] = useState<Call | null>(null);
	const [deletingCall, setDeletingCall] = useState<Call | null>(null);
	const [deleteLoading, setDeleteLoading] = useState(false);
	const [editingProfile, setEditingProfile] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	// Fetch user info
	useEffect(() => {
		if (!mounted) return;

		const fetchUser = async () => {
			try {
				const res = await fetch('/api/auth/me');
				if (res.ok) {
					const data = await res.json();
					// Check if user needs to reset password
					if (data.mustResetPassword) {
						router.push('/reset-password');
						return;
					}
					setUser(data);
				}
			} catch (error) {
				console.error('Error fetching user:', error);
			}
		};

		fetchUser();
	}, [mounted]);

	// Fetch pending users count for admin badge
	useEffect(() => {
		if (!mounted || !user || user.role !== 'ADMINISTRATOR') return;

		const fetchPendingCount = async () => {
			try {
				const res = await fetch('/api/admin/users');
				if (res.ok) {
					const users = await res.json();
					const pendingCount = users.filter((u: { approved: boolean }) => !u.approved).length;
					const resetCount = users.filter((u: { passwordResetRequested: boolean }) => u.passwordResetRequested).length;
					setPendingUsersCount(pendingCount);
					setPasswordResetRequestsCount(resetCount);
				}
			} catch (error) {
				console.error('Error fetching pending users:', error);
			}
		};

		fetchPendingCount();
	}, [mounted, user]);

	useEffect(() => {
		if (!mounted) return;

		const fetchCalls = async () => {
			try {
				const res = await fetch(`/api/calls?search=${encodeURIComponent(search)}`);
				if (res.ok) {
					const data = await res.json();
					setCalls(data);
				}
			} catch (error) {
				console.error('Error fetching calls:', error);
			} finally {
				setLoading(false);
			}
		};

		fetchCalls();
	}, [search, mounted]);

	const fetchCalls = async () => {
		try {
			const res = await fetch(`/api/calls?search=${encodeURIComponent(search)}&t=${Date.now()}`);
			if (res.ok) {
				const data = await res.json();
				setCalls([...data]);
			}
		} catch (error) {
			console.error('Error fetching calls:', error);
		}
	};

	const handleLogout = async () => {
		await fetch('/api/auth/logout', { method: 'POST' });
		router.push('/login');
		router.refresh();
	};

	const confirmLogout = () => {
		setShowLogoutConfirm(true);
	};

	// Request password reset
	const handleRequestPasswordReset = async () => {
		setPasswordResetLoading(true);
		try {
			const res = await fetch('/api/auth/request-password-reset', { method: 'POST' });
			if (res.ok) {
				// Update local user state
				setUser((prev) => (prev ? { ...prev, passwordResetRequested: true } : null));
				setShowPasswordResetConfirm(false);
			}
		} catch (error) {
			console.error('Error requesting password reset:', error);
		} finally {
			setPasswordResetLoading(false);
		}
	};

	// Cancel password reset request
	const handleCancelPasswordResetRequest = async () => {
		setPasswordResetLoading(true);
		try {
			const res = await fetch('/api/auth/request-password-reset', { method: 'DELETE' });
			if (res.ok) {
				// Update local user state
				setUser((prev) => (prev ? { ...prev, passwordResetRequested: false } : null));
			}
		} catch (error) {
			console.error('Error cancelling password reset request:', error);
		} finally {
			setPasswordResetLoading(false);
		}
	};

	// Export calls to CSV
	const exportToCSV = () => {
		setExporting(true);
		try {
			// Use sortedCalls (already filtered and sorted)
			const dataToExport = sortedCalls;

			if (dataToExport.length === 0) {
				alert('No calls to export');
				setExporting(false);
				return;
			}

			// CSV headers
			const headers = ['Date/Time', 'Caller', 'Phone', 'Reason', 'Duration', 'Call Taker', 'Comments'];

			// Build CSV rows
			const rows = dataToExport.map((call) => {
				const duration = call.timeEnd ? calculateDuration(call.timeStart, call.timeEnd) : 'Ongoing';
				return [
					new Date(call.timeStart).toLocaleString(),
					call.caller,
					formatPhoneNumber(call.callerPhone),
					call.reason,
					duration,
					call.callTaker.name,
					call.comments || '',
				]
					.map((field) => `"${String(field).replace(/"/g, '""')}"`)
					.join(',');
			});

			// Combine headers and rows
			const csv = [headers.join(','), ...rows].join('\n');

			// Create blob and download
			const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
			const url = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			const filterName = activeFilter === 'all' ? 'all-calls' : activeFilter;
			const dateStr = new Date().toISOString().split('T')[0];
			link.download = `call-log-${filterName}-${dateStr}.csv`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(url);
		} catch (error) {
			console.error('Error exporting:', error);
			alert('Failed to export calls');
		} finally {
			setExporting(false);
		}
	};

	const handleDeleteCall = async () => {
		if (!deletingCall) return;
		setDeleteLoading(true);
		try {
			const res = await fetch(`/api/calls/${deletingCall.id}`, { method: 'DELETE' });
			if (res.ok) {
				setDeletingCall(null);
				fetchCalls();
			} else {
				console.error('Failed to delete call');
			}
		} catch (error) {
			console.error('Error deleting call:', error);
		} finally {
			setDeleteLoading(false);
		}
	};

	const formatDateTime = (dateString: string) => {
		return new Date(dateString).toLocaleString();
	};

	const formatPhoneNumber = (phone: string) => {
		// Remove all non-digit characters
		const digits = phone.replace(/\D/g, '');

		// Format based on length
		if (digits.length === 10) {
			// US format: (XXX) XXX-XXXX
			return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
		} else if (digits.length === 11 && digits[0] === '1') {
			// US with country code: +1 (XXX) XXX-XXXX
			return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
		} else if (digits.length === 7) {
			// Local format: XXX-XXXX
			return `${digits.slice(0, 3)}-${digits.slice(3)}`;
		}
		// Return original if doesn't match expected formats
		return phone;
	};

	const calculateDuration = (start: string, end: string | null) => {
		if (!end) return 'Ongoing';
		const duration = new Date(end).getTime() - new Date(start).getTime();
		const hours = Math.floor(duration / 3600000);
		const minutes = Math.floor((duration % 3600000) / 60000);
		return `${hours}h ${minutes}m`;
	};

	// Helper functions for filtering
	const isToday = (dateString: string) => {
		const date = new Date(dateString);
		const today = new Date();
		return date.toDateString() === today.toDateString();
	};

	const isThisWeek = (dateString: string) => {
		const date = new Date(dateString);
		const today = new Date();
		// Reset time components for accurate comparison
		const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
		const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
		const weekAgo = new Date(todayOnly.getTime() - 7 * 24 * 60 * 60 * 1000);
		return dateOnly >= weekAgo && dateOnly <= todayOnly;
	};

	// Check if date is within custom range
	const isInDateRange = (dateString: string) => {
		if (!dateFrom && !dateTo) return true;
		const date = new Date(dateString);
		const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());

		if (dateFrom) {
			const from = new Date(dateFrom);
			const fromOnly = new Date(from.getFullYear(), from.getMonth(), from.getDate());
			if (dateOnly < fromOnly) return false;
		}
		if (dateTo) {
			const to = new Date(dateTo);
			const toOnly = new Date(to.getFullYear(), to.getMonth(), to.getDate());
			if (dateOnly > toOnly) return false;
		}
		return true;
	};

	// Apply filters to calls
	const filteredCalls = calls.filter((call) => {
		// First apply the active filter
		let passesFilter = true;
		switch (activeFilter) {
			case 'my-calls':
				passesFilter = call.callTaker.id === user?.userId;
				break;
			case 'today':
				passesFilter = isToday(call.timeStart);
				break;
			case 'this-week':
				passesFilter = isThisWeek(call.timeStart);
				break;
			case 'has-comments':
				passesFilter = !!(call.comments && call.comments.trim().length > 0);
				break;
			case 'custom':
				passesFilter = isInDateRange(call.timeStart);
				break;
			case 'all':
			default:
				passesFilter = true;
		}
		if (!passesFilter) return false;

		// Apply search filter
		if (search.trim()) {
			const searchLower = search.toLowerCase();
			const matchesCaller = call.caller.toLowerCase().includes(searchLower);
			const matchesPhone = call.callerPhone.includes(search.replace(/\D/g, ''));
			const matchesReason = call.reason.toLowerCase().includes(searchLower);
			const matchesComments = call.comments?.toLowerCase().includes(searchLower);
			const matchesCallTaker = call.callTaker.name.toLowerCase().includes(searchLower);
			if (!matchesCaller && !matchesPhone && !matchesReason && !matchesComments && !matchesCallTaker) {
				return false;
			}
		}

		return true;
	});

	// Sort calls by most recent first and paginate
	const sortedCalls = [...filteredCalls].sort(
		(a, b) => new Date(b.timeStart).getTime() - new Date(a.timeStart).getTime(),
	);
	const totalPages = Math.ceil(sortedCalls.length / callsPerPage);
	const startIndex = (currentPage - 1) * callsPerPage;
	const paginatedCalls = sortedCalls.slice(startIndex, startIndex + callsPerPage);

	// Reset to page 1 when search or filter changes
	useEffect(() => {
		setCurrentPage(1);
	}, [search, activeFilter, dateFrom, dateTo]);

	if (!mounted) {
		return (
			<div
				className='min-h-screen flex items-center justify-center'
				style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
				<div style={{ color: 'var(--color-text-muted)' }}>Loading...</div>
			</div>
		);
	}

	return (
		<div className='min-h-screen' style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
			{/* Header with Pinellas County Blue */}
			<nav style={{ backgroundColor: 'var(--color-primary-blue)', boxShadow: 'var(--shadow-md)' }}>
				<div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
					<div className='flex justify-between items-center h-14 sm:h-16'>
						<div className='flex items-center gap-2 sm:gap-3'>
							<div
								className='w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0'
								style={{ backgroundColor: 'var(--color-primary-yellow)' }}>
								<wa-icon name='phone' style={{ color: '#2F4A89', fontSize: '1rem' }} className='sm:text-xl' />
							</div>
							<div className='flex flex-col justify-center'>
								<span className='text-base sm:text-lg font-bold leading-tight' style={{ color: '#FFFFFF' }}>
									PCEM Call Logger
								</span>
								<span
									className='text-[10px] sm:text-xs leading-tight hidden sm:block'
									style={{ color: 'rgba(255,255,255,0.8)' }}>
									Pinellas County Emergency Management
								</span>
							</div>
						</div>
						<div className='flex items-center gap-2'>
							<ThemeToggle />
							{user?.role === 'ADMINISTRATOR' && (
								<a
									href='/admin'
									className='p-2 rounded-lg transition-colors flex items-center justify-center relative'
									style={{
										color: 'var(--color-text-light)',
										backgroundColor: 'rgba(255,255,255,0.1)',
									}}
									onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)')}
									onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)')}
									title='Admin Dashboard'>
									<wa-icon name='shield-halved' style={{ fontSize: '1.1rem', margin: '0' }} />
									{(pendingUsersCount > 0 || passwordResetRequestsCount > 0) && (
										<span
											className='absolute flex items-center justify-center text-xs font-bold'
											style={{
												top: '-4px',
												right: '-4px',
												minWidth: '18px',
												height: '18px',
												borderRadius: '9px',
												backgroundColor: 'var(--color-primary-red)',
												color: '#fff',
												padding: '0 4px',
											}}
											title={`${pendingUsersCount} pending approval${
												pendingUsersCount !== 1 ? 's' : ''
											}, ${passwordResetRequestsCount} reset request${passwordResetRequestsCount !== 1 ? 's' : ''}`}>
											{pendingUsersCount + passwordResetRequestsCount}
										</span>
									)}
								</a>
							)}
							<button
								onClick={confirmLogout}
								className='px-2 sm:px-4 py-2 text-sm rounded-lg transition-colors'
								style={{
									color: 'var(--color-text-light)',
									backgroundColor: 'rgba(255,255,255,0.1)',
								}}
								onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)')}
								onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)')}>
								<wa-icon name='right-from-bracket' style={{ marginRight: '0' }} className='sm:mr-2' />
								<span className='hidden sm:inline ml-2'>Logout</span>
							</button>
						</div>
					</div>
				</div>
			</nav>

			<div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8'>
				<div className='flex flex-col lg:flex-row gap-4 sm:gap-8 lg:items-stretch'>
					<div className='lg:w-1/3 flex flex-col gap-4 sm:gap-6'>
						<div
							className='rounded-xl p-4 sm:p-6'
							style={{ backgroundColor: 'var(--color-bg-primary)', boxShadow: 'var(--shadow-lg)' }}>
							<div className='flex justify-between mb-4'>
								<h2 className='text-base sm:text-lg font-semibold' style={{ color: 'var(--color-primary-blue)' }}>
									<wa-icon name='plus-circle' style={{ marginRight: '0.5rem' }} />
									{showForm ? 'Log New Call' : 'Quick Actions'}
								</h2>
								<button
									onClick={() => setShowForm(!showForm)}
									className='text-xs sm:text-sm transition-colors'
									style={{ color: 'var(--color-secondary-teal)' }}>
									{showForm ? 'Hide' : 'Show Form'}
								</button>
							</div>
							{showForm && <CallForm onSuccess={fetchCalls} />}
						</div>

						<div
							className='rounded-xl p-4 sm:p-6'
							style={{ backgroundColor: 'var(--color-bg-primary)', boxShadow: 'var(--shadow-lg)' }}>
							<h2 className='text-base sm:text-lg font-semibold mb-4' style={{ color: 'var(--color-primary-blue)' }}>
								<wa-icon name='chart-simple' style={{ marginRight: '0.5rem' }} />
								Statistics
							</h2>
							<div className='space-y-3'>
								<div
									className='flex justify-between items-center p-3 rounded-lg'
									style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
									<span style={{ color: 'var(--color-text-secondary)' }}>
										<wa-icon name='calendar-day' style={{ marginRight: '0.5rem' }} />
										Today
									</span>
									<span className='font-bold text-lg' style={{ color: 'var(--color-secondary-teal)' }}>
										{
											calls.filter((c) => {
												const callDate = new Date(c.timeStart).toDateString();
												const today = new Date().toDateString();
												return callDate === today;
											}).length
										}
									</span>
								</div>
								<div
									className='flex justify-between items-center p-3 rounded-lg'
									style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
									<span style={{ color: 'var(--color-text-secondary)' }}>
										<wa-icon name='phone-volume' style={{ marginRight: '0.5rem' }} />
										Total Calls
									</span>
									<span className='font-bold text-lg' style={{ color: 'var(--color-primary-blue)' }}>
										{calls.length}
									</span>
								</div>
							</div>
						</div>
					</div>

					<div className='lg:w-2/3 flex flex-col'>
						{/* User Profile Card */}
						{user && (
							<div
								className='rounded-xl p-4 mb-6'
								style={{ backgroundColor: 'var(--color-bg-primary)', boxShadow: 'var(--shadow-lg)' }}>
								<div className='flex items-center justify-between'>
									<div className='flex items-center gap-4'>
										<div
											className='w-12 h-12 rounded-full flex items-center justify-center overflow-hidden'
											style={{ backgroundColor: 'var(--color-primary-blue)' }}>
											{user.profileImage ? (
												<img src={user.profileImage} alt={user.name} className='w-full h-full object-cover' />
											) : (
												<wa-icon name='user' style={{ color: '#fff', fontSize: '1.5rem' }} />
											)}
										</div>
										<div>
											<div className='font-semibold' style={{ color: 'var(--color-text-primary)' }}>
												{user.name}
											</div>
											<div className='text-sm' style={{ color: 'var(--color-text-muted)' }}>
												@{user.username}
												{user.jobTitle && <span style={{ color: 'var(--color-text-muted)' }}> • {user.jobTitle}</span>}
											</div>
										</div>
									</div>
									<div className='flex items-center gap-2'>
										<button
											onClick={() => setEditingProfile(true)}
											className='btn btn-ghost btn-icon'
											title='Edit Profile'>
											<wa-icon name='pen' />
										</button>
										<span
											className='px-3 py-1 rounded-full text-xs font-medium'
											style={{
												backgroundColor:
													user.role === 'ADMINISTRATOR' ? 'var(--color-primary-red)' : 'var(--color-secondary-teal)',
												color: '#fff',
											}}>
											{user.role === 'ADMINISTRATOR' ? 'Administrator' : 'User'}
										</span>
									</div>
								</div>
								{/* Password Reset Request Section */}
								{user.role !== 'ADMINISTRATOR' && (
									<div
										className='mt-4 pt-4 flex items-center justify-between'
										style={{ borderTop: '1px solid var(--color-border-light)' }}>
										{user.passwordResetRequested ? (
											<>
												<div className='flex items-center gap-2'>
													<wa-icon name='clock' style={{ color: '#B8A000', fontSize: '1rem' }} />
													<span className='text-sm' style={{ color: 'var(--color-text-secondary)' }}>
														Password reset requested - waiting for admin
													</span>
												</div>
												<button
													onClick={handleCancelPasswordResetRequest}
													disabled={passwordResetLoading}
													className='px-3 py-1.5 text-xs rounded-md font-medium transition-colors flex items-center gap-1'
													style={{
														backgroundColor: 'rgba(107, 114, 128, 0.1)',
														color: 'var(--color-text-secondary)',
													}}>
													{passwordResetLoading ? (
														<wa-spinner style={{ fontSize: '0.75rem' }} />
													) : (
														<>
															<wa-icon name='xmark' style={{ fontSize: '0.75rem' }} />
															Cancel Request
														</>
													)}
												</button>
											</>
										) : (
											<>
												<span className='text-sm' style={{ color: 'var(--color-text-muted)' }}>
													Need to change your password?
												</span>
												<button
													onClick={() => setShowPasswordResetConfirm(true)}
													className='px-3 py-1.5 text-xs rounded-md font-medium transition-colors flex items-center gap-1'
													style={{
														backgroundColor: 'rgba(47, 74, 137, 0.1)',
														color: 'var(--color-primary-blue)',
													}}>
													<wa-icon name='key' style={{ fontSize: '0.75rem' }} />
													Request Password Reset
												</button>
											</>
										)}
									</div>
								)}
							</div>
						)}

						<div
							className='rounded-xl overflow-hidden flex flex-col flex-1'
							style={{ backgroundColor: 'var(--color-bg-primary)', boxShadow: 'var(--shadow-lg)' }}>
							<div className='p-4' style={{ borderBottom: '1px solid var(--color-border-light)' }}>
								<h2
									className='text-lg font-semibold'
									style={{ color: 'var(--color-primary-blue)', marginBottom: '0.75rem' }}>
									<wa-icon name='clock-rotate-left' style={{ marginRight: '0.5rem' }} />
									Call History
								</h2>
								<div className='relative mb-3'>
									<wa-icon
										name='magnifying-glass'
										style={{
											position: 'absolute',
											left: '12px',
											top: '50%',
											transform: 'translateY(-50%)',
											color: 'var(--color-text-muted)',
											zIndex: 10,
											pointerEvents: 'none',
										}}
									/>
									<input
										type='text'
										placeholder='Search calls...'
										className='w-full py-2 rounded-lg transition-all'
										style={{
											paddingLeft: '40px',
											paddingRight: '16px',
											border: '2px solid var(--color-border-light)',
											backgroundColor: 'var(--color-bg-secondary)',
										}}
										value={search}
										onChange={(e) => setSearch(e.target.value)}
										onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary-blue)')}
										onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border-light)')}
									/>
								</div>
								{/* Filter Chips */}
								<div className='flex flex-wrap gap-2'>
									<button
										onClick={() => setActiveFilter('all')}
										className={`filter-chip ${activeFilter === 'all' ? 'active' : ''}`}>
										<wa-icon name='list' />
										All
									</button>
									<button
										onClick={() => setActiveFilter('my-calls')}
										className={`filter-chip ${activeFilter === 'my-calls' ? 'active' : ''}`}>
										<wa-icon name='user' />
										My Calls
									</button>
									<button
										onClick={() => setActiveFilter('today')}
										className={`filter-chip ${activeFilter === 'today' ? 'active' : ''}`}>
										<wa-icon name='calendar-day' />
										Today
									</button>
									<button
										onClick={() => setActiveFilter('this-week')}
										className={`filter-chip ${activeFilter === 'this-week' ? 'active' : ''}`}>
										<wa-icon name='calendar-week' />
										This Week
									</button>
									<button
										onClick={() => setActiveFilter('has-comments')}
										className={`filter-chip ${activeFilter === 'has-comments' ? 'active' : ''}`}>
										<wa-icon name='comment' />
										Has Comments
									</button>
									<button
										onClick={() => {
											setShowDateFilter(!showDateFilter);
											if (!showDateFilter) setActiveFilter('custom');
										}}
										className={`filter-chip ${activeFilter === 'custom' ? 'active' : ''}`}>
										<wa-icon name='calendar-range' />
										Date Range
									</button>
									{/* Export Button */}
									<button
										onClick={exportToCSV}
										disabled={exporting || sortedCalls.length === 0}
										className='filter-chip'
										style={{
											marginLeft: 'auto',
											opacity: exporting || sortedCalls.length === 0 ? 0.5 : 1,
											cursor: exporting || sortedCalls.length === 0 ? 'not-allowed' : 'pointer',
										}}
										title='Export filtered calls to CSV'>
										{exporting ? <wa-spinner style={{ fontSize: '0.875rem' }} /> : <wa-icon name='download' />}
										Export
									</button>
								</div>
								{/* Date Range Filter */}
								{showDateFilter && (
									<div
										className='flex flex-wrap items-center gap-3 mt-3 p-3 rounded-lg'
										style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
										<div className='flex items-center gap-2'>
											<label
												htmlFor='dateFrom'
												className='text-sm font-medium'
												style={{ color: 'var(--color-text-muted)' }}>
												From:
											</label>
											<input
												type='date'
												id='dateFrom'
												value={dateFrom}
												onChange={(e) => {
													setDateFrom(e.target.value);
													setActiveFilter('custom');
												}}
												className='px-3 py-1.5 rounded-md text-sm'
												style={{
													border: '1px solid var(--color-border-light)',
													backgroundColor: 'var(--color-bg-primary)',
													color: 'var(--color-text-primary)',
												}}
											/>
										</div>
										<div className='flex items-center gap-2'>
											<label
												htmlFor='dateTo'
												className='text-sm font-medium'
												style={{ color: 'var(--color-text-muted)' }}>
												To:
											</label>
											<input
												type='date'
												id='dateTo'
												value={dateTo}
												onChange={(e) => {
													setDateTo(e.target.value);
													setActiveFilter('custom');
												}}
												className='px-3 py-1.5 rounded-md text-sm'
												style={{
													border: '1px solid var(--color-border-light)',
													backgroundColor: 'var(--color-bg-primary)',
													color: 'var(--color-text-primary)',
												}}
											/>
										</div>
										{(dateFrom || dateTo) && (
											<button
												onClick={() => {
													setDateFrom('');
													setDateTo('');
													setActiveFilter('all');
												}}
												className='px-3 py-1.5 text-sm rounded-md'
												style={{
													backgroundColor: 'var(--color-red)',
													color: 'white',
												}}>
												<wa-icon name='xmark' style={{ marginRight: '0.25rem' }} />
												Clear
											</button>
										)}
									</div>
								)}
							</div>

							<div className='p-3 flex-1 flex flex-col'>
								{loading ? (
									<div className='flex-1 flex flex-col'>
										<div
											className='p-8 text-center flex-1 flex flex-col items-center justify-center'
											style={{ color: 'var(--color-text-muted)' }}>
											<wa-spinner style={{ fontSize: '2rem', marginBottom: '1rem' }} />
											<p>Loading...</p>
										</div>
										<div
											className='flex items-center justify-between pt-4 mt-auto'
											style={{ borderTop: '1px solid var(--color-border-light)' }}>
											<div className='text-sm' style={{ color: 'var(--color-text-muted)' }}>
												Showing 0-0 of 0
											</div>
											<div className='flex items-center gap-2'>
												<button
													disabled
													className='px-3 py-2 rounded-lg text-sm flex items-center gap-1'
													style={{
														backgroundColor: 'var(--color-bg-secondary)',
														color: 'var(--color-text-muted)',
														border: '2px solid var(--color-border-light)',
														cursor: 'not-allowed',
													}}>
													<wa-icon name='chevron-left' style={{ margin: '0' }} />
													Prev
												</button>
												<span className='text-sm' style={{ color: 'var(--color-text-secondary)' }}>
													Page 1 of 1
												</span>
												<button
													disabled
													className='px-3 py-2 rounded-lg text-sm flex items-center gap-1'
													style={{
														backgroundColor: 'var(--color-bg-secondary)',
														color: 'var(--color-text-muted)',
														border: '2px solid var(--color-border-light)',
														cursor: 'not-allowed',
													}}>
													Next
													<wa-icon name='chevron-right' style={{ margin: '0' }} />
												</button>
											</div>
										</div>
									</div>
								) : calls.length === 0 ? (
									<div className='flex-1 flex flex-col'>
										<div
											className='p-8 text-center flex-1 flex flex-col items-center justify-center'
											style={{ color: 'var(--color-text-muted)' }}>
											<wa-icon name='phone-slash' style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }} />
											<p>No calls found. {search && 'Try a different search.'}</p>
										</div>
										<div
											className='flex items-center justify-between pt-4 mt-auto'
											style={{ borderTop: '1px solid var(--color-border-light)' }}>
											<div className='text-sm' style={{ color: 'var(--color-text-muted)' }}>
												Showing 0-0 of 0
											</div>
											<div className='flex items-center gap-2'>
												<button
													disabled
													className='px-3 py-2 rounded-lg text-sm flex items-center gap-1'
													style={{
														backgroundColor: 'var(--color-bg-secondary)',
														color: 'var(--color-text-muted)',
														border: '2px solid var(--color-border-light)',
														cursor: 'not-allowed',
													}}>
													<wa-icon name='chevron-left' style={{ margin: '0' }} />
													Prev
												</button>
												<span className='text-sm' style={{ color: 'var(--color-text-secondary)' }}>
													Page 1 of 1
												</span>
												<button
													disabled
													className='px-3 py-2 rounded-lg text-sm flex items-center gap-1'
													style={{
														backgroundColor: 'var(--color-bg-secondary)',
														color: 'var(--color-text-muted)',
														border: '2px solid var(--color-border-light)',
														cursor: 'not-allowed',
													}}>
													Next
													<wa-icon name='chevron-right' style={{ margin: '0' }} />
												</button>
											</div>
										</div>
									</div>
								) : (
									<div className='flex flex-col flex-1'>
										<div className='space-y-3 flex-1'>
											{paginatedCalls.map((call) => (
												<div
													key={call.id}
													className='rounded-xl p-4 transition-all'
													style={{
														backgroundColor: 'var(--color-bg-primary)',
														border: '1px solid var(--color-border-light)',
													}}>
													{/* Top Row: Caller Name, Duration Badge, Actions */}
													<div className='flex items-start justify-between'>
														<div>
															<h3
																className='text-base font-semibold'
																style={{ color: 'var(--color-text-primary)', marginBottom: '0' }}>
																{call.caller}
															</h3>
															<a
																href={`tel:${call.callerPhone}`}
																className='text-sm flex items-center gap-1'
																style={{ color: 'var(--color-secondary-teal)', marginTop: '2px' }}>
																<wa-icon name='phone' style={{ fontSize: '0.75rem', margin: '0' }} />
																{formatPhoneNumber(call.callerPhone)}
															</a>
														</div>
														<div className='flex items-center gap-2'>
															<span
																className='px-3 py-1 rounded-full text-xs font-medium'
																style={{
																	backgroundColor: call.timeEnd ? 'rgba(0, 99, 65, 0.1)' : 'rgba(243, 213, 43, 0.3)',
																	color: call.timeEnd ? 'var(--color-secondary-green)' : 'var(--color-primary-yellow)',
																	border: call.timeEnd
																		? '1px solid var(--color-secondary-green)'
																		: '1px solid var(--color-primary-yellow)',
																}}>
																{calculateDuration(call.timeStart, call.timeEnd)}
															</span>
															<wa-dropdown
																hoist
																placement='bottom-end'
																distance={8}
																style={{ ['--wa-panel-padding' as string]: '0.5rem 0' }}>
																<wa-button slot='trigger' appearance='plain' size='small'>
																	<wa-icon
																		name='ellipsis-vertical'
																		label='Actions'
																		style={{ fontSize: '1.25rem', margin: '0' }}
																	/>
																</wa-button>
																<wa-dropdown-item
																	value='view'
																	style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}
																	onClick={() => setViewingCall(call)}>
																	<wa-icon slot='icon' name='eye' />
																	View
																</wa-dropdown-item>
																<wa-dropdown-item
																	value='edit'
																	style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}
																	onClick={() => setEditingCall(call)}>
																	<wa-icon slot='icon' name='pen-to-square' />
																	Edit
																</wa-dropdown-item>
																<wa-divider style={{ margin: '0.25rem 0' }}></wa-divider>
																<wa-dropdown-item
																	value='delete'
																	variant='danger'
																	style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}
																	onClick={() => setDeletingCall(call)}>
																	<wa-icon slot='icon' name='trash' />
																	Delete
																</wa-dropdown-item>
															</wa-dropdown>
														</div>
													</div>

													{/* Reason Section */}
													<div className='mt-3'>
														<div className='text-xs font-medium mb-1' style={{ color: 'var(--color-text-muted)' }}>
															Reason:
														</div>
														<div className='flex flex-wrap gap-1'>
															{call.reason.split(', ').map((reason, idx) => (
																<span
																	key={idx}
																	className='px-2 py-0.5 rounded text-xs font-medium'
																	style={{
																		backgroundColor: 'rgba(47, 74, 137, 0.1)',
																		color: 'var(--color-primary-blue)',
																		border: '1px solid var(--color-primary-blue)',
																	}}>
																	{reason}
																</span>
															))}
														</div>
													</div>

													{/* Comments (if any) */}
													{call.comments && (
														<div className='mt-2 text-sm' style={{ color: 'var(--color-text-secondary)' }}>
															{call.comments}
														</div>
													)}

													{/* Bottom Row: Date/Time and Call Taker */}
													<div
														className='flex items-center justify-between mt-3 pt-3'
														style={{ borderTop: '1px solid var(--color-border-light)' }}>
														<div
															className='flex items-center gap-1 text-xs'
															style={{ color: 'var(--color-text-muted)' }}>
															<wa-icon name='calendar' style={{ fontSize: '0.75rem', margin: '0' }} />
															{formatDateTime(call.timeStart)}
														</div>
														<div
															className='flex items-center gap-1 text-xs'
															style={{ color: 'var(--color-text-muted)' }}>
															<wa-icon name='user' style={{ fontSize: '0.75rem', margin: '0' }} />
															{call.callTaker.name}
														</div>
													</div>
												</div>
											))}

											{/* Pagination Controls */}
										</div>
										<div
											className='flex items-center justify-between pt-4 mt-auto'
											style={{ borderTop: '1px solid var(--color-border-light)' }}>
											<div className='text-sm' style={{ color: 'var(--color-text-muted)' }}>
												Showing {startIndex + 1}-{Math.min(startIndex + callsPerPage, sortedCalls.length)} of{' '}
												{sortedCalls.length}
											</div>
											<div className='flex items-center gap-2'>
												<button
													onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
													disabled={currentPage === 1}
													className='px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-1'
													style={{
														backgroundColor:
															currentPage === 1 ? 'var(--color-bg-secondary)' : 'var(--color-primary-blue)',
														color: currentPage === 1 ? 'var(--color-text-muted)' : '#fff',
														border:
															currentPage === 1
																? '2px solid var(--color-border-light)'
																: '2px solid var(--color-primary-blue)',
														cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
													}}>
													<wa-icon name='chevron-left' style={{ margin: '0' }} />
													Prev
												</button>
												<span className='text-sm' style={{ color: 'var(--color-text-secondary)' }}>
													Page {currentPage} of {Math.max(1, totalPages)}
												</span>
												<button
													onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
													disabled={currentPage === totalPages || totalPages <= 1}
													className='px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-1'
													style={{
														backgroundColor:
															currentPage === totalPages || totalPages <= 1
																? 'var(--color-bg-secondary)'
																: 'var(--color-primary-blue)',
														color: currentPage === totalPages || totalPages <= 1 ? 'var(--color-text-muted)' : '#fff',
														border:
															currentPage === totalPages || totalPages <= 1
																? '2px solid var(--color-border-light)'
																: '2px solid var(--color-primary-blue)',
														cursor: currentPage === totalPages || totalPages <= 1 ? 'not-allowed' : 'pointer',
													}}>
													Next
													<wa-icon name='chevron-right' style={{ margin: '0' }} />
												</button>
											</div>
										</div>
									</div>
								)}
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Footer - Pinellas County Style */}
			<footer
				className='mt-8 py-6'
				style={{
					backgroundColor: 'var(--color-primary-blue)',
					borderTop: '4px solid var(--color-primary-yellow)',
				}}>
				<div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
					<div className='flex flex-col md:flex-row items-center justify-between gap-4'>
						{/* PCEM Logo and Name */}
						<div className='flex items-center gap-4'>
							<img
								src='/icons/pcem_logo.png'
								alt='PCEM Logo'
								style={{ height: '70px', width: 'auto', filter: 'brightness(0) invert(1)' }}
							/>
							<div className='text-left'>
								<div className='font-bold text-sm' style={{ color: '#ffffff' }}>
									Pinellas County Government
								</div>
								<div className='text-xs' style={{ color: 'rgba(255,255,255,0.8)' }}>
									Emergency Management
								</div>
							</div>
						</div>

						{/* Contact Info */}
						<div className='text-center md:text-right text-xs' style={{ color: 'rgba(255,255,255,0.9)' }}>
							<div>10750 Ulmerton Road, Building 1, Suite 267</div>
							<div>Largo, FL 33778</div>
							<div className='mt-1'>Phone: (727) 464-3800 | Fax: (727) 464-4024</div>
							<div>V/TDD: (727) 464-4062</div>
						</div>

						{/* Website */}
						<div className='text-center'>
							<a
								href='https://www.pinellas.gov'
								target='_blank'
								rel='noopener noreferrer'
								className='text-xs font-medium hover:underline'
								style={{ color: 'var(--color-primary-yellow)' }}>
								www.pinellas.gov
							</a>
							<div className='text-xs mt-1' style={{ color: 'rgba(255,255,255,0.6)' }}>
								© {new Date().getFullYear()} Pinellas County
							</div>
						</div>
					</div>
				</div>
			</footer>

			{/* View Call Modal */}
			{viewingCall && (
				<div
					className='fixed inset-0 z-50 flex items-center justify-center p-4'
					style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
					onClick={() => setViewingCall(null)}>
					<div
						className='rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto'
						style={{ backgroundColor: 'var(--color-bg-primary)', boxShadow: 'var(--shadow-lg)' }}
						onClick={(e) => e.stopPropagation()}>
						{/* Header */}
						<div
							className='flex justify-between items-center p-4'
							style={{ borderBottom: '1px solid var(--color-border-light)' }}>
							<h3 className='modal-title text-lg font-semibold' style={{ color: 'var(--color-primary-blue)' }}>
								<wa-icon name='phone' style={{ marginRight: '0.5rem' }} />
								Call Details
							</h3>
							<button onClick={() => setViewingCall(null)} className='btn btn-danger btn-icon'>
								<wa-icon name='xmark' />
							</button>
						</div>

						{/* Content - Card Style */}
						<div className='p-4'>
							<div
								className='rounded-xl p-4'
								style={{
									backgroundColor: 'var(--color-bg-secondary)',
									border: '1px solid var(--color-border-light)',
								}}>
								{/* Caller Info */}
								<div className='flex items-start justify-between mb-3'>
									<div>
										<h4
											className='text-base font-semibold'
											style={{ color: 'var(--color-text-primary)', marginBottom: '0' }}>
											{viewingCall.caller}
										</h4>
										<a
											href={`tel:${viewingCall.callerPhone}`}
											className='text-sm flex items-center gap-1'
											style={{ color: 'var(--color-secondary-teal)', marginTop: '2px' }}>
											<wa-icon name='phone' style={{ fontSize: '0.75rem', margin: '0' }} />
											{formatPhoneNumber(viewingCall.callerPhone)}
										</a>
									</div>
									<span
										className='px-3 py-1 rounded-full text-xs font-medium'
										style={{
											backgroundColor: viewingCall.timeEnd ? 'rgba(0, 99, 65, 0.1)' : 'rgba(243, 213, 43, 0.3)',
											color: viewingCall.timeEnd ? 'var(--color-secondary-green)' : 'var(--color-primary-yellow)',
											border: viewingCall.timeEnd
												? '1px solid var(--color-secondary-green)'
												: '1px solid var(--color-primary-yellow)',
										}}>
										{calculateDuration(viewingCall.timeStart, viewingCall.timeEnd)}
									</span>
								</div>

								{/* Reason */}
								<div className='mb-3'>
									<div className='text-xs font-medium mb-1' style={{ color: 'var(--color-text-muted)' }}>
										Reason:
									</div>
									<div className='flex flex-wrap gap-1'>
										{viewingCall.reason.split(', ').map((reason, idx) => (
											<span
												key={idx}
												className='px-2 py-0.5 rounded text-xs font-medium'
												style={{
													backgroundColor: 'rgba(47, 74, 137, 0.1)',
													color: 'var(--color-primary-blue)',
													border: '1px solid var(--color-primary-blue)',
												}}>
												{reason}
											</span>
										))}
									</div>
								</div>

								{/* Comments */}
								{viewingCall.comments && (
									<div className='mb-3 text-sm' style={{ color: 'var(--color-text-secondary)' }}>
										<div className='text-xs font-medium mb-1' style={{ color: 'var(--color-text-muted)' }}>
											Comments:
										</div>
										{viewingCall.comments}
									</div>
								)}

								{/* Time Details */}
								<div
									className='grid grid-cols-2 gap-4 pt-3 mb-3'
									style={{ borderTop: '1px solid var(--color-border-light)' }}>
									<div>
										<div className='text-xs font-medium' style={{ color: 'var(--color-text-muted)' }}>
											Start Time
										</div>
										<div className='text-sm' style={{ color: 'var(--color-text-primary)' }}>
											{formatDateTime(viewingCall.timeStart)}
										</div>
									</div>
									<div>
										<div className='text-xs font-medium' style={{ color: 'var(--color-text-muted)' }}>
											End Time
										</div>
										<div className='text-sm' style={{ color: 'var(--color-text-primary)' }}>
											{viewingCall.timeEnd ? formatDateTime(viewingCall.timeEnd) : 'Ongoing'}
										</div>
									</div>
								</div>

								{/* Footer - Date and Call Taker */}
								<div
									className='flex items-center justify-between pt-3'
									style={{ borderTop: '1px solid var(--color-border-light)' }}>
									<div className='flex items-center gap-1 text-xs' style={{ color: 'var(--color-text-muted)' }}>
										<wa-icon name='calendar' style={{ fontSize: '0.75rem', margin: '0' }} />
										{formatDateTime(viewingCall.timeStart)}
									</div>
									<div className='flex items-center gap-1 text-xs' style={{ color: 'var(--color-text-muted)' }}>
										<wa-icon name='user' style={{ fontSize: '0.75rem', margin: '0' }} />
										{viewingCall.callTaker.name}
									</div>
								</div>
							</div>
						</div>

						{/* Footer */}
						<div className='flex justify-end p-4' style={{ borderTop: '1px solid var(--color-border-light)' }}>
							<button onClick={() => setViewingCall(null)} className='btn btn-danger'>
								<wa-icon name='xmark' />
								Close
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Edit Call Modal */}
			{editingCall && (
				<EditCallModal
					call={editingCall}
					onClose={() => setEditingCall(null)}
					onSave={() => {
						setEditingCall(null);
						fetchCalls();
					}}
					formatDateTime={formatDateTime}
				/>
			)}

			{/* Delete Confirmation Modal */}
			{deletingCall && (
				<div
					className='fixed inset-0 z-50 flex items-center justify-center p-4'
					style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
					onClick={() => setDeletingCall(null)}>
					<div
						className='rounded-xl p-6 max-w-md w-full'
						style={{ backgroundColor: 'var(--color-bg-primary)', boxShadow: 'var(--shadow-lg)' }}
						onClick={(e) => e.stopPropagation()}>
						<div className='flex items-center gap-3 mb-4'>
							<div
								className='w-12 h-12 rounded-full flex items-center justify-center'
								style={{ backgroundColor: 'rgba(198, 0, 54, 0.1)' }}>
								<wa-icon
									name='triangle-exclamation'
									style={{ color: 'var(--color-primary-red)', fontSize: '1.5rem' }}
								/>
							</div>
							<div>
								<h3 className='text-lg font-semibold' style={{ color: 'var(--color-text-primary)' }}>
									Delete Call Record
								</h3>
								<p className='text-sm' style={{ color: 'var(--color-text-muted)' }}>
									This action cannot be undone.
								</p>
							</div>
						</div>
						<p className='mb-6' style={{ color: 'var(--color-text-secondary)' }}>
							Are you sure you want to delete the call record from <strong>{deletingCall.caller}</strong> (
							{formatPhoneNumber(deletingCall.callerPhone)})?
						</p>
						<div className='flex justify-end gap-3'>
							<button onClick={() => setDeletingCall(null)} className='btn btn-danger-outline' disabled={deleteLoading}>
								<wa-icon name='xmark' />
								Cancel
							</button>
							<button onClick={handleDeleteCall} className='btn btn-danger' disabled={deleteLoading}>
								<wa-icon name='trash' />
								{deleteLoading ? 'Deleting...' : 'Delete'}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Edit Profile Modal */}
			{editingProfile && user && (
				<EditProfileModal
					user={user}
					onClose={() => setEditingProfile(false)}
					onSave={(updatedUser) => {
						setUser(updatedUser);
						setEditingProfile(false);
					}}
					formatPhoneNumber={formatPhoneNumber}
				/>
			)}

			{/* Logout Confirmation Modal */}
			{showLogoutConfirm && (
				<div
					className='fixed inset-0 z-50 flex items-center justify-center p-4'
					style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
					onClick={() => setShowLogoutConfirm(false)}>
					<div
						className='rounded-xl p-6 max-w-sm w-full'
						style={{ backgroundColor: 'var(--color-bg-primary)', boxShadow: 'var(--shadow-lg)' }}
						onClick={(e) => e.stopPropagation()}>
						<div className='flex items-center gap-3 mb-4'>
							<div
								className='w-12 h-12 rounded-full flex items-center justify-center'
								style={{ backgroundColor: 'rgba(47, 74, 137, 0.1)' }}>
								<wa-icon name='right-from-bracket' style={{ color: 'var(--color-primary-blue)', fontSize: '1.5rem' }} />
							</div>
							<div>
								<h3 className='text-lg font-semibold' style={{ color: 'var(--color-text-primary)' }}>
									Confirm Logout
								</h3>
								<p className='text-sm' style={{ color: 'var(--color-text-muted)' }}>
									Are you sure you want to log out?
								</p>
							</div>
						</div>
						<div className='flex justify-end gap-3'>
							<button
								onClick={() => setShowLogoutConfirm(false)}
								className='px-4 py-2 rounded-lg transition-colors'
								style={{
									border: '1px solid var(--color-border-light)',
									backgroundColor: 'var(--color-bg-secondary)',
									color: 'var(--color-text-primary)',
								}}>
								Cancel
							</button>
							<button
								onClick={() => {
									setShowLogoutConfirm(false);
									handleLogout();
								}}
								className='px-4 py-2 rounded-lg transition-colors text-white'
								style={{ backgroundColor: 'var(--color-primary-blue)' }}>
								<wa-icon name='right-from-bracket' style={{ marginRight: '0.5rem' }} />
								Logout
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Password Reset Request Confirmation Modal */}
			{showPasswordResetConfirm && (
				<div
					className='fixed inset-0 z-50 flex items-center justify-center p-4'
					style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
					onClick={() => setShowPasswordResetConfirm(false)}>
					<div
						className='rounded-xl p-6 max-w-sm w-full'
						style={{ backgroundColor: 'var(--color-bg-primary)', boxShadow: 'var(--shadow-lg)' }}
						onClick={(e) => e.stopPropagation()}>
						<div className='flex items-center gap-3 mb-4'>
							<div
								className='w-12 h-12 rounded-full flex items-center justify-center'
								style={{ backgroundColor: 'rgba(47, 74, 137, 0.1)' }}>
								<wa-icon name='key' style={{ color: 'var(--color-primary-blue)', fontSize: '1.5rem' }} />
							</div>
							<div>
								<h3 className='text-lg font-semibold' style={{ color: 'var(--color-text-primary)' }}>
									Request Password Reset
								</h3>
								<p className='text-sm' style={{ color: 'var(--color-text-muted)' }}>
									An administrator will reset your password
								</p>
							</div>
						</div>
						<p className='text-sm mb-4' style={{ color: 'var(--color-text-secondary)' }}>
							After your request is processed, you&apos;ll receive a temporary password from an administrator that you
							can use to log in and set a new password.
						</p>
						<div className='flex justify-end gap-3'>
							<button
								onClick={() => setShowPasswordResetConfirm(false)}
								className='px-4 py-2 rounded-lg transition-colors'
								style={{
									border: '1px solid var(--color-border-light)',
									backgroundColor: 'var(--color-bg-secondary)',
									color: 'var(--color-text-primary)',
								}}>
								Cancel
							</button>
							<button
								onClick={handleRequestPasswordReset}
								disabled={passwordResetLoading}
								className='px-4 py-2 rounded-lg transition-colors text-white flex items-center gap-2'
								style={{ backgroundColor: 'var(--color-primary-blue)' }}>
								{passwordResetLoading ? (
									<wa-spinner style={{ fontSize: '1rem' }} />
								) : (
									<>
										<wa-icon name='key' />
										Request Reset
									</>
								)}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

// Edit Call Modal Component
// Reason options with Web Awesome icons (same as CallForm)
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

function EditCallModal({
	call,
	onClose,
	onSave,
	formatDateTime,
}: {
	call: Call;
	onClose: () => void;
	onSave: () => void;
	formatDateTime: (dateString: string) => string;
}) {
	const [caller, setCaller] = useState(call.caller);
	const [callerPhone, setCallerPhone] = useState(formatPhoneNumber(call.callerPhone));

	// Parse existing reasons from the call
	const parseExistingReasons = () => {
		const reasonParts = call.reason.split(', ');
		const selectedReasons: string[] = [];
		let otherText = '';

		reasonParts.forEach((part) => {
			if (part.startsWith('Other: ')) {
				selectedReasons.push('Other');
				otherText = part.replace('Other: ', '');
			} else if (REASON_OPTIONS.find((opt) => opt.value === part)) {
				selectedReasons.push(part);
			} else {
				// Unknown reason, treat as Other
				selectedReasons.push('Other');
				otherText = part;
			}
		});

		return { selectedReasons, otherText };
	};

	const { selectedReasons: initialReasons, otherText: initialOtherText } = parseExistingReasons();
	const [reasons, setReasons] = useState<string[]>(initialReasons);
	const [otherReason, setOtherReason] = useState(initialOtherText);

	const [timeStart, setTimeStart] = useState(new Date(call.timeStart).toISOString().slice(0, 16));
	const [timeEnd, setTimeEnd] = useState(call.timeEnd ? new Date(call.timeEnd).toISOString().slice(0, 16) : '');
	const [comments, setComments] = useState(call.comments || '');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');

	const toggleReason = (value: string) => {
		setReasons((prev) => (prev.includes(value) ? prev.filter((r) => r !== value) : [...prev, value]));
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

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError('');

		// Validate caller name
		if (caller.trim().length < 2) {
			setError('Please enter a valid caller name (at least 2 characters)');
			return;
		}

		// Validate phone number
		const phoneDigits = callerPhone.replace(/\D/g, '');
		if (phoneDigits.length !== 10) {
			setError('Please enter a valid 10-digit phone number');
			return;
		}

		// Validate at least one reason
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

		// Build reason string
		const reasonString = reasons
			.map((r) => (r === 'Other' && otherReason.trim() ? `Other: ${otherReason.trim()}` : r))
			.join(', ');

		try {
			const res = await fetch(`/api/calls/${call.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					caller: caller.trim(),
					callerPhone: phoneDigits,
					reason: reasonString,
					timeStart,
					timeEnd: timeEnd || null,
					comments: comments || null,
				}),
			});

			if (res.ok) {
				onSave();
			} else {
				const data = await res.json();
				setError(data.error || 'Failed to update call');
			}
		} catch (err) {
			setError('An error occurred. Please try again.');
		} finally {
			setLoading(false);
		}
	};

	return (
		<div
			className='fixed inset-0 z-50 flex items-center justify-center p-4'
			style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
			onClick={onClose}>
			<div
				className='rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto'
				style={{ backgroundColor: 'var(--color-bg-primary)', boxShadow: 'var(--shadow-lg)' }}
				onClick={(e) => e.stopPropagation()}>
				{/* Header */}
				<div
					className='modal-header flex justify-between items-center p-4'
					style={{ borderBottom: '1px solid var(--color-border-light)' }}>
					<h3 className='text-lg font-semibold' style={{ color: 'var(--color-primary-blue)' }}>
						<wa-icon name='pen-to-square' style={{ marginRight: '0.5rem' }} />
						Edit Call
					</h3>
					<button onClick={onClose} className='btn btn-danger btn-icon'>
						<wa-icon name='xmark' />
					</button>
				</div>

				{/* Content */}
				<div className='p-4'>
					{error && (
						<div
							className='p-3 rounded-lg mb-4 flex items-center gap-2'
							style={{ backgroundColor: 'rgba(198, 0, 54, 0.1)', color: 'var(--color-primary-red)' }}>
							<wa-icon name='exclamation-triangle' style={{ margin: '0' }} />
							{error}
						</div>
					)}

					<form onSubmit={handleSubmit} className='space-y-4'>
						{/* Caller Name with Unknown button */}
						<div>
							<label className='block text-sm font-medium mb-1' style={{ color: 'var(--color-text-secondary)' }}>
								Caller Name <span style={{ color: 'var(--color-primary-red)' }}>*</span>
							</label>
							<div className='flex gap-2 items-center'>
								<div className='relative flex-1'>
									<wa-icon
										name='user'
										style={{
											position: 'absolute',
											left: '12px',
											top: '50%',
											transform: 'translateY(-50%)',
											color: 'var(--color-text-muted)',
											zIndex: 10,
											pointerEvents: 'none',
										}}
									/>
									<input
										type='text'
										value={caller}
										onChange={(e) => setCaller(formatCallerName(e.target.value))}
										autoComplete='off'
										required
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

						{/* Phone Number with Unknown button */}
						<div>
							<label className='block text-sm font-medium mb-1' style={{ color: 'var(--color-text-secondary)' }}>
								Phone Number <span style={{ color: 'var(--color-primary-red)' }}>*</span>
							</label>
							<div className='flex gap-2 items-center'>
								<div className='relative flex-1'>
									<wa-icon
										name='phone'
										style={{
											position: 'absolute',
											left: '12px',
											top: '50%',
											transform: 'translateY(-50%)',
											color: 'var(--color-text-muted)',
											zIndex: 10,
											pointerEvents: 'none',
										}}
									/>
									<input
										type='tel'
										value={callerPhone}
										onChange={(e) => setCallerPhone(formatPhoneNumber(e.target.value))}
										autoComplete='off'
										required
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

						{/* Reason for Call - Visual Multi-Select */}
						<div>
							<label className='block text-sm font-medium mb-2' style={{ color: 'var(--color-text-secondary)' }}>
								Reason for Call <span style={{ color: 'var(--color-primary-red)' }}>*</span>
							</label>
							<div
								style={{
									display: 'flex',
									flexWrap: 'wrap',
									gap: '0.75rem',
								}}>
								{REASON_OPTIONS.map((option) => {
									const isSelected = reasons.includes(option.value);
									return (
										<button
											key={option.value}
											type='button'
											onClick={() => toggleReason(option.value)}
											className='rounded-lg flex flex-col items-center justify-center gap-2 p-3 transition-all duration-200 relative'
											style={{
												flex: '1 1 100px',
												minWidth: '100px',
												maxWidth: '150px',
												minHeight: '80px',
												border: isSelected
													? '2px solid var(--color-primary-blue)'
													: '2px solid var(--color-border-light)',
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

							{/* Other Reason Text Input */}
							{reasons.includes('Other') && (
								<div className='mt-3'>
									<label className='block text-sm font-medium mb-1' style={{ color: 'var(--color-text-secondary)' }}>
										Please specify the other reason <span style={{ color: 'var(--color-primary-red)' }}>*</span>
									</label>
									<div className='relative'>
										<wa-icon
											name='pen'
											style={{
												position: 'absolute',
												left: '12px',
												top: '50%',
												transform: 'translateY(-50%)',
												color: 'var(--color-text-muted)',
												zIndex: 10,
												pointerEvents: 'none',
											}}
										/>
										<input
											type='text'
											value={otherReason}
											onChange={(e) => setOtherReason(e.target.value)}
											autoComplete='off'
											required
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
							)}
						</div>

						{/* Time Fields */}
						<div className='grid grid-cols-1 gap-4'>
							<div>
								<label className='block text-sm font-medium mb-1' style={{ color: 'var(--color-text-secondary)' }}>
									Call Start Time <span style={{ color: 'var(--color-primary-red)' }}>*</span>
								</label>
								<div className='flex gap-2 items-center'>
									<input
										type='datetime-local'
										value={timeStart}
										onChange={(e) => setTimeStart(e.target.value)}
										required
										className='flex-1 px-3 py-2 rounded-lg transition-all'
										style={{
											border: '2px solid var(--color-border-light)',
											backgroundColor: 'var(--color-bg-primary)',
											color: 'var(--color-text-primary)',
										}}
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
										value={timeEnd}
										onChange={(e) => setTimeEnd(e.target.value)}
										className='flex-1 px-3 py-2 rounded-lg transition-all'
										style={{
											border: '2px solid var(--color-border-light)',
											backgroundColor: 'var(--color-bg-primary)',
											color: 'var(--color-text-primary)',
										}}
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

						{/* Comments */}
						<div>
							<label className='block text-sm font-medium mb-1' style={{ color: 'var(--color-text-secondary)' }}>
								Comments / Notes
							</label>
							<textarea
								value={comments}
								onChange={(e) => setComments(e.target.value)}
								rows={3}
								className='w-full px-3 py-2 rounded-lg transition-all'
								style={{
									border: '2px solid var(--color-border-light)',
									backgroundColor: 'var(--color-bg-primary)',
									color: 'var(--color-text-primary)',
								}}
								onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary-blue)')}
								onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border-light)')}
							/>
						</div>

						{/* Buttons */}
						<div className='flex gap-3 pt-2'>
							<button type='button' onClick={onClose} className='btn btn-danger flex-1' disabled={loading}>
								<wa-icon name='xmark' />
								Cancel
							</button>
							<button type='submit' className='btn btn-success flex-[2]' disabled={loading}>
								{loading ? (
									<>
										<wa-spinner />
										Saving...
									</>
								) : (
									<>
										<wa-icon name='check' />
										Save Changes
									</>
								)}
							</button>
						</div>
					</form>
				</div>
			</div>
		</div>
	);
}

// Edit Profile Modal Component
function EditProfileModal({
	user,
	onClose,
	onSave,
	formatPhoneNumber,
}: {
	user: User;
	onClose: () => void;
	onSave: (updatedUser: User) => void;
	formatPhoneNumber: (value: string) => string;
}) {
	const [name, setName] = useState(user.name);
	const [email, setEmail] = useState(user.email || '');
	const [phone, setPhone] = useState(user.phone ? formatPhoneNumber(user.phone) : '');
	const [jobTitle, setJobTitle] = useState(user.jobTitle || '');
	const [department, setDepartment] = useState(user.department || '');
	const [profileImage, setProfileImage] = useState<string | null>(user.profileImage || null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');

	// Handle profile image upload
	const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			// Validate file type
			if (!file.type.startsWith('image/')) {
				setError('Please upload an image file');
				return;
			}
			// Validate file size (max 2MB)
			if (file.size > 2 * 1024 * 1024) {
				setError('Image must be less than 2MB');
				return;
			}

			const reader = new FileReader();
			reader.onloadend = () => {
				setProfileImage(reader.result as string);
			};
			reader.readAsDataURL(file);
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError('');

		if (name.trim().length < 2) {
			setError('Name must be at least 2 characters');
			return;
		}

		if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			setError('Please enter a valid email address');
			return;
		}

		if (phone) {
			const phoneDigits = phone.replace(/\D/g, '');
			if (phoneDigits.length !== 10) {
				setError('Please enter a valid 10-digit phone number');
				return;
			}
		}

		setLoading(true);

		try {
			const res = await fetch('/api/auth/me', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: name.trim(),
					email: email.trim() || null,
					phone: phone.replace(/\D/g, '') || null,
					jobTitle: jobTitle.trim() || null,
					department: department || null,
					profileImage,
				}),
			});

			if (res.ok) {
				const data = await res.json();
				onSave(data);
			} else {
				const data = await res.json();
				setError(data.error || 'Failed to update profile');
			}
		} catch (err) {
			setError('An error occurred. Please try again.');
		} finally {
			setLoading(false);
		}
	};

	return (
		<div
			className='fixed inset-0 z-50 flex items-center justify-center p-4'
			style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
			onClick={onClose}>
			<div
				className='rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto'
				style={{ backgroundColor: 'var(--color-bg-primary)', boxShadow: 'var(--shadow-lg)' }}
				onClick={(e) => e.stopPropagation()}>
				{/* Header */}
				<div
					className='modal-header flex justify-between items-center p-4'
					style={{ borderBottom: '1px solid var(--color-border-light)' }}>
					<h3 className='text-lg font-semibold' style={{ color: 'var(--color-primary-blue)' }}>
						<wa-icon name='user-pen' style={{ marginRight: '0.5rem' }} />
						Edit Profile
					</h3>
					<button onClick={onClose} className='btn btn-danger btn-icon'>
						<wa-icon name='xmark' />
					</button>
				</div>

				{/* Content */}
				<div className='p-4'>
					{error && (
						<div
							className='p-3 rounded-lg mb-4 flex items-center gap-2'
							style={{ backgroundColor: 'rgba(198, 0, 54, 0.1)', color: 'var(--color-primary-red)' }}>
							<wa-icon name='exclamation-triangle' style={{ margin: '0' }} />
							{error}
						</div>
					)}

					<form onSubmit={handleSubmit} className='space-y-4'>
						{/* Profile Image */}
						<div className='flex flex-col items-center gap-3 mb-4'>
							<div
								className='w-24 h-24 rounded-full flex items-center justify-center overflow-hidden relative'
								style={{ backgroundColor: 'var(--color-primary-blue)' }}>
								{profileImage ? (
									<img src={profileImage} alt='Profile' className='w-full h-full object-cover' />
								) : (
									<wa-icon name='user' style={{ color: '#fff', fontSize: '3rem' }} />
								)}
							</div>
							<label className='btn btn-neutral btn-sm cursor-pointer'>
								<wa-icon name='camera' />
								Upload Photo
								<input
									type='file'
									accept='image/*'
									onChange={handleImageUpload}
									className='hidden'
									style={{ margin: 0 }}
								/>
							</label>
							{profileImage && (
								<button type='button' onClick={() => setProfileImage(null)} className='btn btn-danger-outline btn-sm'>
									<wa-icon name='trash' />
									Remove Photo
								</button>
							)}
						</div>

						{/* Read-only fields */}
						<div
							className='grid grid-cols-2 gap-4 p-3 rounded-lg'
							style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
							<div>
								<label className='text-xs font-medium mb-1 block' style={{ color: 'var(--color-text-muted)' }}>
									Username
								</label>
								<div className='font-medium' style={{ color: 'var(--color-text-primary)' }}>
									@{user.username}
								</div>
							</div>
							<div className='flex flex-col'>
								<label className='text-xs font-medium mb-1 block' style={{ color: 'var(--color-text-muted)' }}>
									Account Type
								</label>
								<div>
									<span
										className='px-2 py-0.5 rounded-full text-xs font-medium'
										style={{
											backgroundColor:
												user.role === 'ADMINISTRATOR' ? 'var(--color-primary-red)' : 'var(--color-secondary-teal)',
											color: '#fff',
										}}>
										{user.role === 'ADMINISTRATOR' ? 'Administrator' : 'User'}
									</span>
								</div>
							</div>
						</div>

						{/* Full Name */}
						<div>
							<label className='text-sm font-medium mb-1.5 block' style={{ color: 'var(--color-text-secondary)' }}>
								Full Name <span style={{ color: 'var(--color-primary-red)' }}>*</span>
							</label>
							<div className='relative'>
								<wa-icon
									name='user'
									style={{
										position: 'absolute',
										left: '12px',
										top: '50%',
										transform: 'translateY(-50%)',
										color: 'var(--color-text-muted)',
									}}
								/>
								<input
									type='text'
									value={name}
									onChange={(e) => setName(e.target.value)}
									className='w-full py-2 rounded-lg'
									style={{
										paddingLeft: '40px',
										paddingRight: '16px',
										border: '2px solid var(--color-border-light)',
										backgroundColor: 'var(--color-bg-secondary)',
									}}
									required
								/>
							</div>
						</div>

						{/* Email */}
						<div>
							<label className='text-sm font-medium mb-1.5 block' style={{ color: 'var(--color-text-secondary)' }}>
								Email
							</label>
							<div className='relative'>
								<wa-icon
									name='envelope'
									style={{
										position: 'absolute',
										left: '12px',
										top: '50%',
										transform: 'translateY(-50%)',
										color: 'var(--color-text-muted)',
									}}
								/>
								<input
									type='email'
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									placeholder='your.email@example.com'
									className='w-full py-2 rounded-lg'
									style={{
										paddingLeft: '40px',
										paddingRight: '16px',
										border: '2px solid var(--color-border-light)',
										backgroundColor: 'var(--color-bg-secondary)',
									}}
								/>
							</div>
						</div>

						{/* Phone */}
						<div>
							<label className='text-sm font-medium mb-1.5 block' style={{ color: 'var(--color-text-secondary)' }}>
								Phone Number
							</label>
							<div className='relative'>
								<wa-icon
									name='phone'
									style={{
										position: 'absolute',
										left: '12px',
										top: '50%',
										transform: 'translateY(-50%)',
										color: 'var(--color-text-muted)',
									}}
								/>
								<input
									type='tel'
									value={phone}
									onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
									placeholder='(XXX) XXX-XXXX'
									className='w-full py-2 rounded-lg'
									style={{
										paddingLeft: '40px',
										paddingRight: '16px',
										border: '2px solid var(--color-border-light)',
										backgroundColor: 'var(--color-bg-secondary)',
									}}
								/>
							</div>
						</div>

						{/* Job Title */}
						<div>
							<label className='text-sm font-medium mb-1.5 block' style={{ color: 'var(--color-text-secondary)' }}>
								Job Title
							</label>
							<div className='relative'>
								<wa-icon
									name='briefcase'
									style={{
										position: 'absolute',
										left: '12px',
										top: '50%',
										transform: 'translateY(-50%)',
										color: 'var(--color-text-muted)',
									}}
								/>
								<input
									type='text'
									value={jobTitle}
									onChange={(e) => setJobTitle(e.target.value)}
									placeholder='e.g. Emergency Management Specialist'
									className='w-full py-2 rounded-lg'
									style={{
										paddingLeft: '40px',
										paddingRight: '16px',
										border: '2px solid var(--color-border-light)',
										backgroundColor: 'var(--color-bg-secondary)',
									}}
								/>
							</div>
						</div>

						{/* Department */}
						<div>
							<label className='text-sm font-medium mb-1.5 block' style={{ color: 'var(--color-text-secondary)' }}>
								Department
							</label>
							<div className='relative'>
								<wa-icon
									name='building'
									style={{
										position: 'absolute',
										left: '12px',
										top: '50%',
										transform: 'translateY(-50%)',
										color: 'var(--color-text-muted)',
										zIndex: 10,
										pointerEvents: 'none',
									}}
								/>
								<input
									type='text'
									value={department}
									onChange={(e) => setDepartment(e.target.value)}
									placeholder='Emergency Management'
									className='w-full py-2 rounded-lg'
									style={{
										paddingLeft: '40px',
										paddingRight: '16px',
										border: '2px solid var(--color-border-light)',
										backgroundColor: 'var(--color-bg-secondary)',
									}}
								/>
							</div>
						</div>

						{/* Action Buttons */}
						<div className='flex justify-end gap-3 pt-4' style={{ borderTop: '1px solid var(--color-border-light)' }}>
							<button type='button' onClick={onClose} className='btn btn-danger-outline flex-1'>
								<wa-icon name='xmark' />
								Cancel
							</button>
							<button type='submit' className='btn btn-success flex-[2]' disabled={loading}>
								{loading ? (
									<>
										<wa-spinner />
										Saving...
									</>
								) : (
									<>
										<wa-icon name='check' />
										Save Profile
									</>
								)}
							</button>
						</div>
					</form>
				</div>
			</div>
		</div>
	);
}
