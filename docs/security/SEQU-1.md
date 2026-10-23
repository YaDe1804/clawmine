# SeQu-Check Initial — Security & Quality Baseline

**Datum:** 22.04.2026  
**Scope:** Vollständiger Codebase-Audit · `src/` · `Dockerfile` · `.github/workflows/` · `zizmor.yml`  
**Ergebnis:** ~~**CONDITIONAL PASS**~~ → **PASS** *(Phase 1 + Phase 2 abgeschlossen · 22.04.2026)*  
**Befundlage:** 0 Kritisch · ~~3 High~~ 0 High offen · ~~4 Medium~~ 0 Medium offen · 4 Low offen (Phase 3/4)

---

## Gesamtergebnis

| Kategorie | Anzahl | Kurzkommentar |
|-----------|--------|----------------|
| **Kritisch** | 0 | Keine unmittelbaren Showstopper. Gateway ist nicht direkt kompromittierbar. |
| **High** | 3 | Supply-Chain (CI), CSS-Injection-Vektor, Root-Clutter — alle adressierbar, ADRs erstellt. |
| **Medium** | 4 | HSTS, Silent Errors, Dockerfile Build-Stage, Workflow-Permissions — Phase 2. |
| **Low / Quality** | 3 | Unhandled Rejection, detect-secrets CI-Lücke, Root-Clutter-Reste. |

## Kurzfassung

- **CONDITIONAL PASS** — keine Blocker für laufenden Betrieb, aber 3 High-Findings müssen vor nächstem Major-Release geschlossen sein (Security Gate Phase 1).
- **Geprüfte Artefakte:** `src/gateway/` (Auth, HTTP, CSP, Rate Limiting), `src/security/` (Audit, Safe-Regex, External-Content), `src/infra/fs-safe.ts`, `Dockerfile`, `.github/workflows/ci.yml`, `zizmor.yml`, `.detect-secrets.cfg`, `package.json`.
- **Stärken:** Rate Limiter, Prompt Injection Detection, CSP für Scripts, Docker-Härtung, CodeQL, Dependabot — alle solide bis enterprise-tauglich.
- **Hauptrisiken:** GitHub Actions Supply Chain (tag-pinned, nicht SHA), CSS Injection über `unsafe-inline`, temporäre Artefakte im Root.

## Geltungsbereich

Initialer Security- und Quality-Review des OpenClaw Gateways vor strukturierter Weiterentwicklung.  
Kein Penetrationstest. Kein vollständiges Audit der Channel-Implementierungen oder Plugin-Ökosystems.  
Basis für Roadmap-Phasen 1–4 und ADR-Prozess.

---

## 1. Auth & Rate Limiting — `src/gateway/auth-rate-limit.ts`

### Stärken

- **Sliding-Window-Implementierung:** Sauber. `slideWindow` filtert expired timestamps korrekt, `recordFailure` fügt atomisch hinzu, `lockedUntil` wird konsistent geprüft und gecleant.
- **Scope-Trennung:** `AUTH_RATE_LIMIT_SCOPE_SHARED_SECRET`, `_DEVICE_TOKEN`, `_HOOK_AUTH` — separate Zähler verhindern Cross-Scope-Lockout-Missbrauch.
- **Loopback-Exempt:** Lokale CLI-Sessions können sich nicht selbst aussperren — sinnvoller Trade-off für single-user Gateway.
- **Memory-Management:** `prune()` mit `setInterval` + `.unref()` — kein Blocking des Node.js Event-Loop bei Shutdown.
- **IPv4-mapped IPv6:** `normalizeRateLimitClientIp` canonicalisiert korrekt über `resolveClientIp`.
- **Defaults:** 10 Versuche / 60s Fenster / 5 min Lockout — angemessen für ein persönliches Gateway.

### Befunde

| ID | Schwere | Befund |
|----|---------|--------|
| A1 | Low | In-Memory-only: bei Horizontal Scaling oder Gateway-Restart wird der Limiter-State verloren. Für Single-Instance-Deployment akzeptabel; bei Multi-Instance muss auf Redis o.ä. migriert werden. |

---

## 2. HTTP Security Headers — `src/gateway/http-common.ts`

### Stärken

