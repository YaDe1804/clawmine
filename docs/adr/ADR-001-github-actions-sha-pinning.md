# ADR-001: GitHub Actions SHA-Pinning

## Status
Accepted

## Date
2026-04-22

## Context
Die CI/CD-Workflows in `.github/workflows/` referenzieren GitHub Actions via versionierter Tags (z.B. `actions/checkout@v6`, `actions/setup-python@v6`). Tags sind mutable — ein Angreifer, der einen Actions-Account kompromittiert, kann einen Tag auf bösartigen Code zeigen lassen ohne dass sich die Workflow-Datei ändert. Dies ist ein bekannter Supply-Chain-Angriffsvektor.

Die Zizmor-Regel `unpinned-uses` ist in `zizmor.yml` aktuell explizit **deaktiviert**:
```yaml
unpinned-uses:
  disable: true
```

Das begründet einen direkten Angriffsvektor in der Build-Pipeline.

## Decision
Alle `uses:`-Referenzen in GitHub Actions Workflows werden auf **SHA-Hash-Pins** migriert.  
Format: `actions/checkout@<sha>  # v6`

Tooling: [`pin-github-actions`](https://github.com/mheads/pin-github-actions) oder `actionlint` automatisieren die Migration.

Die Zizmor-Regel `unpinned-uses` wird in `zizmor.yml` **reaktiviert** und als CI-Gate eingebunden.

## Rationale
- Tags sind mutable, SHA-Hashes sind immutable
- Supply-Chain-Angriffe auf GitHub Actions sind dokumentierte, aktiv ausgenutzte Vektoren (z.B. tj-actions/changed-files Vorfall 2023)
- Enterprise-Standard: SLSA Level 2+ verlangt Pinning
- Aufwand einmalig gering, Risikoreduktion dauerhaft hoch

## Consequences
- SHA-Hashes müssen bei Action-Updates manuell oder via Dependabot aktualisiert werden
- Dependabot-Konfiguration deckt dies bereits ab (ecosystem: github-actions)
- Kommentare im Workflow dokumentieren den Tag für Lesbarkeit: `# v6`

## Betroffene Dateien
- `.github/workflows/ci.yml`
- `.github/workflows/docker-release.yml`
- `.github/workflows/codeql.yml`
- `.github/workflows/*.yml` (alle)
- `zizmor.yml`

## Referenzen
- [GitHub Security Lab: Keeping your GitHub Actions and workflows secure](https://securitylab.github.com/research/github-actions-preventing-pwn-requests/)
- [SLSA Supply Chain Levels](https://slsa.dev/)

---

*OpenClaw · `docs/adr/`*
