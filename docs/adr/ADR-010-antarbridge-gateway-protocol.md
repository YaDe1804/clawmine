# ADR-010: AntarBridge Gateway Protocol

## Status
Accepted

## Date
2026-09-17

## Context
ADR-009 macht AntarBridge zum einzigen Messaging-Kanal dieses Forks. Der Gateway spricht bereits ein versioniertes WebSocket-Protokoll (`PROTOCOL_VERSION`, Connect/Hello, `req`/`res`/`event`). AntarBridge braucht denselben Transport, darf aber keine Messenger-Channel-IDs in Core hardcoden und darf Klartext-Payloads nicht über den Control-Plane legen.

Drei Optionen:

**Option A — eigener TCP-Bridge-Port:**  
Widerspricht der entfernten Legacy-Bridge und verdoppelt Auth- und Pairing-Surface.

**Option B — REST-Polling über HTTP:**  
Ungeeignet für Tor-Onion-Pfade und Per-Message-Keypairs; Metadaten und Retry-Verhalten werden schlechter.

**Option C — additive Gateway-WebSocket-Methoden unter `antarbridge.*`:**  
Nutzt Connect/Hello, Token- oder Device-Auth der bestehenden Control-Plane, und kapselt Onion-Routing plus Per-Message-Keys in einem eigenen Envelope.

## Decision
AntarBridge dockt additiv an das bestehende Gateway-WebSocket-Protokoll an. Es gibt keinen zweiten Listener und keine neuen Messenger-Extensions.

### Transport
- Dieselbe Gateway-WebSocket-Verbindung wie Operator-Clients (`ws://` nur Loopback/privates LAN, `wss://` für Tailscale und öffentliche Endpunkte).
- Frames bleiben `req` / `res` / `event` gemäß `src/gateway/protocol/schema/frames.ts`.
- Neue Methoden: `antarbridge.send`, `antarbridge.receive`, `antarbridge.status`, `antarbridge.disconnect`.
- Handshake liegt vor dem ersten `send` als `antarbridge.hello` (Params/Result in `src/gateway/protocol/antarbridge-channel.ts`).

### Handshake (Per-Message-Keypair)
1. Client führt den normalen Gateway-`connect` aus (Protokollversion, Client-Info, vorhandene Gateway-Auth).
2. Client sendet `antarbridge.hello` mit langlebiger Identity-Public-Key, frischem Ephemeral-Public-Key, Nonce, Signatur und Onion-Adresse.
3. Gateway prüft Signatur gegen die Identity-Key, antwortet mit `sessionId`, Server-Ephemeral-Public-Key, Nonce und Signatur.
4. Jede Nutzlast danach verwendet ein **neues** Nachrichtenschlüsselpaar. Der Envelope trägt nur Ciphertext (`payload_encrypted`). Kompromittierung eines Message-Keys gilt nicht für andere Nachrichten.

### Envelope
Pflichtfelder, unverändert auf dem Wire:

```
{ id, from_onion, to_onion, payload_encrypted, timestamp }
```

`from_onion` / `to_onion` sind v3-Onion-Adressen ohne Schema. `payload_encrypted` ist Base64url. `timestamp` ist Unix-ms.

### Inner StatusMessage
Klartext vor dem Per-Message-Seal (nie unverschlüsselt auf dem Wire):

```
{ "type": "status", "text": "...", "error": { "code": "...", "message": "...", "scraper": "lotto649" } }
```

`text` und `error` sind optional. Cron- und OpenLotto-Scheduler senden Fehler als `StatusMessage`; das Plugin siegelt danach in `payload_encrypted`.

### Commands
| Methode | Rolle |
|---------|--------|
| `antarbridge.send` | Envelope zustellen |
| `antarbridge.receive` | wartende Envelope seit `sinceTimestamp` |
| `antarbridge.status` | Session, Onion, letzter Timestamp |
| `antarbridge.disconnect` | Session beenden |

Runtime-Handler gehören ins AntarBridge-Plugin, nicht in Core-Channel-Special-Cases. Core exportiert nur die typed contract surface.

## Rationale
- Ein Transport, eine Auth-Grenzfläche, ein Protokoll-Versionierungsmodell
- Per-Message-Keys begrenzen Blast-Radius gegenüber langlebigen Channel-Tokens
- Onion-Adressen bleiben im Envelope; Gateway sieht keinen Klartext
- Additive Methoden vermeiden einen Breaking Change an `PROTOCOL_VERSION`

## Consequences
- `src/gateway/protocol/antarbridge-channel.ts` ist die Quelle der Envelope- und Command-Typen
- Codegen (`scripts/protocol-gen.ts`) nimmt die Methoden auf, sobald sie in `ProtocolSchemas` registriert werden; bis der Plugin-Runtime-Pfad existiert, bleiben sie ein separates Export
- Keine Discord-/Telegram-/WhatsApp-Channel-IDs in diesem Vertrag
- Tests müssen Prefix-Stabilität der Gateway-Connect-Frames erhalten; AntarBridge-Methoden dürfen die Connect-Payload nicht umsortieren

## Betroffene Dateien
- `src/gateway/protocol/antarbridge-channel.ts`
- `src/gateway/protocol/schema.ts`
- `docs/adr/ADR-010-antarbridge-gateway-protocol.md`
- `docs/adr/ADR-index.md`

## Referenzen
- [ADR-009 AntarBridge Only Channel](/adr/ADR-009-antarbridge-only-channel)
- [Gateway Protocol](/gateway/protocol)
- `src/gateway/protocol/schema.ts`
