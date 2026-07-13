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

  // One-time transition for a database that predates Prisma Migrate. The
  // initial migration describes that existing schema, so record it without
  // replaying it. Then run deploy again so every migration after the baseline
  // executes normally (including data-preserving transformations).
  const resolved = run(["prisma", "migrate", "resolve", "--applied", baseline]);
  if (resolved.status !== 0) process.exit(resolved.status ?? 1);
  const retry = run(["prisma", "migrate", "deploy"]);
  if (retry.status !== 0) process.exit(retry.status ?? 1);
}

for (const args of [["prisma", "generate"], ["next", "build"]]) {
  const result = run(args);
  if (result.status !== 0) process.exit(result.status ?? 1);
}
