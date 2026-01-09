export type Role = 'USER' | 'ADMINISTRATOR';

export interface User {
	id: string;
	username: string;
	password: string;
	name: string;
	email: string | null;
	phone: string | null;
	jobTitle: string | null;
	department: string | null;
	profileImage: string | null;
	role: Role;
	approved: boolean;
	approvedAt: Date | null;
	approvedBy: string | null;
	mustResetPassword: boolean;
	tempPassword: string | null;
	passwordResetRequested: boolean;
	passwordResetRequestedAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
}

export interface Call {
	id: string;
	caller: string;
	callerPhone: string;
	reason: string;
	timeStart: Date;
	timeEnd: Date | null;
	comments: string | null;
	callTakerId: string;
	createdAt: Date;
	updatedAt: Date;
}

export interface CallWithCallTaker extends Call {
	callTaker: {
		id: string;
		name: string;
		username: string;
	};
}

export interface UserWithCallCount extends Omit<User, 'password' | 'tempPassword'> {
	_count: {
		calls: number;
	};
}
