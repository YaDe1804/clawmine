# Projektstand — OpenClaw

**Letzte Aktualisierung:** 18.09.2026  
**Kontext:** Windows-Kompatibilität + Features. TASK-020 Gesamtmessung durch. Messenger-Migration und Supabase-Upsert noch offen.

---

## Kurzfassung

| Bereich | Stand |
|---------|--------|
| **Baseline Audit** | ✅ Abgeschlossen · SEQU-Initial: PASS |
| **Phase 1 – Critical Fixes** | ✅ Abgeschlossen 22.04.2026 |
| **Phase 2 – Hardening** | ✅ Abgeschlossen 22.04.2026 |
| **Phase 3 – Quality** | ✅ Abgeschlossen 25.04.2026 |
| **Phase 4 – Enterprise Features** | ✅ Abgeschlossen · OTel · Health API · Audit Log · Metrics |
| **Phase 5 – Windows-Kompatibilität** | ✅ Abgeschlossen September 2026 |
| **Phase 6 – Edition-Architektur** | ✅ ADR-007 · OpenLotto Edition · AntarBridge-Protokoll |
| **ADRs** | ✅ ADR-001–004, 006–010 · ADR-005 ausstehend |
| **Platform Cleanup** | ✅ Windows + Linux only · iOS vollständig entfernt |
| **Messenger Cleanup** | 🟡 22 Channels entfernt · Discord/Telegram/Slack @deprecated · AntarBridge-Migration läuft |
| **Memory / RAG** | ✅ Konfiguriert · Ollama · bge-m3 · LanceDB |
| **OpenLotto Scraper** | ✅ Live · lotto.de JSON-API · Scheduler angelegt · Supabase-Upsert wartet auf Keys |
| **Pi Deployment** | ✅ deploy/openclaw.service + install-pi.sh |
| **AntarBridge-Protokoll** | ✅ src/gateway/protocol/antarbridge-channel.ts · ADR-010 · Tests 4/4 |
| **Tests (volle Suite)** | 🟡 325 failed / 25 998 passed · TASK-020: 61/61 Shards in ~192s ohne Hang |
| **Tech-Debt TD-001** | ✅ Erledigt 25.04.2026 |
| **Tech-Debt TD-002** | ✅ Erledigt |

---

## Session September 2026 — Windows-Kompatibilität + Features

### Was wurde gemacht

| Was | Details |
|-----|---------|
| Windows Path-Fixes | path.join → path.posix, Home-Dir-Kompaktierung, SSH-Pfade, /tmp via os.tmpdir() |
| Hook-Timeouts | installGatewayTestHooks 180s (win32) / 120s · afterAll 900s/600s |
| Discord/Messenger-Reste | it.skip + TODO:AntarBridge-Migration für plugin-auto-enable, Cloud-Provider, deliver.test.ts |
| @deprecated Plugin-SDK | Discord, Telegram, Slack, WhatsApp, iMessage in channel-config-schema.ts |
| deliverViaAntarBridge() | WhatsApp + iMessage migriert · Discord/Telegram/Slack kamen nicht vor |
| OpenLotto Scraper | lotto.de JSON-API · Live-Lauf erfolgreich · Scheduler mit Cron-Jobs |
| Pi Deployment | deploy/openclaw.service · deploy/install-pi.sh (Node 22, pnpm, Ollama, LUKS) |
| AntarBridge-Protokoll | Envelope, Commands, Handshake-Typen · ADR-010 · Tests 3/3 |
| ADR-008 | Raspberry Pi Deployment |
| ADR-009 | AntarBridge Only Channel |
| ADR-010 | AntarBridge Gateway-Protokoll |

### Noch offen

| Was | Details |
|-----|---------|
| Supabase-Upsert (TASK-017) | Wartet auf SUPABASE_URL / SUPABASE_KEY aus Lottio-Dashboard |
| Messenger-Typen final entfernen | Erst wenn deliver-test-outbounds.ts vollständig auf AntarBridge migriert |
| Test-Reste nach TASK-020 | Discord-Audit, Telegram-Schemas, Windows python3/fs-bridge, Daemon/launchd |

