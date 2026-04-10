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

  // For 'prisma+postgres://' or high-latency scenarios on Vercel/Local:
  // In Prisma 7, connection details are strictly handled by prisma.config.ts.
  // We simply call new PrismaClient() and it will automatically look up the 
  // configuration defined in the root prisma.config.ts.
  return new PrismaClient();
};

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
