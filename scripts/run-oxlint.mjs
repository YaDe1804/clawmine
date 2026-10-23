import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import {
  acquireLocalHeavyCheckLockSync,
  applyLocalOxlintPolicy,
  shouldAcquireLocalHeavyCheckLockForOxlint,
} from "./lib/local-heavy-check-runtime.mjs";

const require = createRequire(import.meta.url);
const oxlintCliJs = path.join(path.dirname(require.resolve("oxlint/package.json")), "bin", "oxlint");
const oxlintPath = path.resolve("node_modules", ".bin", "oxlint");
const PREPARE_EXTENSION_BOUNDARY_ARGS = [
  path.resolve("scripts", "prepare-extension-package-boundary-artifacts.mjs"),
];
const OXLINT_PREPARE_SKIP_FLAGS = new Set([
  "--help",
  "-h",
  "--version",
  "-V",
  "--print-config",
  "--rules",
  "--init",
  "--lsp",
]);
export function shouldPrepareExtensionPackageBoundaryArtifacts(args) {
  return !args.some((arg) => OXLINT_PREPARE_SKIP_FLAGS.has(arg));
}

function prepareExtensionPackageBoundaryArtifacts(env) {
  const releaseArtifactsLock = acquireLocalHeavyCheckLockSync({
    cwd: process.cwd(),
    env,
    toolName: "extension-package-boundary-artifacts",
    lockName: "extension-package-boundary-artifacts",
  });

  try {
    const result = spawnSync(process.execPath, PREPARE_EXTENSION_BOUNDARY_ARGS, {
      stdio: "inherit",
      env,
    });

    if (result.error) {
      throw result.error;
    }

    if ((result.status ?? 1) !== 0) {
      throw new Error(
        `prepare-extension-package-boundary-artifacts failed with exit code ${result.status ?? 1}`,
      );
    }
  } finally {
    releaseArtifactsLock();
  }
}

export function main(argv = process.argv.slice(2), runtimeEnv = process.env) {
  const { args: finalArgs, env } = applyLocalOxlintPolicy(argv, runtimeEnv);
  const releaseLock = shouldAcquireLocalHeavyCheckLockForOxlint(finalArgs, {
    cwd: process.cwd(),
    env,
  })
    ? acquireLocalHeavyCheckLockSync({
        cwd: process.cwd(),
        env,
        toolName: "oxlint",
      })
    : () => {};

  try {
    if (shouldPrepareExtensionPackageBoundaryArtifacts(finalArgs)) {
      prepareExtensionPackageBoundaryArtifacts(env);
    }

    // Windows: avoid `shell: true` with `.bin/oxlint` shims — cwd paths with spaces
    // break cmd.exe splitting. Invoke oxlint's Node entry directly (see run-tsgo.mjs).
    const useNodeOxlint = process.platform === "win32" && fs.existsSync(oxlintCliJs);
    const result = spawnSync(
      useNodeOxlint ? process.execPath : oxlintPath,
      useNodeOxlint ? [oxlintCliJs, ...finalArgs] : finalArgs,
      {
        stdio: "inherit",
        env,
        shell: !useNodeOxlint && process.platform === "win32",
      },
    );

    if (result.error) {
      throw result.error;
    }

    process.exitCode = result.status ?? 1;
  } finally {
    releaseLock();
  }
}

if (import.meta.main) {
  main();
}