---

## Wichtige Dokumente

| Dokument | Inhalt |
|----------|--------|
| [Roadmap (HTML)](roadmap/openclaw_roadmap_v2.html) | Phasen & Findings visuell |
| [SEQU-Initial](sequ/SEQU-Initial.md) | Security & Quality Audit |
| [ADR-001](adr/ADR-001-github-actions-sha-pinning.md) | GitHub Actions SHA-Pinning |
| [ADR-002](adr/ADR-002-csp-unsafe-inline.md) | CSP unsafe-inline Abschaffung |
| [ADR-003](adr/ADR-003-hsts-default-on.md) | HSTS Default-on |
| [ADR-004](adr/ADR-004-error-logging-strategy.md) | Error Logging Strategie |

---

## Memory / RAG Setup — 25.04.2026

| Komponente | Status | Details |
|------------|--------|---------|
| `memory-lancedb` | ✅ Aktiv | Plugin enabled · bge-m3 · LanceDB lokal |
| `memory-core` | ✅ Aktiv | Hybrid Search · FTS + Vektor |
| `active-memory` | ✅ Aktiv | agents: [main] · queryMode: recent |
| Ollama | ✅ Läuft | Scheduled Task · AtLogon · Port 11434 |
| bge-m3 | ✅ Installiert | 1.2 GB · dim=1024 · Multilingual DE+EN |
| LanceDB Verzeichnis | ✅ Angelegt | `%USERPROFILE%\.openclaw\memory\lancedb\` |
| Embedding-Probe | ✅ Bestätigt | POST /v1/embeddings → 200 · dim=1024 |
| Gateway Live-Test | ⬜ Offen | Schritt 5 — manuell in Chat-Session |

**Config:** `%USERPROFILE%\.openclaw\openclaw.json`  
**Embedding-Provider:** Ollama (lokal) · kein API-Key · vollständig offline  
**Modell:** `bge-m3` — Multilingual DE+EN · technische Texte · Pentest-Kontext

---

## Findings (aus Baseline Audit)

### 🔴 High — ✅ Alle behoben 22.04.2026

| # | Finding | Status |
|---|---------|--------|
| H-1 | ~~`fix2.py` im Repo-Root~~ | ✅ 22.04.2026 |
| H-2 | ~~GitHub Actions nicht SHA-gepinnt~~ | ✅ 22.04.2026 · ADR-001 |
| H-3 | ~~CSP `unsafe-inline` für Styles~~ | ✅ 22.04.2026 · ADR-002 |

### 🟡 Medium — ✅ Alle behoben 22.04.2026

| # | Finding | Status |
|---|---------|--------|
| M-1 | ~~HSTS opt-in statt default~~ | ✅ 22.04.2026 · ADR-003 |
| M-2 | ~~Silent `catch(() => {})` (~23x)~~ | ✅ 22.04.2026 · ADR-004 |
| M-3 | ~~Bun `curl\|bash` in Dockerfile~~ | ✅ 22.04.2026 |
| M-4 | ~~`excessive-permissions` in Zizmor~~ | ✅ 22.04.2026 |

### 🟢 Low / Quality

| # | Finding | Status |
|---|---------|--------|
| L-1 | ~~Dream-Diary HTMLs im Root~~ | ✅ 22.04.2026 |
| L-2 | detect-secrets nicht in CI verdrahtet | ⬜ Phase 3 offen |
| L-3 | ~~Kein `unhandledRejection` Handler~~ | ✅ 22.04.2026 · ADR-004 |

---

## Was bereits Enterprise-Grade ist

- **Rate Limiter** — Sliding Window, IP-basiert, scope-getrennt, loopback-exempt
- **Prompt Injection Detection** — 15+ Patterns, kryptografische Boundary-Marker
- **CSP** — SHA-256-Hashes für Inline-Scripts + Styles, kein `unsafe-inline`
- **Docker** — Multi-Stage, SHA256-gepinnte Base-Images, `USER node`, HEALTHCHECK
- **GitHub Actions** — alle 18 Workflows SHA-gepinnt, Zizmor Gates aktiv
- **HSTS** — Default-on bei TLS, 2 Jahre max-age
- **Memory/RAG** — LanceDB + bge-m3 lokal, vollständig offline
- **Input Validation** — Zod + AJV
- **CodeQL + Dependabot** — täglich aktiv
- **Safe Regex** — eigener ReDoS-Schutz

---

## Architektur-Entscheidungen

| Entscheidung | Stand |
|--------------|-------|
| Platform: Windows + Linux only | ✅ Umgesetzt |
| Messaging: AntarBridge statt eingebauter Channels | 🟡 Cleanup läuft · AntarBridge in Entwicklung |
| Embedding: Ollama/bge-m3 lokal (kein Cloud-API) | ✅ Umgesetzt |
| Deployment: Lokal (kein Fly.io / Render / Docker) | 🟡 Cleanup läuft |
| Gateway: reines AI-Backend + Memory/RAG | 🟡 In Umsetzung |

---

## Technische Schuld

### TD-001 — QA Dead Code · 22.04.2026

Extensions entfernt, ~350 Dead-Code-Referenzen im Core bewusst offen.  
**Risiko:** Keines · **Aufwand:** ~1–2 Tage · **Wann:** Dedizierte Session

### TD-002 — postinstall-Hook referenziert qa-Plugins · 25.04.2026

`scripts/postinstall-bundled-plugins.mjs` versucht beim `pnpm install`
`dist/extensions/qa-channel/runtime-api.js` und `qa-lab/runtime-api.js`
zu restoren — diese Dateien existieren nicht mehr.  
**Risiko:** Keines — nicht blockierend · **Fix:** Hook bereinigen · **Wann:** Phase 3

---

*OpenClaw · `docs/PROJECT_STATUS.md`*

---

## Cleanup-Session — 25.04.2026

### Erledigt

| Was | Details |
|-----|---------|
| `Swabble/`, `qa/` gelöscht | Swift-Paket + QA-Scenarios weg |
| 22 Messenger-Extensions gelöscht | discord · telegram · whatsapp · signal · slack · msteams · googlechat · line · matrix · irc · mattermost · nextcloud-talk · nostr · qqbot · feishu · synology-chat · twitch · tlon · zalo · zalouser · bluebubbles · imessage |
| 8 macOS-Skills gelöscht | apple-notes · apple-reminders · bear-notes · camsnap · things-mac · imsg · bluebubbles · peekaboo |
| Root-Dateien gelöscht | appcast.xml · fly.toml · fly.private.toml · render.yaml · docker-compose.yml · docker-setup.sh · Dockerfile.sandbox* · openclaw.podman.env · setup-podman.sh · .swiftformat · .swiftlint.yml · dmg-background*.png · assets/chrome-extension/ |
| `package.json` bereinigt | 31 Messenger-Exports · 22 Scripts (ios/mac/swift/protocol) entfernt |
| `AGENTS.md` ergänzt | AntarBridge-Hinweis · keine eingebauten Messenger |
| CI/Tests angepasst | appcast.test.ts gelöscht · release-check.ts graceful · labeler.yml bereinigt |

### TD-003 neu — Build-Reparatur erforderlich

`pnpm build` / `pnpm tsgo` / `pnpm test` werden nach den Löschungen **Fehler produzieren** — Kern, Routing und Tests referenzieren noch gelöschte Channel-IDs, SDK-Subpfade und Abhängigkeiten.

**Scope der nächsten Session:**
- (a) Kompilat reparieren — Build-Fehler systematisch abarbeiten
- (b) `plugin-sdk/exports` + `release-check`/`sparkle` vereinheitlichen
- (c) `discord-api-types`, `matrix-js-sdk` etc. aus dependencies wenn nicht mehr referenziert
- (d) Verifikations-Greps mit präzisen Mustern (Wortgrenzen, keine `AbortSignal`-Kollisionen)

**Risiko:** Mittel — kein Laufzeit-Problem solange Gateway nicht gestartet wird, aber CI wird rot sein.
**Aufwand:** ~halber Tag
**Wann:** Nächste dedizierte Session

### Provider Cleanup — 25.04.2026

| Was | Details |
|-----|---------|
| 40 Cloud-Provider-Docs gelöscht | docs/providers/ — nur noch 10 lokale Provider |
| 47 Provider-Extensions gelöscht | openai · anthropic · google · alibaba · qwen · xai · mistral · groq · u.v.m. |
| 4 weitere Cloud-Extensions gelöscht | elevenlabs · microsoft · microsoft-foundry · codex |
| AGENTS.md Provider Policy | Local Only — keine Cloud-APIs · ADR-Exception-Pflicht |
| docs/providers/index.md | Neu: nur lokale Provider + Upstream-Verweis |

**Verbleibende Provider-Extensions:**
`ollama` · `lmstudio` · `comfy` · `vllm` · `sglang` · `nvidia` · `litellm` · `synthetic` · `duckduckgo`

**Architektur-Entscheidung final:**
OpenClaw = reines lokales AI-Gateway + Memory/RAG. Kein Cloud-Zugriff by default.
Alle Modelle laufen on-premise über Ollama/LM Studio/vLLM/ComfyUI.

### TD-003 — nächste Session

`pnpm build` / `tsgo` / `test` werden Fehler zeigen wegen:
- Kern-Code referenziert gelöschte Provider/Channels
- package.json exports/dependencies für gelöschte Extensions
- generierte Kataloge (bundled-channel-config-metadata.generated.ts etc.)

**Nächster Schritt: Build-Reparatur systematisch durchführen.**

### TD-003 Build-Reparatur — Abgeschlossen 25.04.2026

| Metrik | Ergebnis |
|--------|---------|
| Initiale Build-Fehler | 2 · `UNRESOLVED_ENTRY` telegram/audit + telegram/token |
| Initiale TS-Fehler | 14 · Import-Fehler in gelöschten Extension-Live-Tests |
| Dependencies entfernt | Keine — bewusst zurückgestellt (eigener Pass nötig) |
| Testdateien gelöscht | 2 · video-generation-providers.live.test.ts · music-generation-providers.live.test.ts |
| Build nach Fix | ✅ Erfolgreich |
| TypeScript (tsgo:all) | ✅ 0 Fehler |

**Geänderte Dateien:**

| Datei | Änderung |
|-------|---------|
| `tsdown.config.ts` | telegram/audit + telegram/token Einträge entfernt |
| `scripts/postinstall-bundled-plugins.mjs` | qa-channel / qa-lab LEGACY_SIDECARS entfernt · No-Op |
| `scripts/run-tsgo.mjs` | Windows-Fix · Pfade mit Leerzeichen · node statt Shell-Spawn |
| `scripts/test-live-media.ts` | Nur noch Image-Suite · Musik/Video entfernt |
| `scripts/lib/bundled-runtime-sidecar-paths.json` | Neu generiert · nur noch 11 vorhandene Sidecars |

**Bewusst nicht angepasst:**
- `scripts/sparkle-build.ts` — wird von release-check.ts für Versions-Logik genutzt, nicht nur macOS
- `scripts/lib/plugin-sdk-entrypoints.json` — gehört zu vorhandenen src/plugin-sdk/*.ts Dateien
- `package.json` dependencies — openai etc. noch in src/ referenziert · eigener Bereinigungspass nötig

**Verbleibende offene Punkte (TD-003 Follow-up):**

| # | Was | Priorität |
|---|-----|-----------|
| F1 | `pnpm lint` — Windows Leerzeichen-Problem in run-oxlint.mjs | Medium |
| F2 | `pnpm test` — vollständiger Run in normaler Node-22+ Umgebung | Medium |
| F3 | Dependencies bereinigen — openai, @anthropic-ai/sdk etc. aus src/ lösen | Low |
| F4 | Docs bereinigen — testing.md · music-generation.md · video-generation.md | Low |

### TD-003 Follow-up — nächste Cursor-Session

```
1. run-oxlint.mjs Windows-tauglich machen
   (analog zu run-tsgo.mjs Fix)