- **`X-Content-Type-Options: nosniff`** — gesetzt.
- **`Referrer-Policy: no-referrer`** — gesetzt.
- **`Permissions-Policy: camera=(), microphone=(self), geolocation=()`** — gesetzt, restriktiv.
- **Rate-Limit-Response:** `Retry-After` Header korrekt gesetzt bei 429.
- **`sendUnauthorized`** gibt generisches JSON zurück, kein Stack-Trace.

### Befunde

| ID | Schwere | Befund |
|----|---------|--------|
| H1 | ~~Medium~~ | ~~**HSTS opt-in statt default**~~ **✓ Behoben 22.04.2026** — Default `max-age=63072000; includeSubDomains` bei TLS, opt-out via `false`. Tests ergänzt. → ADR-003 |
| H2 | Low | Kein `X-Permitted-Cross-Domain-Policies: none` Header. Minorer Punkt, aber vollständige Header-Baseline wäre besser. |

---

## 3. Content Security Policy — `src/gateway/control-ui-csp.ts`

### Stärken

- **Script-src SHA-256-Hash-basiert:** `computeInlineScriptHashes` berechnet SHA-256 der Inline-Script-Blöcke, kein `unsafe-inline` für JavaScript — korrekt.
- **`base-uri 'none'`** — verhindert `<base>`-Tag-Injection.
- **`object-src 'none'`** — kein Flash/Plugin-Exec.
- **`frame-ancestors 'none'`** — verhindert Clickjacking via iframe.
- **`default-src 'self'`** — sicherer Default.

### Befunde

| ID | Schwere | Befund |
|----|---------|--------|
| C1 | ~~**High**~~ | ~~**`style-src 'unsafe-inline'`**~~ **✓ Behoben 22.04.2026** — `computeInlineStyleHashes` implementiert, `buildControlUiCspHeader` erweitert, kein `unsafe-inline` mehr. Tests aktualisiert. → ADR-002 |

---

## 4. External Content & Prompt Injection — `src/security/external-content.ts`

### Stärken

- **15+ Injection-Patterns:** `ignore previous instructions`, `you are now`, `system prompt override` etc. — breite Abdeckung bekannter Vektor-Phrasen.
- **Kryptografische Boundary-Marker:** `randomBytes(8).toString('hex')` pro Wrapper — verhindert Spoofing durch maliciösen Content der Marker nachahmst.
- **`EXTERNAL_UNTRUSTED_CONTENT` Label** — LLM-seitig eindeutig als untrusted markiert.
- **Detection logging ohne Blocking** — suspicious patterns werden geloggt, Content wird trotzdem sicher gewrapped weiterverarbeitet; kein False-Positive-DoS.

### Befunde

| ID | Schwere | Befund |
|----|---------|--------|
| E1 | Low | Pattern-Liste ist statisch im Code. Neue Injection-Techniken erfordern Code-Änderung. Konfigurierbare Pattern-Erweiterung wäre wartungsfreundlicher (Low-Priorität). |

---

## 5. Safe Regex — `src/security/safe-regex.ts`

### Stärken

- **Eigener ReDoS-Schutz:** Tiefenanalyse verschachtelter Quantifier mit `ParseFrame`-Stack — verhindert `(a+)+`-Style-Angriffe.
- **LRU-ähnlicher Cache** mit `SAFE_REGEX_CACHE_MAX = 256` — Performance ohne unbegrenztes Wachstum.
- **`SAFE_REGEX_TEST_WINDOW = 2048`** — begrenzte Test-Input-Länge.
- **Typisierte Reject-Reasons:** `"empty" | "unsafe-nested-repetition" | "invalid-regex"` — strukturierte Fehlerbehandlung.

### Befunde

Keine.

---

## 6. GitHub Actions CI — `.github/workflows/ci.yml` + `zizmor.yml`

### Stärken

- **Top-Level `permissions: contents: read`** — Least Privilege als Default für alle Jobs.
- **CodeQL aktiv** mit Konfiguration in `.github/codeql/` — statische Analyse für JS/TS.
- **Dependabot täglich** mit Gruppen für production/development.
- **`security-fast` Job** laut `ci.md` — private key detection + zizmor als CI-Gate.

### Befunde

