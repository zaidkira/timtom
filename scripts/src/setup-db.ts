import { spawn } from "node:child_process";
import path from "node:path";

function run(command: string, args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: process.env,
      stdio: "inherit",
      shell: process.platform === "win32",
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} failed with exit code ${code ?? "unknown"}`));
    });

    child.on("error", reject);
  });
}

async function setup() {
  const workspaceRoot = path.resolve(import.meta.dirname, "../..");

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required. Point it to your Supabase Postgres database.");
  }

  console.log("Using DATABASE_URL, pushing schema with drizzle-kit...");
  await run("pnpm", ["--filter", "@workspace/db", "run", "push"], workspaceRoot);

  console.log("Seeding database...");
  await run("pnpm", ["--filter", "@workspace/scripts", "run", "seed"], workspaceRoot);
}

setup().catch((err) => {
  console.error("Database setup failed:", err);
  process.exit(1);
});
