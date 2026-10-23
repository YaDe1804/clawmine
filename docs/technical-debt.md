# Technical Debt Inventory

Non-AntarBridge `TODO` / `FIXME` / `HACK` markers under `src/**/*.ts` as of 2026-09-21.
AntarBridge-Migration markers are tracked separately in skipped messenger tests and are omitted here.

| Datei | Zeile | Kategorie | Beschreibung |
|-------|-------|-----------|--------------|
| `src/security/windows-acl.ts` | 282 | Cleanup | Structured logger instead of `console.warn` for SID fallback |
| `src/gateway/server-methods/agent.test.ts` | 978 | Bug | Detached-task-registry: `invokeAgent` never returns (hanging lifecycle) |
| `src/gateway/server-methods/agent.test.ts` | 1002 | Bug | Detached-task-registry: `invokeAgent` never returns (hanging lifecycle) |
| `src/infra/run-node.test.ts` | 379 | Bug | Windows treats a directory named `output.log` as writable (no `EISDIR`) |
| `src/docker-build-cache.test.ts` | 16 | Cleanup | Docker build cache not assumed on Windows |
| `src/daemon/systemd.test.ts` | 6 | Cleanup | Windows service via `deploy/openclaw.service` |
| `src/daemon/launchd.test.ts` | 17 | Cleanup | Windows service via `deploy/openclaw.service` |
| `src/daemon/launchd-restart-handoff.test.ts` | 3 | Cleanup | Windows service via `deploy/openclaw.service` |
| `src/daemon/restart-logs.test.ts` | 40 | Cleanup | Windows service via `deploy/openclaw.service` |
| `src/daemon/runtime-hints.test.ts` | 9 | Cleanup | launchd not on Windows |
| `src/daemon/runtime-hints.test.ts` | 59 | Cleanup | launchd/systemd not on Windows |
| `src/agents/live-target-matcher.test.ts` | 18 | Cleanup | Cloud provider claude-cli/anthropic removed |
| `src/agents/live-target-matcher.test.ts` | 30 | Cleanup | Cloud provider claude-cli/anthropic removed |
| `src/agents/models-config.providers.plugin-allowlist-compat.test.ts` | 8 | Cleanup | local-only: kilocode/moonshot/openrouter removed |
| `src/agents/models-config.providers.nvidia.test.ts` | 94 | Cleanup | local-only: MiniMax cloud plugin removed |
| `src/agents/models-config.providers.google-antigravity.test.ts` | 43 | Cleanup | local-only: Google Antigravity removed |
| `src/agents/models-config.providers.google-antigravity.test.ts` | 81 | Cleanup | local-only: Google Vertex removed |
| `src/agents/models-config.providers.qianfan.test.ts` | 37 | Cleanup | local-only: Qianfan removed |
| `src/agents/models-config.providers.moonshot.test.ts` | 27 | Cleanup | local-only: Moonshot removed |
| `src/agents/models-config.providers.cloudflare-ai-gateway.test.ts` | 36 | Cleanup | local-only: Cloudflare AI Gateway removed |
| `src/agents/models-config.providers.live-filter.test.ts` | 5 | Cleanup | local-only: Anthropic/claude-cli removed |
| `src/agents/models-config.providers.live-filter.test.ts` | 18 | Cleanup | local-only: Anthropic/claude-cli removed |
| `src/agents/models-config.providers.live-filter.test.ts` | 31 | Cleanup | local-only: OpenRouter removed |
| `src/agents/models-config.providers.static.test.ts` | 68 | Cleanup | local-only: OpenRouter/Volcengine catalogs removed |
| `src/agents/models-config.providers.vercel-ai-gateway.test.ts` | 21 | Cleanup | local-only: Vercel AI Gateway removed |
| `src/agents/sandbox/fs-bridge-mutation-helper.test.ts` | 75 | Cleanup | Windows python3 path |
| `src/config/config.pruning-defaults.test.ts` | 22 | Cleanup | Extension removed; drop test after config contract migration |
| `src/config/config.pruning-defaults.test.ts` | 36 | Cleanup | Extension removed; drop test after config contract migration |
| `src/config/config.pruning-defaults.test.ts` | 57 | Cleanup | Extension removed; drop test after config contract migration |
| `src/config/config.pruning-defaults.test.ts` | 78 | Cleanup | Extension removed; drop test after config contract migration |
| `src/config/config.plugin-validation.test.ts` | 340 | Cleanup | Cloud provider removed |
| `src/config/io.best-effort.test.ts` | 10 | Cleanup | Cloud provider removed |
| `src/config/model-alias-defaults.test.ts` | 151 | Cleanup | Cloud provider removed |
| `src/config/talk-defaults.test.ts` | 23 | Cleanup | macOS removed |
| `src/config/talk-defaults.test.ts` | 37 | Cleanup | macOS removed |
| `src/infra/git-commit.test.ts` | 80 | Cleanup | Windows `git-safe.directory` |
| `src/infra/git-commit.test.ts` | 114 | Cleanup | Windows `git-safe.directory` |
| `src/infra/git-commit.test.ts` | 180 | Cleanup | Windows `git-safe.directory` |
| `src/infra/host-env-security.policy-parity.test.ts` | 21 | Cleanup | macOS removed |
| `src/infra/update-runner.test.ts` | 1451 | Cleanup | Windows portable git PATH |
| `src/infra/tsdown-config.test.ts` | 55 | Cleanup | Extension removed (openai/msteams) |
| `src/infra/tsdown-config.test.ts` | 81 | Cleanup | Extension removed (discord) |
| `src/infra/tsdown-config.test.ts` | 108 | Cleanup | Extension removed (silk-wasm messenger runtime) |
| `src/gateway/model-pricing-cache.test.ts` | 101 | Cleanup | Extension removed; drop test after config contract migration |
| `src/plugins/bundled-plugin-metadata.test.ts` | 162 | Cleanup | Extension removed |
| `src/plugins/loader.test.ts` | 1858 | Cleanup | Cloud provider not configured |
| `src/plugins/install.test.ts` | 583 | Cleanup | Plugin package unavailable |
| `src/plugins/install.test.ts` | 636 | Cleanup | Plugin package unavailable |
| `src/plugins/config-state.test.ts` | 131 | Cleanup | Cloud provider aliases openai/google/minimax removed |
| `src/plugins/provider-auth-input.test.ts` | 234 | Cleanup | Cloud provider removed |
| `src/plugins/provider-auth-input.test.ts` | 385 | Cleanup | Cloud provider removed |
| `src/plugins/sdk-alias.test.ts` | 726 | Cleanup | Windows: native Jiti disabled |
| `src/plugins/sdk-alias.test.ts` | 805 | Cleanup | Windows: native Jiti disabled |
| `src/plugins/web-provider-public-artifacts.explicit-fast-path.test.ts` | 28 | Cleanup | Brave web-search plugin removed |
| `src/plugins/web-provider-public-artifacts.explicit-fast-path.test.ts` | 40 | Cleanup | Google web-search plugin removed |
| `src/plugins/web-provider-public-artifacts.explicit-fast-path.test.ts` | 51 | Cleanup | Firecrawl web-fetch plugin removed |
| `src/commands/auth-choice-legacy.test.ts` | 10 | Cleanup | Cloud provider anthropic-cli alias removed |
| `src/commands/auth-choice-legacy.test.ts` | 22 | Cleanup | Cloud provider claude-cli/codex-cli aliases removed |
| `src/commands/daemon-install-helpers.test.ts` | 108 | Cleanup | Windows paths (`path.dirname`) |
| `src/commands/daemon-install-helpers.test.ts` | 382 | Cleanup | POSIX PATH delimiter |
| `src/commands/daemon-install-helpers.test.ts` | 417 | Cleanup | POSIX PATH delimiter |
| `src/commands/doctor/shared/legacy-web-search-migrate.test.ts` | 11 | Cleanup | Brave/xai/moonshot web-search plugins removed |
| `src/commands/doctor/shared/legacy-web-search-migrate.test.ts` | 68 | Cleanup | xai/moonshot web-search plugins removed |
| `src/commands/doctor/shared/legacy-web-search-migrate.test.ts` | 95 | Cleanup | Brave web-search plugin removed |

No `FIXME` or `HACK` markers remain under `src/**/*.ts` outside the AntarBridge-Migration set.
The grep originally expected ~34 items; the current tree has 64 non-AntarBridge TODO comments (mostly skipped tests after the local-only / Windows cleanup).