| ID | Schwere | Befund |
|----|---------|--------|
| G1 | ~~**High**~~ | ~~**GitHub Actions nicht SHA-gepinnt**~~ **✓ Behoben 22.04.2026** — Alle 18 Workflow-Dateien, 15 Action/Version-Kombinationen auf SHA-Pins umgestellt. → ADR-001 |
| G2 | ~~**High**~~ | ~~**Zizmor `unpinned-uses` deaktiviert**~~ **✓ Behoben 22.04.2026** — `unpinned-uses`, `excessive-permissions`, `artipacked` alle auf `disable: false`. → ADR-001 |
| G3 | ~~Medium~~ | ~~**Zizmor `excessive-permissions` deaktiviert**~~ **✓ Behoben 22.04.2026** — Gemeinsam mit G2 erledigt. |

---

## 7. Dockerfile — `Dockerfile`

### Stärken

- **Multi-Stage Build:** Build-Tools, Bun, Source-Code landen nicht im Runtime-Image.
- **SHA256-gepinnte Base Images:** `node:24-bookworm@sha256:3a09aa6...` — reproduzierbar, immutable.
- **`USER node`** im Runtime-Stage — Non-root, korrekt.
- **`chown node:node`** für alle COPY-Schritte — kein versehentlicher Root-owned File.
- **HEALTHCHECK** mit sinnvollen Timeouts (`--interval=3m --timeout=10s --start-period=15s`).

### Befunde

| ID | Schwere | Befund |
|----|---------|--------|
| D1 | ~~Medium~~ | ~~**Bun-Installation via `curl \| bash`**~~ **✓ Behoben 22.04.2026** — `COPY --from=oven/bun:1 /usr/local/bin/bun /usr/local/bin/bun`, kein Shell-Pipe mehr. |
| D2 | Low | Retry-Logik für Bun-Installation (5 Versuche) ist pragmatisch, verdeckt aber mögliche persistente Fehler. |

---

## 8. Error Handling — `src/infra/fs-safe.ts` et al.

### Stärken

- `fs-safe.ts` abstrahiert Node.js File-Handle-Operationen mit konsistenter Fehler-Typisierung.
- Viele Pfade haben explizite Error-Behandlung mit typisierten Results.

### Befunde

| ID | Schwere | Befund |
|----|---------|--------|
| F1 | ~~Medium~~ | ~~**~15× `catch(() => {})` Pattern**~~ **✓ Behoben 22.04.2026** — Alle 23 Stellen in `fs-safe.ts`, `exec-approval-channel-runtime.ts`, `approval-handler-bootstrap.ts` auf `logger.debug()` umgestellt. → ADR-004 |
| F2 | ~~Low~~ | ~~**Kein globaler `unhandledRejection` Handler**~~ **✓ Behoben 22.04.2026** — `unhandledRejection` + `uncaughtException` Handler in `src/entry.ts` registriert. → ADR-004 |

---

## 9. Root-Verzeichnis Hygiene

### Befunde

| ID | Schwere | Befund |
|----|---------|--------|
| R1 | ~~**High**~~ | ~~**`fix2.py` im Repo-Root**~~ **✓ Behoben 22.04.2026** — Datei gelöscht. AGENTS.md-Regel ergänzt. |
| R2 | ~~Low~~ | ~~**`dream-diary-preview-v2.html` + `v3.html`**~~ **✓ Behoben 22.04.2026** — Beide Dateien gelöscht. |

---

## 10. Secret Scanning — `.detect-secrets.cfg`

### Stärken

- `.detect-secrets.cfg` vorhanden mit sinnvollen Exclusion-Patterns (lockfiles, UI-Labels, CodingKeys).
- Ausschlüsse sind präzise kommentiert.

### Befunde

| ID | Schwere | Befund |
|----|---------|--------|
| S1 | Low | **detect-secrets nicht in CI verdrahtet:** Die Config existiert, ist aber laut Kommentar nicht automatisch aktiv — `detect-secrets` liest `.detect-secrets.cfg` nicht by default. Kein CI-Gate der auf leaked secrets prüft. |

---

## Befund-Zusammenfassung

