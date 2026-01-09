'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';

interface User {
	id: string;
	username: string;
	name: string;
	role: 'USER' | 'ADMINISTRATOR';
	approved: boolean;
	approvedAt: string | null;
	approvedBy: string | null;
	passwordResetRequested: boolean;
	passwordResetRequestedAt: string | null;
	createdAt: string;
	_count?: { calls: number };
}

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

interface Stats {
	users: { total: number; pending: number; approved: number; passwordResetRequests: number; administrators: number };
	calls: { total: number; today: number; week: number; month: number };
	charts: {
		dailyCalls: { date: string; dayName: string; count: number }[];
		reasonBreakdown: { reason: string; count: number }[];
		topCallTakers: { id: string; name: string; username: string; callCount: number }[];
	};
	activity: { loginsToday: number };
}

interface ActivityLog {
	id: string;
	action: string;
	description: string;
	userId: string | null;
	targetId: string | null;
	targetType: string | null;
	createdAt: string;
	user: { id: string; name: string; username: string } | null;
}

interface CurrentUser {
	userId: string;
	username: string;
	name: string;
	role: string;
}

export default function AdminPage() {
	const router = useRouter();
	const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
	const [activeTab, setActiveTab] = useState<'users' | 'calls' | 'statistics' | 'activity'>('users');
	const [users, setUsers] = useState<User[]>([]);
	const [calls, setCalls] = useState<Call[]>([]);
	const [stats, setStats] = useState<Stats | null>(null);
	const [activities, setActivities] = useState<ActivityLog[]>([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState('');
	const [actionLoading, setActionLoading] = useState<string | null>(null);
	const [editingUser, setEditingUser] = useState<User | null>(null);
	const [deletingUser, setDeletingUser] = useState<User | null>(null);
	const [deletingCall, setDeletingCall] = useState<Call | null>(null);
	const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
	const [tempPassword, setTempPassword] = useState<string | null>(null);
	const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

	// Check if user is admin
	useEffect(() => {
		const checkAuth = async () => {
			try {
				const res = await fetch('/api/auth/me');
				if (!res.ok) {
					router.push('/login');
					return;
				}
				const data = await res.json();
				if (data.role !== 'ADMINISTRATOR') {
					router.push('/');
					return;
				}
				setCurrentUser(data);
			} catch {
				router.push('/login');
			}
		};
		checkAuth();
	}, [router]);

	// Fetch data
	const fetchData = useCallback(async () => {
		try {
			setLoading(true);
			const [statsRes, usersRes, callsRes, activityRes] = await Promise.all([
				fetch('/api/admin/stats'),
				fetch('/api/admin/users'),
				fetch(`/api/admin/calls?search=${encodeURIComponent(search)}`),
				fetch('/api/admin/activity?limit=50'),
			]);

			if (statsRes.ok) setStats(await statsRes.json());
			if (usersRes.ok) setUsers(await usersRes.json());
			if (callsRes.ok) {
				const data = await callsRes.json();
				setCalls(data.calls || []);
			}
			if (activityRes.ok) setActivities(await activityRes.json());
		} catch (error) {
			console.error('Error fetching data:', error);
		} finally {
			setLoading(false);
		}
	}, [search]);

	useEffect(() => {
		if (currentUser) {
			fetchData();
		}
	}, [currentUser, fetchData]);

	// Format phone number
	const formatPhoneNumber = (phone: string): string => {
		const digits = phone.replace(/\D/g, '');
		if (digits.length === 10) {
			return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
		}
		return phone;
	};

	// Approve user
	const handleApproveUser = async (userId: string, approved: boolean) => {
		setActionLoading(userId);
		try {
			const res = await fetch(`/api/admin/users/${userId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ approved }),
			});
			if (res.ok) {
				fetchData();
			}
		} catch (error) {
			console.error('Error updating user:', error);
		} finally {
			setActionLoading(null);
		}
	};

	// Change user role
	const handleChangeRole = async (userId: string, role: 'USER' | 'ADMINISTRATOR') => {
		setActionLoading(userId);
		try {
			const res = await fetch(`/api/admin/users/${userId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ role }),
			});
			if (res.ok) {
				fetchData();
				setEditingUser(null);
			}
		} catch (error) {
			console.error('Error updating user:', error);
		} finally {
			setActionLoading(null);
		}
	};

	// Delete user
	const handleDeleteUser = async (userId: string) => {
		setActionLoading(userId);
		try {
			const res = await fetch(`/api/admin/users/${userId}`, {
				method: 'DELETE',
			});
			if (res.ok) {
				fetchData();
				setDeletingUser(null);
			}
		} catch (error) {
			console.error('Error deleting user:', error);
		} finally {
			setActionLoading(null);
		}
	};

	// Delete call
	const handleDeleteCall = async (callId: string) => {
		setActionLoading(callId);
		try {
			const res = await fetch(`/api/admin/calls/${callId}`, {
				method: 'DELETE',
			});
			if (res.ok) {
				fetchData();
				setDeletingCall(null);
			}
		} catch (error) {
			console.error('Error deleting call:', error);
		} finally {
			setActionLoading(null);
		}
	};

	// Reset user password
	const handleResetPassword = async (userId: string) => {
		setActionLoading(userId);
		try {
			const res = await fetch(`/api/admin/users/${userId}/reset-password`, {
				method: 'POST',
			});
			if (res.ok) {
				const data = await res.json();
				setTempPassword(data.temporaryPassword);
			} else {
				console.error('Error resetting password');
			}
		} catch (error) {
			console.error('Error resetting password:', error);
		} finally {
			setActionLoading(null);
		}
	};

	// Logout
	const handleLogout = async () => {
		await fetch('/api/auth/logout', { method: 'POST' });
		router.push('/login');
	};

	// Get pending users count
	const pendingUsers = users.filter((u) => !u.approved);
	// Get users requesting password reset
	const passwordResetUsers = users.filter((u) => u.passwordResetRequested);

	if (!currentUser) {
		return (
			<div
				className='min-h-screen flex items-center justify-center'
				style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
				<wa-spinner style={{ fontSize: '3rem' }} />
			</div>
		);
	}

	return (
		<div className='min-h-screen flex flex-col' style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
			{/* Navigation */}
			<nav style={{ backgroundColor: 'var(--color-primary-blue)' }}>
				<div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
					<div className='flex justify-between items-center h-14 sm:h-16'>
						<div className='flex items-center gap-2 sm:gap-3'>
							<div
								className='w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center'
								style={{ backgroundColor: 'var(--color-primary-yellow)' }}>
								<wa-icon name='shield-halved' style={{ color: '#2F4A89', fontSize: '1rem' }} className='sm:text-xl' />
							</div>
							<div className='flex flex-col justify-center'>
								<span className='text-base sm:text-lg font-bold leading-tight' style={{ color: '#FFFFFF' }}>
									Admin Dashboard
								</span>
								<span
									className='text-[10px] sm:text-xs leading-tight hidden sm:block'
									style={{ color: 'rgba(255,255,255,0.8)' }}>
									PCEM Call Logger
								</span>
							</div>
						</div>
						<div className='flex items-center gap-1 sm:gap-2'>
							<ThemeToggle />
							<Link
								href='/'
								className='p-2 rounded-lg transition-colors flex items-center justify-center'
								style={{ color: 'var(--color-text-light)', backgroundColor: 'rgba(255,255,255,0.1)' }}
								onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)')}
								onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)')}
								title='Back to Call Logger'>
								<wa-icon name='house' style={{ fontSize: '1.1rem' }} />
							</Link>
							<button
								onClick={() => setShowLogoutConfirm(true)}
								className='px-2 sm:px-4 py-2 text-sm rounded-lg transition-colors'
								style={{ color: 'var(--color-text-light)', backgroundColor: 'rgba(255,255,255,0.1)' }}
								onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)')}
								onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)')}>
								<wa-icon name='right-from-bracket' style={{ marginRight: '0' }} className='sm:mr-2' />
								<span className='hidden sm:inline ml-2'>Logout</span>
							</button>
						</div>
					</div>
				</div>
			</nav>

			<div className='flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 w-full'>
				{/* Stats Cards */}
				{stats && (
					<div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6 sm:mb-8'>
						<div
							className='rounded-xl p-3 sm:p-4'
							style={{ backgroundColor: 'var(--color-bg-primary)', boxShadow: 'var(--shadow-lg)' }}>
							<div className='flex items-center gap-2 sm:gap-3'>
								<div className='p-2 sm:p-3 rounded-full' style={{ backgroundColor: 'rgba(47, 74, 137, 0.1)' }}>
									<wa-icon
										name='users'
										style={{ color: 'var(--color-primary-blue)', fontSize: '1rem' }}
										className='sm:text-xl'
									/>
								</div>
								<div>
									<div className='text-xl sm:text-2xl font-bold' style={{ color: 'var(--color-text-primary)' }}>
										{stats.users.total}
									</div>
									<div className='text-xs sm:text-sm' style={{ color: 'var(--color-text-muted)' }}>
										Total Users
									</div>
								</div>
							</div>
						</div>
						<div
							className='rounded-xl p-3 sm:p-4'
							style={{ backgroundColor: 'var(--color-bg-primary)', boxShadow: 'var(--shadow-lg)' }}>
							<div className='flex items-center gap-2 sm:gap-3'>
								<div className='p-2 sm:p-3 rounded-full' style={{ backgroundColor: 'rgba(243, 213, 43, 0.2)' }}>
									<wa-icon name='user-clock' style={{ color: '#B8A000', fontSize: '1rem' }} className='sm:text-xl' />
								</div>
								<div>
									<div className='text-xl sm:text-2xl font-bold' style={{ color: 'var(--color-text-primary)' }}>
										{stats.users.pending}
									</div>
									<div className='text-xs sm:text-sm' style={{ color: 'var(--color-text-muted)' }}>
										Pending
									</div>
								</div>
							</div>
						</div>
						<div
							className='rounded-xl p-3 sm:p-4'
							style={{ backgroundColor: 'var(--color-bg-primary)', boxShadow: 'var(--shadow-lg)' }}>
							<div className='flex items-center gap-2 sm:gap-3'>
								<div className='p-2 sm:p-3 rounded-full' style={{ backgroundColor: 'rgba(198, 0, 54, 0.1)' }}>
									<wa-icon
										name='key'
										style={{ color: 'var(--color-primary-red)', fontSize: '1rem' }}
										className='sm:text-xl'
									/>
								</div>
								<div>
									<div className='text-xl sm:text-2xl font-bold' style={{ color: 'var(--color-text-primary)' }}>
										{stats.users.passwordResetRequests}
									</div>
									<div className='text-xs sm:text-sm' style={{ color: 'var(--color-text-muted)' }}>
										Resets
									</div>
								</div>
							</div>
						</div>
						<div
							className='rounded-xl p-3 sm:p-4'
							style={{ backgroundColor: 'var(--color-bg-primary)', boxShadow: 'var(--shadow-lg)' }}>
							<div className='flex items-center gap-2 sm:gap-3'>
								<div className='p-2 sm:p-3 rounded-full' style={{ backgroundColor: 'rgba(0, 128, 128, 0.1)' }}>
									<wa-icon
										name='phone'
										style={{ color: 'var(--color-secondary-teal)', fontSize: '1rem' }}
										className='sm:text-xl'
									/>
								</div>
								<div>
									<div className='text-xl sm:text-2xl font-bold' style={{ color: 'var(--color-text-primary)' }}>
										{stats.calls.total}
									</div>
									<div className='text-xs sm:text-sm' style={{ color: 'var(--color-text-muted)' }}>
										Total Calls
									</div>
								</div>
							</div>
						</div>
						<div
							className='rounded-xl p-3 sm:p-4 col-span-2 sm:col-span-1'
							style={{ backgroundColor: 'var(--color-bg-primary)', boxShadow: 'var(--shadow-lg)' }}>
							<div className='flex items-center gap-2 sm:gap-3'>
								<div className='p-2 sm:p-3 rounded-full' style={{ backgroundColor: 'rgba(47, 74, 137, 0.1)' }}>
									<wa-icon
										name='calendar-day'
										style={{ color: 'var(--color-primary-blue)', fontSize: '1rem' }}
										className='sm:text-xl'
									/>
								</div>
								<div>
									<div className='text-xl sm:text-2xl font-bold' style={{ color: 'var(--color-text-primary)' }}>
										{stats.calls.today}
									</div>
									<div className='text-xs sm:text-sm' style={{ color: 'var(--color-text-muted)' }}>
										Calls Today
									</div>
								</div>
							</div>
						</div>
					</div>
				)}

				{/* Pending Approvals Alert */}
				{pendingUsers.length > 0 && (
					<div
						className='rounded-xl p-3 sm:p-4 mb-4 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3'
						style={{
							backgroundColor: 'rgba(243, 213, 43, 0.15)',
							border: '1px solid var(--color-primary-yellow)',
						}}>
						<div className='flex items-center gap-2 sm:gap-3'>
							<wa-icon name='bell' style={{ color: '#B8A000', fontSize: '1rem' }} className='sm:text-xl' />
							<span className='text-sm sm:text-base' style={{ color: 'var(--color-text-primary)' }}>
								<strong>{pendingUsers.length}</strong> user{pendingUsers.length !== 1 ? 's' : ''} awaiting approval
							</span>
						</div>
						<button
							onClick={() => setActiveTab('users')}
							className='px-3 py-1 text-xs sm:text-sm rounded-md font-medium w-full sm:w-auto'
							style={{ backgroundColor: 'var(--color-primary-yellow)', color: '#2F4A89' }}>
							Review Now
						</button>
					</div>
				)}

				{/* Password Reset Requests Alert */}
				{passwordResetUsers.length > 0 && (
					<div
						className='rounded-xl p-3 sm:p-4 mb-4 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3'
						style={{
							backgroundColor: 'rgba(198, 0, 54, 0.1)',
							border: '1px solid var(--color-primary-red)',
						}}>
						<div className='flex items-center gap-2 sm:gap-3'>
							<wa-icon
								name='key'
								style={{ color: 'var(--color-primary-red)', fontSize: '1rem' }}
								className='sm:text-xl'
							/>
							<span className='text-sm sm:text-base' style={{ color: 'var(--color-text-primary)' }}>
								<strong>{passwordResetUsers.length}</strong> user{passwordResetUsers.length !== 1 ? 's' : ''} requesting
								password reset
							</span>
						</div>
						<button
							onClick={() => setActiveTab('users')}
							className='px-3 py-1 text-xs sm:text-sm rounded-md font-medium w-full sm:w-auto'
							style={{ backgroundColor: 'var(--color-primary-red)', color: '#fff' }}>
							View Users
						</button>
					</div>
				)}

				{/* Tabs */}
				<div
					className='rounded-xl overflow-hidden'
					style={{ backgroundColor: 'var(--color-bg-primary)', boxShadow: 'var(--shadow-lg)' }}>
					<div className='flex flex-wrap border-b' style={{ borderColor: 'var(--color-border)' }}>
						<button
							onClick={() => setActiveTab('users')}
							className='flex-1 min-w-[120px] py-3 sm:py-4 px-3 sm:px-6 text-xs sm:text-sm font-medium transition-colors'
							style={{
								backgroundColor: activeTab === 'users' ? 'var(--color-bg-primary)' : 'transparent',
								color: activeTab === 'users' ? 'var(--color-primary-blue)' : 'var(--color-text-muted)',
								borderBottom: activeTab === 'users' ? '2px solid var(--color-primary-blue)' : '2px solid transparent',
							}}>
							<wa-icon name='users' style={{ marginRight: '0.5rem' }} />
							<span className='hidden sm:inline'>Users</span> ({users.length})
						</button>
						<button
							onClick={() => setActiveTab('calls')}
							className='flex-1 min-w-[120px] py-3 sm:py-4 px-3 sm:px-6 text-xs sm:text-sm font-medium transition-colors'
							style={{
								backgroundColor: activeTab === 'calls' ? 'var(--color-bg-primary)' : 'transparent',
								color: activeTab === 'calls' ? 'var(--color-primary-blue)' : 'var(--color-text-muted)',
								borderBottom: activeTab === 'calls' ? '2px solid var(--color-primary-blue)' : '2px solid transparent',
							}}>
							<wa-icon name='phone' style={{ marginRight: '0.5rem' }} />
							<span className='hidden sm:inline'>Calls</span> ({calls.length})
						</button>
						<button
							onClick={() => setActiveTab('statistics')}
							className='flex-1 min-w-[120px] py-3 sm:py-4 px-3 sm:px-6 text-xs sm:text-sm font-medium transition-colors'
							style={{
								backgroundColor: activeTab === 'statistics' ? 'var(--color-bg-primary)' : 'transparent',
								color: activeTab === 'statistics' ? 'var(--color-primary-blue)' : 'var(--color-text-muted)',
								borderBottom:
									activeTab === 'statistics' ? '2px solid var(--color-primary-blue)' : '2px solid transparent',
							}}>
							<wa-icon name='chart-simple' style={{ marginRight: '0.5rem' }} />
							<span className='hidden sm:inline'>Statistics</span>
						</button>
						<button
							onClick={() => setActiveTab('activity')}
							className='flex-1 min-w-[120px] py-3 sm:py-4 px-3 sm:px-6 text-xs sm:text-sm font-medium transition-colors'
							style={{
								backgroundColor: activeTab === 'activity' ? 'var(--color-bg-primary)' : 'transparent',
								color: activeTab === 'activity' ? 'var(--color-primary-blue)' : 'var(--color-text-muted)',
								borderBottom:
									activeTab === 'activity' ? '2px solid var(--color-primary-blue)' : '2px solid transparent',
							}}>
							<wa-icon name='clock-rotate-left' style={{ marginRight: '0.5rem' }} />
							<span className='hidden sm:inline'>Activity</span>
						</button>
					</div>

					{/* Search Bar (for calls tab) */}
					{activeTab === 'calls' && (
						<div className='p-4 border-b' style={{ borderColor: 'var(--color-border)' }}>
							<div className='relative max-w-md flex items-center'>
								<wa-icon
									name='magnifying-glass'
									style={{
										position: 'absolute',
										left: '12px',
										top: '50%',
										transform: 'translateY(-50%)',
										color: 'var(--color-text-muted)',
										fontSize: '1rem',
										pointerEvents: 'none',
									}}
								/>
								<input
									type='text'
									placeholder='Search calls by caller, phone, reason, or call taker...'
									value={search}
									onChange={(e) => setSearch(e.target.value)}
									className='w-full py-2 rounded-lg'
									style={{
										paddingLeft: '40px',
										paddingRight: '16px',
										backgroundColor: 'var(--color-bg-secondary)',
										border: '1px solid var(--color-border)',
										color: 'var(--color-text-primary)',
									}}
								/>
							</div>
						</div>
					)}

					{/* Content */}
					<div className='p-4'>
						{loading ? (
							<div className='flex justify-center py-12'>
								<wa-spinner style={{ fontSize: '2rem' }} />
							</div>
						) : activeTab === 'users' ? (
							/* Users Table */
							<div className='overflow-x-auto'>
								<table className='min-w-full'>
									<thead>
										<tr style={{ borderBottom: '1px solid var(--color-border)' }}>
											<th
												className='px-4 py-3 text-left text-xs font-medium uppercase'
												style={{ color: 'var(--color-text-muted)' }}>
												User
											</th>
											<th
												className='px-4 py-3 text-left text-xs font-medium uppercase'
												style={{ color: 'var(--color-text-muted)' }}>
												Role
											</th>
											<th
												className='px-4 py-3 text-left text-xs font-medium uppercase'
												style={{ color: 'var(--color-text-muted)' }}>
												Status
											</th>
											<th
												className='px-4 py-3 text-left text-xs font-medium uppercase'
												style={{ color: 'var(--color-text-muted)' }}>
												Calls
											</th>
											<th
												className='px-4 py-3 text-left text-xs font-medium uppercase'
												style={{ color: 'var(--color-text-muted)' }}>
												Registered
											</th>
											<th
												className='px-4 py-3 text-right text-xs font-medium uppercase'
												style={{ color: 'var(--color-text-muted)' }}>
												Actions
											</th>
										</tr>
									</thead>
									<tbody>
										{users.map((user) => (
											<tr key={user.id} style={{ borderBottom: '1px solid var(--color-border-light)' }}>
												<td className='px-4 py-3'>
													<div className='flex items-center gap-3'>
														<div
															className='w-8 h-8 rounded-full flex items-center justify-center'
															style={{
																backgroundColor: user.approved
																	? 'var(--color-primary-blue)'
																	: 'var(--color-text-muted)',
															}}>
															<wa-icon name='user' style={{ color: '#fff', fontSize: '0.875rem' }} />
														</div>
														<div>
															<div className='font-medium' style={{ color: 'var(--color-text-primary)' }}>
																{user.name}
															</div>
															<div className='text-sm' style={{ color: 'var(--color-text-muted)' }}>
																@{user.username}
															</div>
														</div>
													</div>
												</td>
												<td className='px-4 py-3'>
													<span
														className='px-2 py-1 rounded-full text-xs font-medium'
														style={{
															backgroundColor:
																user.role === 'ADMINISTRATOR'
																	? 'var(--color-primary-red)'
																	: 'var(--color-secondary-teal)',
															color: '#fff',
														}}>
														{user.role === 'ADMINISTRATOR' ? 'Admin' : 'User'}
													</span>
												</td>
												<td className='px-4 py-3'>
													<div className='flex flex-wrap gap-1'>
														<span
															className='px-2 py-1 rounded-full text-xs font-medium'
															style={{
																backgroundColor: user.approved ? 'rgba(0, 128, 128, 0.1)' : 'rgba(243, 213, 43, 0.2)',
																color: user.approved ? 'var(--color-secondary-teal)' : '#B8A000',
															}}>
															{user.approved ? 'Approved' : 'Pending'}
														</span>
														{user.passwordResetRequested && (
															<span
																className='px-2 py-1 rounded-full text-xs font-medium'
																style={{
																	backgroundColor: 'rgba(198, 0, 54, 0.1)',
																	color: 'var(--color-primary-red)',
																}}>
																<wa-icon name='key' style={{ fontSize: '0.7rem', marginRight: '0.25rem' }} />
																Reset Requested
															</span>
														)}
													</div>
												</td>
												<td className='px-4 py-3' style={{ color: 'var(--color-text-secondary)' }}>
													{user._count?.calls || 0}
												</td>
												<td className='px-4 py-3' style={{ color: 'var(--color-text-secondary)' }}>
													{new Date(user.createdAt).toLocaleDateString()}
												</td>
												<td className='px-4 py-3 text-right'>
													<div className='flex items-center justify-end gap-1'>
														{!user.approved && (
															<button
																onClick={() => handleApproveUser(user.id, true)}
																disabled={actionLoading === user.id}
																className='px-2.5 py-1.5 text-xs rounded-md font-medium transition-colors flex items-center gap-1'
																style={{ backgroundColor: 'var(--color-secondary-teal)', color: '#fff' }}>
																{actionLoading === user.id ? (
																	<wa-spinner style={{ fontSize: '0.75rem' }} />
																) : (
																	<>
																		<wa-icon name='check' style={{ fontSize: '0.75rem' }} />
																		Approve
																	</>
																)}
															</button>
														)}
														{user.id !== currentUser?.userId && (
															<>
																<button
																	onClick={() => setResetPasswordUser(user)}
																	className='p-1.5 rounded-md transition-colors flex items-center justify-center'
																	style={{
																		backgroundColor: user.passwordResetRequested
																			? 'var(--color-primary-red)'
																			: 'rgba(47, 74, 137, 0.1)',
																		color: user.passwordResetRequested ? '#fff' : 'var(--color-primary-blue)',
																	}}
																	title={user.passwordResetRequested ? 'Reset Password (Requested)' : 'Reset Password'}>
																	<wa-icon name='key' style={{ fontSize: '0.875rem' }} />
																</button>
																<button
																	onClick={() => setEditingUser(user)}
																	className='p-1.5 rounded-md transition-colors flex items-center justify-center'
																	style={{
																		backgroundColor: 'rgba(107, 114, 128, 0.1)',
																		color: 'var(--color-text-secondary)',
																	}}
																	title='Edit Role'>
																	<wa-icon name='pen-to-square' style={{ fontSize: '0.875rem' }} />
																</button>
																<button
																	onClick={() => setDeletingUser(user)}
																	className='p-1.5 rounded-md transition-colors flex items-center justify-center'
																	style={{
																		backgroundColor: 'rgba(198, 0, 54, 0.1)',
																		color: 'var(--color-primary-red)',
																	}}
																	title='Delete User'>
																	<wa-icon name='trash' style={{ fontSize: '0.875rem' }} />
																</button>
															</>
														)}
													</div>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						) : activeTab === 'calls' ? (
							/* Calls Table */
							<div className='overflow-x-auto'>
								<table className='min-w-full'>
									<thead>
										<tr style={{ borderBottom: '1px solid var(--color-border)' }}>
											<th
												className='px-4 py-3 text-left text-xs font-medium uppercase'
												style={{ color: 'var(--color-text-muted)' }}>
												Caller
											</th>
											<th
												className='px-4 py-3 text-left text-xs font-medium uppercase'
												style={{ color: 'var(--color-text-muted)' }}>
												Phone
											</th>
											<th
												className='px-4 py-3 text-left text-xs font-medium uppercase'
												style={{ color: 'var(--color-text-muted)' }}>
												Reason
											</th>
											<th
												className='px-4 py-3 text-left text-xs font-medium uppercase'
												style={{ color: 'var(--color-text-muted)' }}>
												Time Start
											</th>
											<th
												className='px-4 py-3 text-left text-xs font-medium uppercase'
												style={{ color: 'var(--color-text-muted)' }}>
												Time End
											</th>
											<th
												className='px-4 py-3 text-left text-xs font-medium uppercase'
												style={{ color: 'var(--color-text-muted)' }}>
												Comments
											</th>
											<th
												className='px-4 py-3 text-left text-xs font-medium uppercase'
												style={{ color: 'var(--color-text-muted)' }}>
												Call Taker
											</th>
											<th
												className='px-4 py-3 text-left text-xs font-medium uppercase'
												style={{ color: 'var(--color-text-muted)' }}>
												Date
											</th>
											<th
												className='px-4 py-3 text-right text-xs font-medium uppercase'
												style={{ color: 'var(--color-text-muted)' }}>
												Actions
											</th>
										</tr>
									</thead>
									<tbody>
										{calls.map((call) => (
											<tr key={call.id} style={{ borderBottom: '1px solid var(--color-border-light)' }}>
												<td className='px-4 py-3' style={{ color: 'var(--color-text-primary)' }}>
													{call.caller}
												</td>
												<td className='px-4 py-3' style={{ color: 'var(--color-text-secondary)' }}>
													{formatPhoneNumber(call.callerPhone)}
												</td>
												<td className='px-4 py-3'>
													<div className='flex flex-wrap gap-1'>
														{call.reason.split(',').map((r, i) => (
															<span
																key={i}
																className='px-2 py-0.5 rounded text-xs'
																style={{
																	backgroundColor: 'rgba(47, 74, 137, 0.1)',
																	color: 'var(--color-primary-blue)',
																}}>
																{r.trim()}
															</span>
														))}
													</div>
												</td>
												<td className='px-4 py-3' style={{ color: 'var(--color-text-secondary)' }}>
													{new Date(call.timeStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
												</td>
												<td className='px-4 py-3' style={{ color: 'var(--color-text-secondary)' }}>
													{call.timeEnd
														? new Date(call.timeEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
														: '—'}
												</td>
												<td className='px-4 py-3' style={{ color: 'var(--color-text-secondary)', maxWidth: '200px' }}>
													<span className='truncate block' title={call.comments || ''}>
														{call.comments || '—'}
													</span>
												</td>
												<td className='px-4 py-3' style={{ color: 'var(--color-text-secondary)' }}>
													{call.callTaker.name}
												</td>
												<td className='px-4 py-3' style={{ color: 'var(--color-text-secondary)' }}>
													{new Date(call.createdAt).toLocaleDateString()}
												</td>
												<td className='px-4 py-3 text-right'>
													<button
														onClick={() => setDeletingCall(call)}
														className='p-2 rounded-lg transition-colors'
														style={{
															color: '#fff',
															backgroundColor: 'var(--color-primary-red)',
														}}
														onMouseOver={(e) => (e.currentTarget.style.opacity = '0.8')}
														onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
														title='Delete Call'>
														<wa-icon name='trash' style={{ fontSize: '0.875rem' }} />
													</button>
												</td>
											</tr>
										))}
									</tbody>
								</table>
								{calls.length === 0 && (
									<div className='text-center py-8' style={{ color: 'var(--color-text-muted)' }}>
										No calls found
									</div>
								)}
							</div>
						) : activeTab === 'statistics' ? (
							/* Statistics Dashboard */
							<div className='p-4 sm:p-6 space-y-6'>
								{stats && (
									<>
										{/* Summary Stats */}
										<div className='grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4'>
											<div
												className='rounded-xl p-4'
												style={{
													backgroundColor: 'var(--color-bg-secondary)',
													border: '1px solid var(--color-border)',
												}}>
												<div className='text-2xl sm:text-3xl font-bold' style={{ color: 'var(--color-primary-blue)' }}>
													{stats.calls.today}
												</div>
												<div className='text-xs sm:text-sm' style={{ color: 'var(--color-text-muted)' }}>
													Calls Today
												</div>
											</div>
											<div
												className='rounded-xl p-4'
												style={{
													backgroundColor: 'var(--color-bg-secondary)',
													border: '1px solid var(--color-border)',
												}}>
												<div
													className='text-2xl sm:text-3xl font-bold'
													style={{ color: 'var(--color-secondary-teal)' }}>
													{stats.calls.week}
												</div>
												<div className='text-xs sm:text-sm' style={{ color: 'var(--color-text-muted)' }}>
													Calls This Week
												</div>
											</div>
											<div
												className='rounded-xl p-4'
												style={{
													backgroundColor: 'var(--color-bg-secondary)',
													border: '1px solid var(--color-border)',
												}}>
												<div
													className='text-2xl sm:text-3xl font-bold'
													style={{ color: 'var(--color-primary-yellow)' }}>
													{stats.calls.month}
												</div>
												<div className='text-xs sm:text-sm' style={{ color: 'var(--color-text-muted)' }}>
													Calls This Month
												</div>
											</div>
											<div
												className='rounded-xl p-4'
												style={{
													backgroundColor: 'var(--color-bg-secondary)',
													border: '1px solid var(--color-border)',
												}}>
												<div className='text-2xl sm:text-3xl font-bold' style={{ color: 'var(--color-text-primary)' }}>
													{stats.calls.total}
												</div>
												<div className='text-xs sm:text-sm' style={{ color: 'var(--color-text-muted)' }}>
													Total Calls
												</div>
											</div>
										</div>

										{/* Charts Row */}
										<div className='grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6'>
											{/* Daily Calls Chart */}
											<div
												className='rounded-xl p-4 sm:p-6'
												style={{
													backgroundColor: 'var(--color-bg-secondary)',
													border: '1px solid var(--color-border)',
												}}>
												<h3
													className='text-sm sm:text-base font-semibold mb-4'
													style={{ color: 'var(--color-text-primary)' }}>
													<wa-icon
														name='chart-line'
														style={{ marginRight: '0.5rem', color: 'var(--color-primary-blue)' }}
													/>
													Calls - Last 7 Days
												</h3>
												<div className='flex items-end gap-1 sm:gap-2 h-32 sm:h-40'>
													{stats.charts.dailyCalls.map((day, i) => {
														const maxCount = Math.max(...stats.charts.dailyCalls.map((d) => d.count), 1);
														const heightPercent = (day.count / maxCount) * 100;
														return (
															<div key={i} className='flex-1 flex flex-col items-center'>
																<div
																	className='w-full rounded-t transition-all'
																	style={{
																		height: `${Math.max(heightPercent, 5)}%`,
																		backgroundColor: 'var(--color-primary-blue)',
																		minHeight: '4px',
																	}}
																	title={`${day.count} calls`}
																/>
																<div
																	className='text-[10px] sm:text-xs mt-1'
																	style={{ color: 'var(--color-text-muted)' }}>
																	{day.dayName}
																</div>
																<div
																	className='text-[10px] sm:text-xs font-medium'
																	style={{ color: 'var(--color-text-primary)' }}>
																	{day.count}
																</div>
															</div>
														);
													})}
												</div>
											</div>

											{/* Top Call Takers */}
											<div
												className='rounded-xl p-4 sm:p-6'
												style={{
													backgroundColor: 'var(--color-bg-secondary)',
													border: '1px solid var(--color-border)',
												}}>
												<h3
													className='text-sm sm:text-base font-semibold mb-4'
													style={{ color: 'var(--color-text-primary)' }}>
													<wa-icon
														name='trophy'
														style={{ marginRight: '0.5rem', color: 'var(--color-primary-yellow)' }}
													/>
													Top Call Takers
												</h3>
												<div className='space-y-3'>
													{stats.charts.topCallTakers.length === 0 ? (
														<div className='text-sm' style={{ color: 'var(--color-text-muted)' }}>
															No data yet
														</div>
													) : (
														stats.charts.topCallTakers.map((user, i) => {
															const maxCalls = Math.max(...stats.charts.topCallTakers.map((u) => u.callCount), 1);
															const widthPercent = (user.callCount / maxCalls) * 100;
															return (
																<div key={user.id} className='flex items-center gap-3'>
																	<div
																		className='w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold'
																		style={{
																			backgroundColor:
																				i === 0
																					? 'var(--color-primary-yellow)'
																					: i === 1
																					? '#C0C0C0'
																					: i === 2
																					? '#CD7F32'
																					: 'var(--color-bg-primary)',
																			color: i < 3 ? '#000' : 'var(--color-text-primary)',
																		}}>
																		{i + 1}
																	</div>
																	<div className='flex-1 min-w-0'>
																		<div
																			className='text-xs sm:text-sm font-medium truncate'
																			style={{ color: 'var(--color-text-primary)' }}>
																			{user.name}
																		</div>
																		<div
																			className='w-full h-2 rounded-full overflow-hidden'
																			style={{ backgroundColor: 'var(--color-border)' }}>
																			<div
																				className='h-full rounded-full'
																				style={{
																					width: `${widthPercent}%`,
																					backgroundColor: 'var(--color-secondary-teal)',
																				}}
																			/>
																		</div>
																	</div>
																	<div
																		className='text-xs sm:text-sm font-bold'
																		style={{ color: 'var(--color-text-primary)' }}>
																		{user.callCount}
																	</div>
																</div>
															);
														})
													)}
												</div>
											</div>
										</div>

										{/* Reason Breakdown */}
										<div
											className='rounded-xl p-4 sm:p-6'
											style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
											<h3
												className='text-sm sm:text-base font-semibold mb-4'
												style={{ color: 'var(--color-text-primary)' }}>
												<wa-icon name='tags' style={{ marginRight: '0.5rem', color: 'var(--color-secondary-teal)' }} />
												Calls by Reason
											</h3>
											{stats.charts.reasonBreakdown.length === 0 ? (
												<div className='text-sm' style={{ color: 'var(--color-text-muted)' }}>
													No data yet
												</div>
											) : (
												<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3'>
													{stats.charts.reasonBreakdown.map((item) => (
														<div
															key={item.reason}
															className='flex items-center justify-between p-3 rounded-lg'
															style={{ backgroundColor: 'var(--color-bg-primary)' }}>
															<span
																className='text-xs sm:text-sm truncate'
																style={{ color: 'var(--color-text-primary)' }}>
																{item.reason}
															</span>
															<span
																className='ml-2 px-2 py-1 rounded text-xs font-bold'
																style={{
																	backgroundColor: 'rgba(47, 74, 137, 0.1)',
																	color: 'var(--color-primary-blue)',
																}}>
																{item.count}
															</span>
														</div>
													))}
												</div>
											)}
										</div>

										{/* User Stats */}
										<div
											className='rounded-xl p-4 sm:p-6'
											style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
											<h3
												className='text-sm sm:text-base font-semibold mb-4'
												style={{ color: 'var(--color-text-primary)' }}>
												<wa-icon name='users' style={{ marginRight: '0.5rem', color: 'var(--color-primary-blue)' }} />
												User Statistics
											</h3>
											<div className='grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4'>
												<div
													className='text-center p-3 rounded-lg'
													style={{ backgroundColor: 'var(--color-bg-primary)' }}>
													<div className='text-xl sm:text-2xl font-bold' style={{ color: 'var(--color-primary-blue)' }}>
														{stats.users.total}
													</div>
													<div className='text-xs' style={{ color: 'var(--color-text-muted)' }}>
														Total Users
													</div>
												</div>
												<div
													className='text-center p-3 rounded-lg'
													style={{ backgroundColor: 'var(--color-bg-primary)' }}>
													<div
														className='text-xl sm:text-2xl font-bold'
														style={{ color: 'var(--color-secondary-teal)' }}>
														{stats.users.approved}
													</div>
													<div className='text-xs' style={{ color: 'var(--color-text-muted)' }}>
														Approved
													</div>
												</div>
												<div
													className='text-center p-3 rounded-lg'
													style={{ backgroundColor: 'var(--color-bg-primary)' }}>
													<div className='text-xl sm:text-2xl font-bold' style={{ color: '#B8A000' }}>
														{stats.users.pending}
													</div>
													<div className='text-xs' style={{ color: 'var(--color-text-muted)' }}>
														Pending
													</div>
												</div>
												<div
													className='text-center p-3 rounded-lg'
													style={{ backgroundColor: 'var(--color-bg-primary)' }}>
													<div className='text-xl sm:text-2xl font-bold' style={{ color: 'var(--color-primary-red)' }}>
														{stats.users.administrators}
													</div>
													<div className='text-xs' style={{ color: 'var(--color-text-muted)' }}>
														Admins
													</div>
												</div>
											</div>
										</div>
									</>
								)}
							</div>
						) : activeTab === 'activity' ? (
							/* Activity Log */
							<div className='p-4 sm:p-6'>
								<div className='space-y-3'>
									{activities.length === 0 ? (
										<div className='text-center py-8' style={{ color: 'var(--color-text-muted)' }}>
											No activity recorded yet
										</div>
									) : (
										activities.map((activity) => (
											<div
												key={activity.id}
												className='flex items-start gap-3 p-3 sm:p-4 rounded-lg'
												style={{
													backgroundColor: 'var(--color-bg-secondary)',
													border: '1px solid var(--color-border)',
												}}>
												<div
													className='w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0'
													style={{
														backgroundColor:
															activity.action === 'LOGIN'
																? 'rgba(0, 133, 119, 0.1)'
																: activity.action === 'LOGOUT'
																? 'rgba(107, 114, 128, 0.1)'
																: activity.action === 'CALL_CREATED'
																? 'rgba(47, 74, 137, 0.1)'
																: activity.action === 'USER_APPROVED'
																? 'rgba(0, 133, 119, 0.1)'
																: activity.action === 'USER_DELETED'
																? 'rgba(198, 0, 54, 0.1)'
																: activity.action === 'PASSWORD_RESET'
																? 'rgba(243, 213, 43, 0.2)'
																: 'rgba(47, 74, 137, 0.1)',
													}}>
													<wa-icon
														name={
															activity.action === 'LOGIN'
																? 'right-to-bracket'
																: activity.action === 'LOGOUT'
																? 'right-from-bracket'
																: activity.action === 'CALL_CREATED'
																? 'phone'
																: activity.action === 'USER_APPROVED'
																? 'user-check'
																: activity.action === 'USER_DELETED'
																? 'user-xmark'
																: activity.action === 'PASSWORD_RESET'
																? 'key'
																: activity.action === 'USER_ROLE_CHANGED'
																? 'user-gear'
																: 'circle-info'
														}
														style={{
															fontSize: '0.875rem',
															color:
																activity.action === 'LOGIN'
																	? 'var(--color-secondary-teal)'
																	: activity.action === 'LOGOUT'
																	? 'var(--color-text-muted)'
																	: activity.action === 'CALL_CREATED'
																	? 'var(--color-primary-blue)'
																	: activity.action === 'USER_APPROVED'
																	? 'var(--color-secondary-teal)'
																	: activity.action === 'USER_DELETED'
																	? 'var(--color-primary-red)'
																	: activity.action === 'PASSWORD_RESET'
																	? '#B8A000'
																	: 'var(--color-primary-blue)',
														}}
													/>
												</div>
												<div className='flex-1 min-w-0'>
													<p className='text-xs sm:text-sm' style={{ color: 'var(--color-text-primary)' }}>
														{activity.description}
													</p>
													<div className='flex flex-wrap items-center gap-2 mt-1'>
														<span
															className='px-2 py-0.5 rounded text-[10px] sm:text-xs'
															style={{
																backgroundColor: 'rgba(47, 74, 137, 0.1)',
																color: 'var(--color-primary-blue)',
															}}>
															{activity.action.replace(/_/g, ' ')}
														</span>
														<span className='text-[10px] sm:text-xs' style={{ color: 'var(--color-text-muted)' }}>
															{new Date(activity.createdAt).toLocaleString()}
														</span>
													</div>
												</div>
											</div>
										))
									)}
								</div>
							</div>
						) : null}
					</div>
				</div>
			</div>

			{/* Edit User Modal */}
			{editingUser && (
				<div
					className='fixed inset-0 z-50 flex items-center justify-center p-4'
					style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
					<div className='w-full max-w-md rounded-xl p-6' style={{ backgroundColor: 'var(--color-bg-primary)' }}>
						<h3 className='text-lg font-semibold mb-4' style={{ color: 'var(--color-primary-blue)' }}>
							Edit User: {editingUser.name}
						</h3>
						<div className='space-y-4'>
							<div>
								<label className='block text-sm font-medium mb-2' style={{ color: 'var(--color-text-primary)' }}>
									Role
								</label>
								<select
									value={editingUser.role}
									onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as 'USER' | 'ADMINISTRATOR' })}
									className='w-full px-3 py-2 rounded-md'
									style={{
										backgroundColor: 'var(--color-bg-secondary)',
										border: '1px solid var(--color-border)',
										color: 'var(--color-text-primary)',
									}}>
									<option value='USER'>User</option>
									<option value='ADMINISTRATOR'>Administrator</option>
								</select>
							</div>
							<div className='flex gap-2 pt-4'>
								<button onClick={() => setEditingUser(null)} className='btn btn-danger-outline flex-1'>
									<wa-icon name='xmark' />
									Cancel
								</button>
								<button
									onClick={() => handleChangeRole(editingUser.id, editingUser.role)}
									disabled={actionLoading === editingUser.id}
									className='btn btn-success flex-1'>
									{actionLoading === editingUser.id ? (
										<wa-spinner />
									) : (
										<>
											<wa-icon name='check' />
											Save Changes
										</>
									)}
								</button>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Delete User Confirmation Modal */}
			{deletingUser && (
				<div
					className='fixed inset-0 z-50 flex items-center justify-center p-4'
					style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
					<div className='w-full max-w-md rounded-xl p-6' style={{ backgroundColor: 'var(--color-bg-primary)' }}>
						<div className='flex items-center gap-3 mb-4'>
							<div className='p-3 rounded-full' style={{ backgroundColor: 'rgba(198, 0, 54, 0.1)' }}>
								<wa-icon
									name='triangle-exclamation'
									style={{ color: 'var(--color-primary-red)', fontSize: '1.5rem' }}
								/>
							</div>
							<h3 className='text-lg font-semibold' style={{ color: 'var(--color-text-primary)' }}>
								Delete User
							</h3>
						</div>
						<p className='mb-4' style={{ color: 'var(--color-text-secondary)' }}>
							Are you sure you want to delete <strong>{deletingUser.name}</strong>? This will also delete all their call
							records. This action cannot be undone.
						</p>
						<div className='flex gap-2'>
							<button onClick={() => setDeletingUser(null)} className='btn btn-danger-outline flex-1'>
								<wa-icon name='xmark' />
								Cancel
							</button>
							<button
								onClick={() => handleDeleteUser(deletingUser.id)}
								disabled={actionLoading === deletingUser.id}
								className='btn btn-danger flex-1'>
								{actionLoading === deletingUser.id ? (
									<wa-spinner />
								) : (
									<>
										<wa-icon name='trash' />
										Delete
									</>
								)}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Delete Call Confirmation Modal */}
			{deletingCall && (
				<div
					className='fixed inset-0 z-50 flex items-center justify-center p-4'
					style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
					<div className='w-full max-w-md rounded-xl p-6' style={{ backgroundColor: 'var(--color-bg-primary)' }}>
						<div className='flex items-center gap-3 mb-4'>
							<div className='p-3 rounded-full' style={{ backgroundColor: 'rgba(198, 0, 54, 0.1)' }}>
								<wa-icon
									name='triangle-exclamation'
									style={{ color: 'var(--color-primary-red)', fontSize: '1.5rem' }}
								/>
							</div>
							<h3 className='text-lg font-semibold' style={{ color: 'var(--color-text-primary)' }}>
								Delete Call Record
							</h3>
						</div>
						<p className='mb-4' style={{ color: 'var(--color-text-secondary)' }}>
							Are you sure you want to delete the call from <strong>{deletingCall.caller}</strong>? This action cannot
							be undone.
						</p>
						<div className='flex gap-2'>
							<button onClick={() => setDeletingCall(null)} className='btn btn-danger-outline flex-1'>
								<wa-icon name='xmark' />
								Cancel
							</button>
							<button
								onClick={() => handleDeleteCall(deletingCall.id)}
								disabled={actionLoading === deletingCall.id}
								className='btn btn-danger flex-1'>
								{actionLoading === deletingCall.id ? (
									<wa-spinner />
								) : (
									<>
										<wa-icon name='trash' />
										Delete
									</>
								)}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Reset Password Confirmation Modal */}
			{resetPasswordUser && !tempPassword && (
				<div
					className='fixed inset-0 z-50 flex items-center justify-center p-4'
					style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
					<div className='w-full max-w-md rounded-xl p-6' style={{ backgroundColor: 'var(--color-bg-primary)' }}>
						<div className='flex items-center gap-3 mb-4'>
							<div className='p-3 rounded-full' style={{ backgroundColor: 'rgba(47, 74, 137, 0.1)' }}>
								<wa-icon name='key' style={{ color: 'var(--color-primary-blue)', fontSize: '1.5rem' }} />
							</div>
							<h3 className='text-lg font-semibold' style={{ color: 'var(--color-text-primary)' }}>
								Reset Password
							</h3>
						</div>
						<p className='mb-4' style={{ color: 'var(--color-text-secondary)' }}>
							Are you sure you want to reset the password for <strong>{resetPasswordUser.name}</strong>?
						</p>
						<p className='mb-4 text-sm' style={{ color: 'var(--color-text-muted)' }}>
							A temporary password will be generated. The user will be required to change their password upon next
							login.
						</p>
						<div className='flex gap-2'>
							<button onClick={() => setResetPasswordUser(null)} className='btn btn-danger-outline flex-1'>
								<wa-icon name='xmark' />
								Cancel
							</button>
							<button
								onClick={() => handleResetPassword(resetPasswordUser.id)}
								disabled={actionLoading === resetPasswordUser.id}
								className='btn btn-primary flex-1'>
								{actionLoading === resetPasswordUser.id ? (
									<wa-spinner />
								) : (
									<>
										<wa-icon name='key' />
										Reset Password
									</>
								)}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Temporary Password Display Modal */}
			{tempPassword && resetPasswordUser && (
				<div
					className='fixed inset-0 z-50 flex items-center justify-center p-4'
					style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
					<div className='w-full max-w-md rounded-xl p-6' style={{ backgroundColor: 'var(--color-bg-primary)' }}>
						<div className='flex items-center gap-3 mb-4'>
							<div className='p-3 rounded-full' style={{ backgroundColor: 'rgba(0, 128, 128, 0.1)' }}>
								<wa-icon name='check-circle' style={{ color: 'var(--color-secondary-teal)', fontSize: '1.5rem' }} />
							</div>
							<h3 className='text-lg font-semibold' style={{ color: 'var(--color-text-primary)' }}>
								Password Reset Successful
							</h3>
						</div>
						<p className='mb-4' style={{ color: 'var(--color-text-secondary)' }}>
							The password for <strong>{resetPasswordUser.name}</strong> has been reset.
						</p>
						<div className='mb-4 p-4 rounded-lg' style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
							<label className='block text-sm font-medium mb-2' style={{ color: 'var(--color-text-muted)' }}>
								Temporary Password
							</label>
							<div className='flex items-center gap-2'>
								<code
									className='flex-1 px-3 py-2 rounded text-lg font-mono tracking-wide'
									style={{
										backgroundColor: 'var(--color-bg-primary)',
										border: '1px solid var(--color-border)',
										color: 'var(--color-text-primary)',
									}}>
									{tempPassword}
								</code>
								<button
									onClick={() => navigator.clipboard.writeText(tempPassword)}
									className='p-2 rounded-lg transition-colors'
									style={{ backgroundColor: 'var(--color-primary-blue)', color: '#fff' }}
									title='Copy to clipboard'>
									<wa-icon name='copy' />
								</button>
							</div>
						</div>
						<p className='mb-4 text-sm' style={{ color: 'var(--color-primary-red)' }}>
							<wa-icon name='triangle-exclamation' style={{ marginRight: '0.5rem' }} />
							Please share this password securely with the user. It will not be shown again.
						</p>
						<button
							onClick={() => {
								setTempPassword(null);
								setResetPasswordUser(null);
							}}
							className='btn btn-primary w-full'>
							<wa-icon name='check' />
							Done
						</button>
					</div>
				</div>
			)}

			{/* Logout Confirmation Modal */}
			{showLogoutConfirm && (
				<div
					className='fixed inset-0 z-50 flex items-center justify-center p-4'
					style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
					<div className='w-full max-w-sm rounded-xl p-6' style={{ backgroundColor: 'var(--color-bg-primary)' }}>
						<div className='flex items-center gap-3 mb-4'>
							<div className='p-3 rounded-full' style={{ backgroundColor: 'rgba(47, 74, 137, 0.1)' }}>
								<wa-icon name='right-from-bracket' style={{ color: 'var(--color-primary-blue)', fontSize: '1.5rem' }} />
							</div>
							<h3 className='text-lg font-semibold' style={{ color: 'var(--color-text-primary)' }}>
								Confirm Logout
							</h3>
						</div>
						<p className='mb-4' style={{ color: 'var(--color-text-secondary)' }}>
							Are you sure you want to logout?
						</p>
						<div className='flex gap-2'>
							<button
								onClick={() => setShowLogoutConfirm(false)}
								className='flex-1 px-4 py-2 text-sm rounded-lg transition-colors font-medium'
								style={{
									backgroundColor: 'var(--color-bg-secondary)',
									border: '1px solid var(--color-border)',
									color: 'var(--color-text-primary)',
								}}>
								<wa-icon name='xmark' style={{ marginRight: '0.5rem' }} />
								Cancel
							</button>
							<button
								onClick={handleLogout}
								className='flex-1 px-4 py-2 text-sm rounded-lg transition-colors font-medium'
								style={{ backgroundColor: 'var(--color-primary-red)', color: '#fff' }}>
								<wa-icon name='right-from-bracket' style={{ marginRight: '0.5rem' }} />
								Logout
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Footer */}
			<footer
				className='mt-auto py-6'
				style={{ backgroundColor: 'var(--color-bg-primary)', borderTop: '1px solid var(--color-border)' }}>
				<div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
					<div className='flex flex-col sm:flex-row justify-between items-center gap-4'>
						<div className='flex items-center gap-2'>
							<div
								className='w-8 h-8 rounded-full flex items-center justify-center'
								style={{ backgroundColor: 'var(--color-primary-blue)' }}>
								<wa-icon name='shield-halved' style={{ color: '#fff', fontSize: '0.875rem' }} />
							</div>
							<span className='text-sm font-medium' style={{ color: 'var(--color-text-secondary)' }}>
								Admin Dashboard
							</span>
						</div>
						<div className='text-sm' style={{ color: 'var(--color-text-muted)' }}>
							© {new Date().getFullYear()} Pinellas County Emergency Management
						</div>
					</div>
				</div>
			</footer>
		</div>
	);
}
