import { existsSync, readFileSync } from "node:fs";
import { defineConfig } from "prisma/config";

for (const file of [".env", ".env.local"]) {
  if (!existsSync(file)) continue;
  const content = readFileSync(file, "utf8");
  for (const line of content.split("\n")) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (!match) continue;
    process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, "");
  }
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["REM_DATABASE_URL"],
  },
});
