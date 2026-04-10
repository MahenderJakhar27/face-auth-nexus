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

  // For 'prisma+postgres://' or other scenarios, provide the URL explicitly using the correct datasources property
  return new PrismaClient({
    datasources: {
      db: {
        url: url
      }
    }
  });
};

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