| ID | Schwere | Titel | Bereich | ADR / Phase |
|----|---------|-------|---------|-------------|
| G1 | ✅ Behoben | GitHub Actions SHA-Pinning | CI | ADR-001 · 22.04.2026 |
| G2 | ✅ Behoben | Zizmor `unpinned-uses` deaktiviert | CI | ADR-001 · 22.04.2026 |
| C1 | ✅ Behoben | CSP `style-src unsafe-inline` | Gateway | ADR-002 · 22.04.2026 |
| R1 | ✅ Behoben | `fix2.py` im Repo-Root | Repo | — · 22.04.2026 |
| H1 | ✅ Behoben | HSTS opt-in statt default | Gateway | ADR-003 · 22.04.2026 |
| F1 | ✅ Behoben | Silent `catch(() => {})` ~23× | Infra | ADR-004 · 22.04.2026 |
| D1 | ✅ Behoben | Bun `curl\|bash` in Dockerfile | Docker | — · 22.04.2026 |
| G3 | ✅ Behoben | Zizmor `excessive-permissions` deaktiviert | CI | — · 22.04.2026 |
| F2 | ✅ Behoben | Kein globaler `unhandledRejection` Handler | Infra | ADR-004 · 22.04.2026 |
| R2 | ✅ Behoben | Dream-Diary HTMLs im Root | Repo | — · 22.04.2026 |
| A1 | 🟢 Low | Rate Limiter in-memory only | Gateway | — · Phase 4 |
| E1 | 🟢 Low | Injection-Pattern-Liste statisch | Security | — · Phase 3 |
| S1 | 🟢 Low | detect-secrets nicht in CI | CI | — · Phase 3 |
| H2 | 🟢 Low | `X-Permitted-Cross-Domain-Policies` fehlt | Gateway | — · Phase 2 |

---

## Maßnahmen-Priorisierung

### Phase 1 — Security Gate ✅ Abgeschlossen 22.04.2026

1. ~~`fix2.py` + Dream-Diary HTMLs löschen~~ **✓ Erledigt 22.04.2026**
2. ~~GitHub Actions SHA-Pinning~~ **✓ Erledigt 22.04.2026** — 18 Workflows, 15 Actions → ADR-001
3. ~~Zizmor `unpinned-uses` + `excessive-permissions` reaktivieren~~ **✓ Erledigt 22.04.2026** → ADR-001
4. ~~CSP `style-src unsafe-inline` → Hash-basiert migrieren~~ **✓ Erledigt 22.04.2026** → ADR-002

### Phase 2 — Hardening ✅ Abgeschlossen 22.04.2026

5. ~~HSTS default-on mit TLS-Guard~~ **✓ Erledigt 22.04.2026** → ADR-003
6. ~~`catch(() => {})` → `logger.debug()` + `unhandledRejection` Handler~~ **✓ Erledigt 22.04.2026** → ADR-004
7. ~~Dockerfile Bun-Installation absichern~~ **✓ Erledigt 22.04.2026**
8. ~~Workflow-Permissions Einzelprüfung~~ **✓ Erledigt 22.04.2026** — via Zizmor Gate

### Phase 3 — Quality

9. detect-secrets in CI verdrahten
10. Injection-Pattern-Liste konfigurierbar machen

### Phase 4 — Enterprise Scale

11. Rate Limiter Redis-backend für Multi-Instance

---

*OpenClaw · `docs/sequ/SEQU-Initial.md`*

---

## Nachtrag — 25.04.2026

### Memory/RAG Setup

`memory-lancedb` mit Ollama/bge-m3 konfiguriert und verifiziert.
Embedding-Probe bestätigt (POST /v1/embeddings → 200, dim=1024).
Vollständig lokal — kein Cloud-API-Key.

### Architektur-Entscheidung: Messenger entfernt

Alle 22 Messenger-Channel-Extensions werden entfernt.
AntarBridge (eigene Entwicklung) wird als sicherer Messaging-Layer eingesetzt sobald verfügbar.
Begründung: Reduzierte Angriffsfläche, keine externen Webhook-Abhängigkeiten, eigene Security-Kontrolle.

### TD-002 neu aufgenommen

`scripts/postinstall-bundled-plugins.mjs` referenziert gelöschte qa-Plugins.
Nicht blockierend, wird in Phase 3 bereinigt.
