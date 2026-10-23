---
title: "Architecture Decision Records"
summary: "Index aller ADRs — Architekturentscheidungen im OpenClaw Fork"
read_when:
  - Du eine Architekturentscheidung nachvollziehen willst
  - Du eine neue Entscheidung dokumentieren möchtest
  - Du verstehen willst warum etwas so gebaut ist wie es ist
---

# Architecture Decision Records

ADRs dokumentieren alle wesentlichen Architektur- und Sicherheitsentscheidungen dieses Forks. Jede Entscheidung die von der upstream-Codebasis abweicht oder eine neue Richtung einschlägt, bekommt einen eigenen ADR.

## Format

Jeder ADR folgt dem Schema: **Status · Date · Context · Decision · Rationale · Consequences · Betroffene Dateien**

Status-Werte: `Accepted` · `Deprecated` · `Superseded`

## Entscheidungen

| ADR | Titel | Datum | Status |
|-----|-------|-------|--------|
| [ADR-001](./ADR-001-github-actions-sha-pinning.md) | GitHub Actions SHA-Pinning | 22.04.2026 | Accepted |
| [ADR-002](./ADR-002-csp-unsafe-inline.md) | CSP `unsafe-inline` Abschaffung | 22.04.2026 | Accepted |
| [ADR-003](./ADR-003-hsts-default-on.md) | HSTS Default-on | 22.04.2026 | Accepted |
| [ADR-004](./ADR-004-error-logging-strategy.md) | Error Logging Strategie | 22.04.2026 | Accepted |
| [ADR-005](./ADR-005-dependency-audit-policy.md) | Dependency Audit Policy | — | Ausstehend |
| [ADR-006](./ADR-006-secret-scanning.md) | Secret Scanning Integration | 25.04.2026 | Accepted |
| [ADR-007](./ADR-007-edition-architecture.md) | Edition-Architektur — API-First Core | 25.04.2026 | Accepted |
| [ADR-008](./ADR-008-raspberry-pi-deployment.md) | Raspberry Pi als Pentest Drop-Box | September 2026 | Accepted |
| [ADR-009](./ADR-009-antarbridge-only-channel.md) | AntarBridge als einziger Kanal | September 2026 | Accepted |
| [ADR-010](./ADR-010-antarbridge-gateway-protocol.md) | AntarBridge Gateway-Protokoll | September 2026 | Accepted |

## Neue ADR erstellen

Neue ADR-Datei anlegen: `docs/adr/ADR-NNN-kurzer-titel.md`

Pflichtfelder:
```
# ADR-NNN: Titel

## Status
Accepted

## Date
YYYY-MM-DD

## Context
Warum war eine Entscheidung nötig?

## Decision
Was wurde entschieden?

## Rationale
Warum diese Option?

## Consequences
Was ändert sich dadurch?

## Betroffene Dateien
- Welche Dateien sind betroffen?
```

Danach diesen Index aktualisieren.

---

*OpenClaw · `docs/adr/index.md`*
