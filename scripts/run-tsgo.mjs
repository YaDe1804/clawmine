import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  acquireLocalHeavyCheckLockSync,
  applyLocalTsgoPolicy,
  shouldAcquireLocalHeavyCheckLockForTsgo,
} from "./lib/local-heavy-check-runtime.mjs";

const { args: finalArgs, env } = applyLocalTsgoPolicy(process.argv.slice(2), process.env);

const tsgoJs = path.resolve("node_modules", "@typescript/native-preview/bin/tsgo.js");
const tsgoPath = path.resolve("node_modules", ".bin", "tsgo");
const tsBuildInfoFile = readFlagValue(finalArgs, "--tsBuildInfoFile");
if (tsBuildInfoFile) {
  fs.mkdirSync(path.dirname(path.resolve(tsBuildInfoFile)), { recursive: true });
}
const releaseLock = shouldAcquireLocalHeavyCheckLockForTsgo(finalArgs, env)
  ? acquireLocalHeavyCheckLockSync({
      cwd: process.cwd(),
      env,
      toolName: "tsgo",
    })
  : () => {};

try {
  // Windows: avoid `shell: true` with `.bin/tsgo` shims — project paths with spaces
  // break cmd.exe argument splitting. Invoke tsgo.js via Node instead.
  const useNodeTsgo = process.platform === "win32" && fs.existsSync(tsgoJs);
  const result = spawnSync(useNodeTsgo ? process.execPath : tsgoPath, useNodeTsgo ? [tsgoJs, ...finalArgs] : finalArgs, {
    stdio: "inherit",
    env,
    shell: !useNodeTsgo && process.platform === "win32",
  });

  if (result.error) {
    throw result.error;
  }

  process.exitCode = result.status ?? 1;
} finally {
  releaseLock();
}

function readFlagValue(args, name) {
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === name) {
      return args[index + 1];
    }
    if (arg.startsWith(`${name}=`)) {
      return arg.slice(name.length + 1);
    }
  }
  return undefined;
}
