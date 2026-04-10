import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const createPrismaClient = () => {
  const url = process.env.DATABASE_URL;

  // 1. Build-time protection:
  // During 'next build', Vercel doesn't always provide the DATABASE_URL.
  // If the URL is missing, we create a 'lazy' client that doesn't initialize yet.
  if (!url) {
    return new PrismaClient(); // This will work during build but fail at runtime if still missing
  }

  // 2. Adapter Logic for standard Postgres:
  if (url.startsWith("postgres://") || url.startsWith("postgresql://")) {
    const pool = new Pool({ connectionString: url });
    const adapter = new PrismaPg(pool);
    return new PrismaClient({ adapter });
  }

  // 3. Prisma 7 Logic (prisma+postgres:// etc):
  return new PrismaClient();
};

// We use a Proxy or a simple getter to ensure Prisma is only initialized when first accessed.
// This prevents the 'InitializationError' during Vercel's build-time static analysis.
let prismaInstance: PrismaClient | null = null;

export const prisma = new Proxy({} as PrismaClient, {
  get: (target, prop) => {
    if (!prismaInstance) {
      prismaInstance = globalForPrisma.prisma || createPrismaClient();
      if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prismaInstance;
    }
    return (prismaInstance as any)[prop];
  }
});
