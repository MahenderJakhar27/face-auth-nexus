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

  // For 'prisma+postgres://' or other scenarios on Vercel/Local:
  // In Prisma 7, we MUST pass the URL explicitly via datasourceUrl.
  // We use a cast to bypass the TypeScript 'Unknown property' error that can occur 
  // if the client hasn't been generated with the latest schema yet.
  return new PrismaClient({
    datasourceUrl: url,
  } as any);
};

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