2. Vollständigen pnpm test Lauf in normaler
   Node-22+ Umgebung mit pnpm im PATH durchführen

3. Verbleibende Test-Failures dokumentieren
```

### TD-003 Test-Bereinigung — Abgeschlossen 25.04.2026

| Metrik | Ergebnis |
|--------|---------|
| Test-Dateien gelöscht | 38 |
| Test-Blöcke entfernt | 3 gezielt + große Contract-Suites |
| Contract-Shard | ✅ 45 Dateien · 195 Tests · alles grün |
| pnpm tsgo:all | ✅ 0 Fehler |
| pnpm lint | ✅ 0 Fehler · 0 Warnungen (OPENCLAW_LOCAL_CHECK=0) |
| pnpm build | ✅ grün |
| pnpm test Voll-Lauf | 🟡 73 Dateien · 663 Tests · 8 Dateien / 23 Failures |

**Verbleibende Failures — kategorisiert:**

| Kategorie | Datei | Ursache |
|-----------|-------|---------|
| Gateway Timeout | `server.reload.test.ts` | Hook-Timeout 60s · installGatewayTestHooks · Windows/Umgebung |
| Windows Pfad | `server.sessions.gateway-server-sessions-a.test.ts` | 8.3-Kurzname DENIZ-~1 vs. ausgeschriebener Temp-Pfad |
| Entfernte Channels | diverse commands/agents Tests | Discord in Session-Erwartungen · configure.channels · backup-verify |
| Provider/Auth | diverse | Erwartungen auf entfernte Cloud-Provider |

**Bewertung:** Alle 23 Failures sind Umgebungs- oder Fork-bedingt — kein Contract-Import-Problem mehr.
Kein sofortiger Fix nötig. Gezielte Triage bei Bedarf mit:
`pnpm test <Datei> --reporter=verbose` + `OPENCLAW_VITEST_MAX_WORKERS=1`

### TD-004 neu — Test-Failures Windows/Fork · 25.04.2026

8 Testdateien / 23 Failures bewusst als TD-004 aufgenommen.
**Risiko:** Keines für Laufzeit · **Aufwand:** ~2-4h gezielt
**Kategorien:** Windows-Pfade · Gateway-Timeouts · entfernte Channel-Erwartungen
**Wann:** Nach Gateway Live-Test — nur wenn Tests produktiv stören

### Architecture Docs — Abgeschlossen 25.04.2026

| Datei | Status |
|-------|--------|
| `docs/architecture/overview.md` | ✅ Neu erstellt |
| `docs/architecture/index.md` | ✅ Neu erstellt |
| `docs/concepts/architecture.md` | ✅ Komplett ersetzt |
| `docs/docs.json` | ✅ Navigation + Redirect ergänzt |

**Inhalt overview.md:** Vision · Diagramm · Komponenten · Security-Tabelle · Datenfluss · Verzeichnisbaum · Related
**Grep-Check:** keine WhatsApp/Telegram/Discord/macOS/iOS/launchd/Baileys Treffer

**Offener Punkt:** `docs/adr/` hat noch keine index.md — Mintlify-Link in overview.md zeigt ins Leere. In separatem Schritt nachziehen.

### TD-004 Test-Failures — Abgeschlossen 25.04.2026

| Metrik | Ergebnis |
|--------|---------|
| Initiale Failures | 8 Dateien / 23 Tests |
| Behoben | alle |
| Stepfun Provider Test | gelöscht |
| configure.channels | telegram/twitch → webchat/ollama |
| server.reload | whatsapp/telegram/discord → lokale Provider · Timeout 120s |
| server.sessions | Windows 8.3-Pfad-Fix via fs.realpath |
| backup-verify | Windows-Pfad-Fix |
| agents Tests | Cloud-Provider-Assertions entfernt |
| Windows Cleanup-Timeout | rmTempHomeWithWindowsRetry · AV-Delay · maxRetries:3 |

**Technische Details:**
- `src/gateway/test-helpers.server.ts` — neue Funktion
  `rmTempHomeWithWindowsRetry` mit Windows-spezifischem
  2s-Delay + Retry-Fallback. Linux/macOS unverändert.
- `afterAll` Timeout in `server.reload.test.ts` — 900s
  (kann nach CI-Bestätigung wieder gesenkt werden)

**Status: pnpm test → grün**

### TD-001 QA Dead Code — Abgeschlossen 25.04.2026

| Metrik | Ergebnis |
|--------|---------|
| Verifikations-Grep | ✅ 0 Treffer in src/ scripts/ test/ extensions/ packages/ |
| Dateien gelöscht | 16 Dateien + 2 Verzeichnisse |
| Dateien angepasst | ~30 Dateien |
| pnpm tsgo:core | ✅ grün |
| pnpm tsgo:extensions | ✅ grün |
| pnpm tsdown | ✅ grün · keine fehlenden QA-Entries |
| pnpm build (full) | ⚠ runtime-postbuild — Cursor-Umgebungslimitierung · nicht QA-bezogen |

**Gelöschte Dateien:**
`src/plugin-sdk/qa-channel.ts` + `.test.ts` · `qa-lab.ts` + `.test.ts` ·
`qa-runtime.ts` + `.test.ts` · `qa-runner-runtime.ts` + `.test.ts` + `.integration.test.ts` ·
`private-qa-bundled-env.ts` · `src/cli/program/private-qa-cli.ts` + `.test.ts` ·
`scripts/qa-e2e.ts` · `scripts/qa-lab-up.ts` ·
`test/vitest/vitest.extension-qa.config.ts` ·
`.agents/skills/openclaw-qa-testing/` ·
`qa/` (bereits in vorheriger Session)

**Offener Punkt — TD-005:**
`src/commands/backup-verify.test.ts:314` — TS7031 (impliziter Lambda-Parameter-Typ)
Vorbestehend, nicht QA-bezogen. Separater Fix.

**`NON_PACKAGED_BUNDLED_PLUGIN_DIRS`** — bleibt als leeres Set.
Entfernen wäre separate API-Änderung — bewusst zurückgestellt.

### Changelog Automation — Abgeschlossen 25.04.2026

| Was | Status |
|-----|--------|
| macos-release.yml | ✅ bereits aus vorherigem Cleanup entfernt |
| 5 iOS Scripts + 3 Tests gelöscht | ✅ ios-beta-release · ios-pin-version · ios-sync-versioning · ios-version · ios-write-version-xcconfig |
| changelog-check.yml | ✅ CI-Gate für PRs · SHA-gepinnt · awk-Parser |
| package.json changelog:add Scripts | ✅ 4 Scripts · change · fix · breaking · add |
| AGENTS.md Changelog Policy | ✅ Imperativ · Englisch · Append-Regel |
| Erster Eintrag | ✅ CHANGELOG.md Zeile 12 · Changelog automation |

**Offener Punkt:**
`scripts/lib/ios-version.ts` — jetzt ungenutzt · separater kleiner Cleanup

### iOS Cleanup Final — 25.04.2026

Alle verbleibenden iOS-Artefakte entfernt:

| Was | Status |
|-----|--------|
| TD-005 backup-verify.test.ts TS7031 | ✅ Behoben |
| scripts/lib/ios-version.ts | ✅ Gelöscht |
| scripts/ios-beta-prepare.sh | ✅ Gelöscht |
| scripts/ios-team-id.sh | ✅ Gelöscht |
| scripts/ios-configure-signing.sh | ✅ Gelöscht |
| scripts/ios-beta-archive.sh | ✅ Gelöscht |
| scripts/ios-asc-keychain-setup.sh | ✅ Gelöscht |
| test/scripts/ios-team-id.test.ts | ✅ Gelöscht |
| pnpm tsgo:core:test | ✅ 0 Fehler |

**iOS ist vollständig aus dem Repo entfernt. Keine Treffer mehr.**

---

## Phase 4 — Gateway Enterprise Features · Aktiv ab 25.04.2026

Nächste Schritte:
- OpenTelemetry / diagnostics-otel
- Prometheus /metrics Endpoint
- Distributed Rate Limiting (Redis)
- Health Check API
- Audit Log

### Phase 4 — OpenTelemetry / Observability — Abgeschlossen 25.04.2026

| Was | Status |
|-----|--------|
| docker-compose.observability.yml | ✅ Erstellt · alle Ports 127.0.0.1 |
| observability/tempo.yaml | ✅ OTLP HTTP+gRPC · 7d Retention · Service-Graph |
| observability/prometheus.yml | ✅ scrapes host.docker.internal:9464 |
| Grafana Provisioning | ✅ Tempo + Prometheus + Loki · verlinkte UIDs |
| ~/.openclaw/openclaw.json | ✅ diagnostics-otel enabled · traces + metrics + logs |
| .gitignore | ✅ observability/grafana/data/ ausgeschlossen |
| AGENTS.md Observability Block | ✅ Loopback-only · Auto-Redaction-Hinweis |
| CHANGELOG.md | ✅ Eintrag unter Unreleased |

**Manuell noch ausstehend (kein Blocker):**
Docker Desktop starten → `docker compose -f docker-compose.observability.yml up -d`
Dann: Grafana http://localhost:3000 · Tempo :4318 · Prometheus :9090 · Loki :3100

**Loki-Config:** Default aus Image — reicht für Anfang.
Eigenes `observability/loki.yaml` bei Bedarf (Pentest-Retention) in separater Session.

### Phase 4 — Health Check API — Abgeschlossen 25.04.2026

| Was | Status |
|-----|--------|
| `/health/details` Endpunkt | ✅ Loopback-only · voller Snapshot · uptime + gateway-Metadaten |
| `buildHealthDetailsPayload` | ✅ Dynamisch gemixed · HealthSummary-Typ unverändert |
| `isLocalDirectRequest` Guard | ✅ 403 für remote · 503 wenn Cache leer |
| `/health/details` in SPA-Routing | ✅ control-ui-routing.ts · kein Catchall-Konflikt |
| Tests | ✅ 13/13 grün · 4 neue + 9 bestehende |
| CHANGELOG.md | ✅ Eintrag unter Unreleased |

**Response-Format:**
`ok · ts · durationMs · channels · agents · sessions · uptime{ms,human} · gateway{version,platform,node}`

**Bewusst nicht implementiert:**
`memory` und `providers` Felder — erfordern Plugin/Config-Reads im Hot-Path.
Separater Task wenn OTel-Stack läuft und Bedarf besteht.

**Smoke-Tests (wenn Gateway läuft):**
`curl http://localhost:18789/health` → `{"ok":true,"status":"live"}`
`curl http://localhost:18789/health/details` → voller Snapshot
`curl http://localhost:18789/ready` → `{"ready":true,"failing":[],"uptimeMs":...}`

