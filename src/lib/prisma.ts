import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const createPrismaClient = () => {
  const url = process.env.DATABASE_URL;

  // Prisma 7 logic: 
  // If using a standard 'postgres://' or 'postgresql://' protocol, we use the adapter.
  if (url && (url.startsWith("postgres://") || url.startsWith("postgresql://"))) {
    const pool = new Pool({ connectionString: url });
    const adapter = new PrismaPg(pool);
    return new PrismaClient({ adapter });
  }

  // For 'prisma+postgres://' or other scenarios on Vercel/Local, 
  // simply calling new PrismaClient() will automatically use the DATABASE_URL environment variable.
  // Now that 'prisma generate' runs during build, this will be correctly typed.
  return new PrismaClient();
};

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
