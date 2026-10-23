# ADR-003: HSTS — Default-on statt opt-in

## Status
Accepted

## Date
2026-04-22

## Context
`Strict-Transport-Security` (HSTS) ist in `setDefaultSecurityHeaders` (`src/gateway/http-common.ts`) aktuell opt-in:

```typescript
const strictTransportSecurity = opts?.strictTransportSecurity;
if (typeof strictTransportSecurity === 'string' && strictTransportSecurity.length > 0) {
  res.setHeader('Strict-Transport-Security', strictTransportSecurity);
}
```

Kein Aufrufer übergibt diesen Parameter in der Standardkonfiguration. Das bedeutet: HSTS ist in Produktionsdeployments ohne manuelle Konfiguration inaktiv.

HSTS schützt vor Downgrade-Angriffen (HTTPS → HTTP) und Cookie-Hijacking. Ein Gateway das API-Keys und Channel-Tokens überträgt, sollte HSTS aktiv erzwingen.

## Decision
HSTS wird **standardmäßig aktiviert** wenn der Gateway auf einer nicht-Loopback-Adresse bindet.

Implementierung:
```typescript
export function setDefaultSecurityHeaders(
  res: ServerResponse,
  opts?: { strictTransportSecurity?: string | false },
) {
  // ...
  const hsts = opts?.strictTransportSecurity !== false
    ? (opts?.strictTransportSecurity ?? 'max-age=63072000; includeSubDomains')
    : null;
  if (hsts && isHttpsResponse(res)) {
    res.setHeader('Strict-Transport-Security', hsts);
  }
}
```

- Default: `max-age=63072000; includeSubDomains` (2 Jahre — HSTS-Preload-kompatibel)
- Opt-out explizit möglich via `{ strictTransportSecurity: false }` für lokale Entwicklung
- Nur gesetzt wenn TLS aktiv (kein HSTS über HTTP)

## Rationale
- HSTS über HTTP zu senden ist sinnlos und laut Spec verboten — daher Schutz via `isHttpsResponse`-Guard
- Lokale Entwicklung (loopback, kein TLS) bleibt unberührt durch den Guard
- 2 Jahre max-age ist der de-facto Enterprise-Standard und Preload-Voraussetzung

## Consequences
- Loopback-Deployments (Entwicklung): keine Änderung
- TLS-Deployments (Produktion): HSTS wird automatisch gesetzt
- Operatoren die HSTS nicht wollen (Edge-Cases): explizites `false` nötig

## Betroffene Dateien
- `src/gateway/http-common.ts`
- `src/gateway/auth.test.ts` (Header-Assertions)
- `src/gateway/control-ui.http.test.ts`

---

*OpenClaw · `docs/adr/`*
