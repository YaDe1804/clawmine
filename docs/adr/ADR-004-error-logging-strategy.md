# ADR-004: Error Logging Strategie — keine stillen catch-Blöcke

## Status
Accepted

## Date
2026-04-22

## Context
Im Codebase existieren ca. 15 Vorkommen von `catch(() => {})` — leere Catch-Blöcke die Fehler stillschweigend verwerfen. Der häufigste Fall ist Ressourcen-Cleanup:

```typescript
// src/infra/fs-safe.ts (mehrfach)
await handle.close().catch(() => {});
await fs.rm(cleanupPath, { force: true }).catch(() => {});
```

Auch in anderen Bereichen:
```typescript
// src/infra/exec-approval-channel-runtime.ts
await startPromise.catch(() => {});
// src/infra/approval-handler-bootstrap.ts
await handler.stop().catch(() => {});
```

**Konsequenz:** Im Fall eines Incidents sind diese Fehler unsichtbar. Logs zeigen keine Spur von fehlgeschlagenen Cleanups, nicht gestoppten Handlers, oder Ressourcenlecks. Das widerspricht Enterprise-Anforderungen an Observability.

## Decision
**Alle `catch(() => {})` Blöcke werden ersetzt** durch minimales strukturiertes Logging:

```typescript
// Vorher
await handle.close().catch(() => {});

// Nachher
await handle.close().catch((err: unknown) => {
  logger.debug('fs-safe: handle.close failed during cleanup', { err });
});
```

**Regeln:**
1. `catch(() => {})` ist verboten — oxlint-Regel `no-empty-function` erzwingen (falls noch nicht aktiv)
2. Cleanup-Fehler: `logger.debug()` — nicht `warn`/`error` um Log-Flooding zu vermeiden
3. Fehler in Haupt-Pfaden: `logger.warn()` mindestens
4. Fehler die den Nutzer betreffen können: `logger.error()`
5. Error-Objekt immer mitloggen: `{ err }` nicht nur `err.message`

**Ergänzend:** Globaler `unhandledRejection`-Handler in `src/entry.ts`:
```typescript
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Promise rejection', { reason });
});
```

## Rationale
- Cleanup-Fehler sind selten aber diagnostisch wertvoll — `debug` Level ist der richtige Trade-off
- Incident Response ohne Logs ist blind
- `logger.debug()` erzeugt keinen Produktions-Noise (debug-Level standardmäßig aus)
- Strukturierte Logs (`{ err }`) sind maschinenlesbar für Log-Aggregatoren (ELK, Loki etc.)

## Consequences
- ~15 Stellen in `src/infra/fs-safe.ts` et al. müssen angepasst werden
- oxlint-Regel für leere Catch-Blöcke aktivieren um Regression zu verhindern
- Kein funktionales Breaking Change

## Betroffene Dateien (Auszug)
- `src/infra/fs-safe.ts` (~12 Vorkommen)
- `src/infra/exec-approval-channel-runtime.ts`
- `src/infra/approval-handler-bootstrap.ts`
- `src/entry.ts` (unhandledRejection Handler hinzufügen)
- `.oxlintrc.json` (Regel aktivieren)

---

*OpenClaw · `docs/adr/`*
