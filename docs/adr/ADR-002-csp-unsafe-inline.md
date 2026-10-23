# ADR-002: CSP — Abschaffung von style-src 'unsafe-inline'

## Status
Accepted

## Date
2026-04-22

## Context
Die Content Security Policy der Control UI (`src/gateway/control-ui-csp.ts`) enthält aktuell:

```
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com
```

`unsafe-inline` für Styles erlaubt einem Angreifer mit XSS-Zugriff, beliebige CSS-Regeln zu injizieren. Über CSS können Daten exfiltriert werden (CSS Injection / Side-Channel über Attribut-Selektoren). Dies ist zwar aufwändiger als JS-Injection, aber ein dokumentierter Angriffsvektor — besonders relevant für ein Gateway das API-Keys und Kanal-Tokens verwaltet.

Das Script-src ist bereits korrekt auf SHA-256-Hash-basiert umgestellt. Styles sind die verbleibende Lücke.

## Decision
`unsafe-inline` aus `style-src` entfernen.  

**Gewählte Strategie: Hash-basiert** (konsistent mit dem bestehenden Inline-Script-Ansatz in `computeInlineScriptHashes`).

1. `buildControlUiCspHeader` in `src/gateway/control-ui-csp.ts` erhält eine analoge `computeInlineStyleHashes`-Funktion
2. Inline-`<style>`-Blöcke werden bei Build-Zeit gehasht
3. Google Fonts bleibt als externe Quelle erlaubt: `https://fonts.googleapis.com https://fonts.gstatic.com`
4. Falls Styles aus dem UI-Build-Prozess dynamisch generiert werden: CSS-Klassen als statische Dateien bündeln statt `<style>`-Tags

## Rationale
- Entfernt CSS Injection als Exfiltrationsvektor
- Konsistent mit der bestehenden SHA-256-Strategie für Scripts
- Kein Breaking Change für Endnutzer sichtbar

## Consequences
- UI-Build muss Inline-Style-Hashes zur Build-Zeit berechnen und an die CSP übergeben
- Dynamisch generierte Styles (z.B. Theme-Variablen) müssen auf CSS Custom Properties in einer statischen Datei umgestellt werden
- Testabdeckung: `src/gateway/control-ui.http.test.ts` muss CSP-Header-Assertion erweitern

## Alternative erwogen
**Nonce-basiert** — würde auch funktionieren, erfordert aber nonce-Generierung pro Request und Injection in alle `<style>`-Tags. Hash-basiert ist für statisches HTML einfacher und bereits im Projekt etabliert.

## Betroffene Dateien
- `src/gateway/control-ui-csp.ts`
- `src/gateway/control-ui.ts`
- `src/gateway/control-ui.http.test.ts`
- UI Build-Pipeline (falls Inline-Styles generiert werden)

---

*OpenClaw · `docs/adr/`*