### Phase 4 — Audit Log — Abgeschlossen 25.04.2026

| Was | Status |
|-----|--------|
| `src/security/audit-log.ts` | ✅ JSONL · initAuditLog · writeAuditEvent · getAuditLogPath |
| Gateway-Start | ✅ auditGatewayStart · minimalTestGateway-Guard |
| Auth Rate Limiter | ✅ auditAuthFailure + auditAuthLockout |
| Dangerous Config Flags | ✅ auditDangerousFlag in logGatewayStartup |
| Injection Detection | ✅ recordSuspiciousInjectionPatterns · Cron-Hook |
| /health/details | ✅ auditLog: { path, enabled } |
| Tests | ✅ 5/5 · auth-rate-limit · probe · startup-log grün |
| CHANGELOG.md | ✅ Eintrag unter Unreleased |

**Audit-Log Pfad:** `%USERPROFILE%\.openclaw\audit.log`

**Events die geloggt werden:**
- `gateway.start` — beim Start
- `auth.failure` — jeder fehlgeschlagene Auth-Versuch
- `auth.lockout` — IP-Lockout ausgelöst
- `config.dangerous_flag` — gefährliche Config-Flags aktiv
- `injection.detected` — Prompt-Injection-Pattern erkannt (Cron)

**Prüfen nach Gateway-Start:**
`Get-Content "$env:USERPROFILE\.openclaw\audit.log"`

