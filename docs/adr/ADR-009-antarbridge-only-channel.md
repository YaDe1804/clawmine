# ADR-009: AntarBridge als einziger Kommunikationskanal

## Status
Accepted

## Date
2026-09-17

## Context
Upstream OpenClaw bundelt Dutzende Messenger-Channels (Discord, Telegram, Slack, WhatsApp, Signal und weitere). Jeder Channel ist ein eigener Trust-Boundary: Tokens, Webhooks, Group-Policy, Pairing und Metadata-Leaks. Für diesen Fork sind unbeaufsichtigte Messenger-Bridges inakzeptabel.

AntarBridge (Rust/Flutter, in Entwicklung) ist als sicherer Messaging-Layer vorgesehen: Ende-zu-Ende-Verschlüsselung, Tor-Routing, Per-Message-Keypairs und Duress-PIN.

## Decision
AntarBridge ist der einzige unterstützte Kommunikationskanal dieses Forks.

- Alle 22 externen Messenger-Extensions wurden bewusst entfernt
- Es werden keine neuen Messenger-Channel-Extensions (Discord, Telegram, WhatsApp, Signal, Slack, u. a.) hinzugefügt
- Bis AntarBridge produktionsreif ist, bleibt der lokale Gateway-Control-Pfad (loopback) der operative Kanal
- Channel-Tests dürfen Fake-Plugins verwenden, aber Produktionscode und öffentliche Config dürfen keine entfernten Messenger als First-Class-Channel reaktivieren

## Rationale
- E2E-Verschlüsselung statt Token-basierter Bot-APIs
- Tor-Routing reduziert Metadaten gegenüber zentralen Messenger-Backends
- Per-Message-Keypairs begrenzen Kompromittierung auf einzelne Nachrichten
- Duress-PIN gibt einen kontrollierten Zwangszugang, den klassische Bot-Tokens nicht bieten
- Weniger Channel-Surface bedeutet weniger Pairing-, Allowlist- und Secret-Pfade im Core

## Consequences
- Core bleibt messenger-agnostisch; AntarBridge dockt über Plugin-SDK / Gateway an, nicht über hardcodierte Channel-IDs
- Docs, Onboarding und Status-UIs beschreiben keine Discord-/Telegram-/Slack-Setup-Pfade als unterstützt
- Legacy-Config mit `channels.discord.*` und ähnlichen Schlüsseln gehört in Doctor-Repair oder wird abgewiesen, nicht still reaktiviert
- Test-Fixtures können generische Channel-Plugins nutzen, ohne entfernte Messenger zurückzubringen

## Betroffene Dateien
- `docs/adr/ADR-009-antarbridge-only-channel.md`
- `docs/adr/ADR-index.md`
- `AGENTS.md` — Messaging / Supported Platforms
- entfernte `extensions/<messenger>/` Pakete (Discord, Telegram, Slack, WhatsApp, Signal, u. a.)

## Referenzen
- `AGENTS.md` — Messaging: No built-in messenger channels
- `docs/adr/ADR-007-edition-architecture.md` — Gateway als einziger Integrationspunkt
