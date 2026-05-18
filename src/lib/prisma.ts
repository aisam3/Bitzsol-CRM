import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import * as fs from "fs";
import * as path from "path";

// 1. Get raw database URL (either from process.env or direct file read to bypass Next.js caching)
let dbUrl = process.env.DATABASE_URL || "";

if (!dbUrl) {
  try {
    const envPath = path.join(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, "utf-8");
      const match = envContent.match(/DATABASE_URL="([^"]+)"/) || envContent.match(/DATABASE_URL=([^\s]+)/);
      if (match && match[1]) {
        dbUrl = match[1];
      }
    }
  } catch (e) {
    console.error("[Prisma Setup] Failed to read .env file directly:", e);
  }
}

// 2. Parse the Prisma 7 api_key if it is a prisma+postgres:// URL to get the direct TCP Postgres URL
let connectionString = dbUrl;
if (dbUrl.includes("api_key=")) {
  const keyMatch = dbUrl.match(/\?api_key=([^&"]+)/);
  if (keyMatch && keyMatch[1]) {
    try {
      const decoded = Buffer.from(keyMatch[1], "base64").toString("utf-8");
      const parsed = JSON.parse(decoded);
      if (parsed.databaseUrl) {
        connectionString = parsed.databaseUrl;
      }
    } catch (e) {
      console.error("[Prisma Setup] Failed to decode API key:", e);
    }
  }
}

console.log("[Prisma Setup] Using Direct TCP Connection:", connectionString ? "Parsed Successfully" : "Not Found");

// 3. Create pool and adapter
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Force recreate prisma client during development to prevent HMR caching of broken connections
let prismaInstance: PrismaClient;

if (process.env.NODE_ENV !== "production") {
  // If it's development, always instantiate a new client to bypass cached broken global clients
  prismaInstance = new PrismaClient({ adapter });
  globalForPrisma.prisma = prismaInstance;
} else {
  prismaInstance = globalForPrisma.prisma ?? new PrismaClient({ adapter });
}

export const prisma = prismaInstance;
