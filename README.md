# Call Logger

A Next.js application for logging and managing phone calls. Built with Next.js 16, TypeScript, and PostgreSQL.

## Prerequisites

- Node.js 18+
- PostgreSQL database (local or cloud-hosted like Neon)

## Getting Started

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd call-logger
npm install
```

### 2. Database Setup

This application uses PostgreSQL directly via the `pg` package. You need a PostgreSQL database.

#### Option A: Use Neon (Recommended for deployment)

1. Create a free account at [neon.tech](https://neon.tech)
2. Create a new project and database
3. Copy the connection string

#### Option B: Local PostgreSQL

1. Install PostgreSQL locally
2. Create a database: `createdb call_logger`
3. Use the connection string: `postgresql://username:password@localhost:5432/call_logger`

### 3. Environment Variables

Create a `.env` file in the project root:

```env
DATABASE_URL="postgresql://username:password@host:5432/database?sslmode=require"
JWT_SECRET="your-secure-secret-key-here"
```

For Neon databases, the connection string should include `?sslmode=require`.

### 4. Initialize the Database Schema

Run the following SQL to create the required tables:

```sql
-- Create Role enum type
DO $$ BEGIN
    CREATE TYPE "Role" AS ENUM ('USER', 'ADMINISTRATOR');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create User table
CREATE TABLE IF NOT EXISTS "User" (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    "jobTitle" TEXT,
    department TEXT,
    "profileImage" TEXT,
    role "Role" DEFAULT 'USER',
    approved BOOLEAN DEFAULT false,
    "approvedAt" TIMESTAMP,
    "approvedBy" TEXT,
    "mustResetPassword" BOOLEAN DEFAULT false,
    "tempPassword" TEXT,
    "passwordResetRequested" BOOLEAN DEFAULT false,
    "passwordResetRequestedAt" TIMESTAMP,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Create Call table
CREATE TABLE IF NOT EXISTS "Call" (
    id TEXT PRIMARY KEY,
    caller TEXT NOT NULL,
    "callerPhone" TEXT NOT NULL,
    reason TEXT NOT NULL,
    "timeStart" TIMESTAMP NOT NULL,
    "timeEnd" TIMESTAMP,
    comments TEXT,
    "callTakerId" TEXT NOT NULL REFERENCES "User"(id),
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Create ActivityLog table
CREATE TABLE IF NOT EXISTS "ActivityLog" (
    id TEXT PRIMARY KEY,
    action TEXT NOT NULL,
    description TEXT NOT NULL,
    "userId" TEXT,
    "targetId" TEXT,
    "targetType" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    metadata TEXT,
    "createdAt" TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "Call_callTakerId_idx" ON "Call"("callTakerId");
CREATE INDEX IF NOT EXISTS "Call_timeStart_idx" ON "Call"("timeStart");
CREATE INDEX IF NOT EXISTS "ActivityLog_userId_idx" ON "ActivityLog"("userId");
CREATE INDEX IF NOT EXISTS "ActivityLog_action_idx" ON "ActivityLog"(action);
CREATE INDEX IF NOT EXISTS "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");
```

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Features

- User registration and authentication with JWT
- Admin approval workflow for new users
- Call logging with caller info, reason, and timestamps
- Admin dashboard with statistics and activity logs
- Password reset functionality
- User role management (User/Administrator)

## Deployment on Vercel

1. Push your code to a Git repository
2. Connect your repository to Vercel
3. Add environment variables in Vercel project settings:
   - `DATABASE_URL`: Your Neon PostgreSQL connection string
   - `JWT_SECRET`: A secure random string for JWT signing
4. Deploy

## Tech Stack

- **Framework**: Next.js 16.1.1
- **Language**: TypeScript
- **Database**: PostgreSQL (via `pg` package)
- **Authentication**: JWT (via `jose`)
- **Styling**: Tailwind CSS 4
- **Hosting**: Vercel (recommended)

## Project Structure

```
call-logger/
├── app/
│   ├── api/           # API routes
│   │   ├── auth/      # Authentication endpoints
│   │   ├── calls/     # Call CRUD endpoints
│   │   └── admin/     # Admin endpoints
│   ├── admin/         # Admin dashboard page
│   ├── login/         # Login page
│   ├── register/      # Registration page
│   └── page.tsx       # Main call logging page
├── components/        # React components
├── lib/
│   ├── db.ts          # PostgreSQL connection pool
│   ├── auth.ts        # Authentication utilities
│   ├── activityLog.ts # Activity logging
│   └── types.ts       # TypeScript types
└── public/            # Static assets
```

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [node-postgres Documentation](https://node-postgres.com/)
