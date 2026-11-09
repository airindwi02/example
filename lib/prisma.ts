import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  alanaPrisma?: PrismaClient;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required for the server database connection.");
  }

  // Prisma's schema URL parameter belongs to the adapter, not pg startup options.
  const url = new URL(connectionString);
  const schema = url.searchParams.get("schema") ?? "public";
  url.searchParams.delete("schema");

  const adapter = new PrismaPg(
    { connectionString: url.toString() },
    { schema },
  );
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.alanaPrisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.alanaPrisma = prisma;
}
