# ADR-007: Edition-Architektur — OpenClaw als API-First Core

## Status
Accepted

## Date
2026-04-25

## Context
OpenClaw ist nach Phase 3 ein schlankes, sicheres AI-Gateway mit Memory/RAG-Backend. Der Wunsch nach spezialisierten Anwendungsfällen (Pentesting, Developer-Tools, Bildgenerierung, Datenanalyse für Lotterie-Projekte u.v.m.) wirft die Frage auf: Wie wachsen wir ohne den Core aufzublähen?

Drei Optionen wurden evaluiert:

**Option A — npm dependency:** Edition installiert Core als Paket.  
Nachteil: Versionierungs-Overhead, npm-Publish-Zyklus für jedes Core-Update, enge Kopplung.

**Option B — Git submodule:** Core liegt als Submodule im Edition-Repo.  
Nachteil: Submodule-Komplexität, zwei Repos müssen synchron gehalten werden, schwer auf anderen PCs zu deployen.

**Option C — API-First, vollständige Entkopplung:** Core und Edition sind eigenständige Repos. Edition kommuniziert ausschließlich über die Gateway-API mit dem Core.  
Vorteil: maximale Flexibilität, keine Versionierungs-Abhängigkeit, Edition kann in beliebiger Sprache geschrieben sein, eigenständig deploybar auf jedem PC.

## Decision

**Option C — API-First, vollständige Entkopplung.**

OpenClaw Core bleibt ein eigenständiger lokaler Dienst. Editions sind separate Repositories ohne direkten Code-Import aus dem Core. Jede Edition kommuniziert ausschließlich über die Gateway-API (WebSocket + HTTP) mit dem Core.

### Architektur

```
[openclaw-core]              Lokaler Dienst · Gateway auf Port 18789
  src/gateway/               WebSocket API · HTTP API
  extensions/memory-*/       Memory/RAG
  extensions/ollama/         Lokale Inferenz
  ...
        │
        │ WebSocket ws://127.0.0.1:18789
        │ HTTP     http://127.0.0.1:18789
        │
        ├── [openclaw-pentest]      OpenPentest Edition
        ├── [openclaw-developer]    OpenDeveloper Edition
        ├── [openclaw-image]        OpenImage Edition (ComfyUI)
        ├── [openclaw-video]        OpenVideo Edition (ComfyUI)
        ├── [openclaw-lotto]        OpenLotto Edition
        └── [...]                   Weitere Editions
```

### Was eine Edition ist

- Ein eigenständiges Repository
- Eigene `package.json` / `pyproject.toml` / beliebige Technologie
- Verbindet sich über Gateway-API mit dem laufenden Core
- Bringt eigene Extensions, Skills, Config-Defaults, Docs, UI
- Eigenständig deploybar auf jedem PC — Core muss lokal laufen

### Was eine Edition nicht ist

- Kein eigener Gateway-Code
- Kein Fork des Core-Repos
- Keine npm-Abhängigkeit auf Core-Pakete
- Kein Zugriff auf Core-Interna (nur über API)

### Geplante Editions

| Edition | Repo | Fokus |
|---------|------|-------|
| OpenPentest | `openclaw-pentest` | phone-control · Reporting · Scope-Management · Audit Trail |
| OpenDeveloper | `openclaw-developer` | Code-Analyse · Shell · Git-Tools · openshell |
| OpenImage | `openclaw-image` | ComfyUI Bildgenerierung · Prompt-Workflows |
| OpenVideo | `openclaw-video` | ComfyUI Videogenerierung · Rendering-Pipelines |
| OpenLotto | `openclaw-lotto` | Lotto-Orakel · EuroJack · Keno · automatische Gewinnzahlen-Updates |

Weitere Editions entstehen nach Bedarf — die Architektur setzt keine Obergrenze.

### Core als Vorlage

Der Stand von Phase 3 (25.04.2026) dient als Baseline-Snapshot für alle zukünftigen Editions:

```
git tag v2026.4.25-phase3-complete
```

Bei Problemen in der Edition-Entwicklung kann jederzeit auf diesen Stand zurückgegriffen werden.

## Rationale

- **Entkopplung:** Core-Updates profitieren alle Editions automatisch — kein Rebase, kein Merge-Konflikt
- **Flexibilität:** Editions können in Python, TypeScript, Go, oder jeder anderen Sprache geschrieben sein
- **Portabilität:** Jede Edition ist als eigenständiges Repo auf jeden PC übertragbar
- **Skalierbarkeit:** Beliebig viele Editions ohne Core-Komplexität zu erhöhen
- **Sicherheit:** Editions haben keinen direkten Zugriff auf Core-Interna — nur über die dokumentierte API
- **Multi-PC:** Developer-PC bekommt Core + OpenDeveloper, Pentest-Maschine bekommt Core + OpenPentest — jede Kombination möglich

## Consequences

**Positiv:**
- Core bleibt schlank und wartbar
- Editions sind unabhängig versionierbar und deploybar
- Technologie-Freiheit pro Edition
- Einfaches Onboarding auf neuen PCs (Core installieren, Edition installieren, fertig)

**Zu beachten:**
- Core muss auf dem Ziel-PC laufen bevor eine Edition startet
- Gateway-API ist das Vertragsinterface — Breaking Changes im Core brauchen Versionierung
- Ollama muss separat installiert und konfiguriert sein (Scheduled Task)
- AntarBridge (Messaging-Layer) wird ebenfalls als eigenständiges Repo entwickelt und verbindet sich über dieselbe Gateway-API

## Nächste Schritte

1. Core-Snapshot taggen: `git tag v2026.4.25-phase3-complete`
2. Edition-Template erstellen: minimales Repo-Gerüst das zeigt wie eine Edition den Core via Gateway-API anspricht
3. OpenPentest als erste Edition starten (Phase 6)

## Betroffene Dateien

- `docs/adr/ADR-007-edition-architecture.md` (dieses Dokument)
- `docs/architecture/overview.md` (Edition-Architektur ergänzen)
- `AGENTS.md` (Edition-Konzept dokumentieren)

## Referenzen

- Gateway WebSocket Protocol: `docs/gateway/protocol.md`
- Architecture Overview: `docs/architecture/overview.md`
- Phase 6 Roadmap: `docs/roadmap/openclaw_roadmap_v3.html`

---

*OpenClaw · `docs/adr/ADR-007-edition-architecture.md`*