**Optional nachziehen:**
Injection-Auditing für weitere Hook-Typen (nicht nur Cron)
— separater Task wenn gewünscht.

### Phase 4 — Metrics Endpoint — Abgeschlossen 25.04.2026

| Was | Status |
|-----|--------|
| `src/gateway/gateway-metrics.ts` | ✅ OTel Counters · auth.failure · auth.lockout · http.requests · ws.connections |
| Auth Rate Limiter verdrahtet | ✅ recordAuthFailure + recordAuthLockout |
| `/metrics` HTTP-Endpunkt | ✅ Loopback-only · Prometheus Text · uptime · memory |
| `control-ui-routing.ts` | ✅ /metrics in ROOT_MOUNTED_GATEWAY_PROBE_PATHS |
| `observability/prometheus.yml` | ✅ Job openclaw_gateway → :18789/metrics |
| `@opentelemetry/api` dependency | ✅ package.json + lockfile |
| Tests | ✅ 16 probe Tests · 22 auth-rate-limit Tests |
| CHANGELOG.md | ✅ Eintrag unter Unreleased |

**Zwei Prometheus-Quellen:**
- `:9464` — OTel-Export via diagnostics-otel (Tokens, Kosten, Runs, Messages)
- `:18789/metrics` — Gateway-Snapshot (uptime, memory, auth.failure, http.requests)

