# ADR-006: Secret Scanning Integration

## Status

Accepted

## Date

2026-04-25

## Context

`.detect-secrets.cfg` und `.secrets.baseline` sind seit Projektbeginn vorhanden, waren aber nicht als eigener CI-Schritt verdrahtet. Ein committed Secret wird ohne Gate erst bei manuellem Audit oder zufällig entdeckt. Für ein Repo mit Tokens in Beispielen, Test-Fixtures und Konfig-Dokumentation ist das Risiko zu hoch.

## Decision

- **CI:** Job `secret-scanning` in `.github/workflows/ci.yml` (direkt nach `security-fast`) führt `pre-commit run … detect-secrets --all-files` aus — dieselbe Hook-Logik wie lokal. Installiert werden `detect-secrets` und `pre-commit` per `pip`. Für Pull Requests wird — analog zu `security-fast` — die `.pre-commit-config.yaml` vom **Base-Branch** verwendet (`PRE_COMMIT_CONFIG_PATH`), damit die Hook-Argumente nicht durch den PR-Branch ausgehebelt werden; Baseline-Datei und Working Tree bleiben der geprüften PR-Revision.
- **pre-commit:** Bestehender Hook `detect-secrets` mit `--baseline .secrets.baseline` und den projektspezifischen Excludes (die Yelp-CLI unterstützt **kein** `--config` für die INI `.detect-secrets.cfg`; die wirksamen Muster stehen in der Baseline und in den Hook-Args).
- **Baseline / Config:** `.secrets.baseline` und `.detect-secrets.cfg` bleiben versioniert.

**Technische Anmerkung:** `detect-secrets scan --baseline` aktualisiert die Baseline-Datei und ist kein reines „Fail-if-new“-Gate. `detect-secrets audit` (v1.5.0) bietet keine Flags `--fail-on-unaudited` / `--fail-on-live`. Die Durchsetzung erfolgt über den Pre-Commit-Hook (Differenz zur Baseline).

## Rationale

- Verhindert versehentlich neu eingeführte Secret-Fundstellen gegenüber der Baseline.
- Baseline-Ansatz hält False Positives beherrschbar.
- pre-commit (lokal) + identischer Check in CI = doppelter Schutz.
- detect-secrets war bereits konfiguriert — es fehlte die feste CI-Verdrahtung.

## Consequences

- Neue, nicht in der Baseline erlaubte Funde → CI rot, bis Baseline oder Code angepasst und committed ist.
- Neue Entwickler: optional Pre-Commit; sonst greift der CI-Job.
- Änderungen an den Exclude-Regeln sollten in `.pre-commit-config.yaml` / Baseline zusammenlaufen; nach Scanner-Updates kann eine Baseline-Aktualisierung nötig sein (in einem vollen Git-Checkout, z. B. `detect-secrets scan --baseline .secrets.baseline`, danach Review).

## Betroffene Dateien

- `.github/workflows/ci.yml`
- `.pre-commit-config.yaml`
- `.secrets.baseline`
- `.detect-secrets.cfg`
