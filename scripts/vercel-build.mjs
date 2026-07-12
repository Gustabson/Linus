import { spawnSync } from "node:child_process";

const npx = process.platform === "win32" ? "npx.cmd" : "npx";
const baseline = "20260712223000_initial_baseline";

function run(args, capture = false) {
  const result = spawnSync(npx, args, {
    encoding: "utf8",
    env: process.env,
    stdio: capture ? "pipe" : "inherit",
  });
  if (capture) {
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
  }
  return result;
}

const deployment = run(["prisma", "migrate", "deploy"], true);
if (deployment.status !== 0) {
  const output = `${deployment.stdout ?? ""}\n${deployment.stderr ?? ""}`;
  if (!output.includes("P3005")) process.exit(deployment.status ?? 1);

  // One-time transition for the existing production database, which predates
  // Prisma Migrate. Synchronize it without destructive flags, then record the
  // full initial migration as the baseline. Future deploys use migrations only.
  const synchronized = run(["prisma", "db", "push"]);
  if (synchronized.status !== 0) process.exit(synchronized.status ?? 1);
  const resolved = run(["prisma", "migrate", "resolve", "--applied", baseline]);
  if (resolved.status !== 0) process.exit(resolved.status ?? 1);
}

for (const args of [["prisma", "generate"], ["next", "build"]]) {
  const result = run(args);
  if (result.status !== 0) process.exit(result.status ?? 1);
}
