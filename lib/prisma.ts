
import { PrismaClient, definePrismaClientConfig } from '@prisma/client';


const globalForPrisma = globalThis as unknown as {
	prisma: PrismaClient | undefined;
};

export const prisma =
	globalForPrisma.prisma ?? new PrismaClient(definePrismaClientConfig());

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