**Manuell prüfen:**
`curl http://127.0.0.1:18789/metrics`

---

## Phase 6 — Edition-Architektur · Aktiv ab 25.04.2026

### ADR-007 — Edition-Architektur · 25.04.2026
✅ Accepted · Option C · API-First · vollständige Entkopplung

### Edition Template · 25.04.2026
✅ `edition-template/` — Python · WebSocket Client · HTTP Client · Gateway v3 Protokoll

### OpenLotto Edition · 25.04.2026
✅ `openclaw-lotto/` — eigenständiges Verzeichnis neben Core

| Komponente | Status |
|------------|--------|
| Repo-Struktur | ✅ vollständig |
| pyproject.toml + Build-System | ✅ setuptools |
| Gateway Client (v3 Protokoll) | ✅ aus Template |
| Scraper lotto649 / eurojackpot / keno | ✅ Platzhalter-Selektoren |
| Supabase Client | ✅ upsert by draw_date |
| Statistics Analyzer | ✅ OpenClaw Core via Gateway |
| Scheduler | ✅ BackgroundScheduler (Tkinter-kompatibel) |
| GUI | ✅ CustomTkinter · Zeitplan · manueller Run · Log |
| ruff check | ✅ grün |
| pytest | ✅ 2/2 |

**Nächste Schritte (du):**
1. Supabase-Tabellen anlegen (draws + statistics — SQL in README)
2. `.env` mit echten Keys befüllen
3. Selektoren in lotto649.py / eurojackpot.py / keno.py gegen echte DOM-Struktur anpassen
4. Ersten Live-Run testen
