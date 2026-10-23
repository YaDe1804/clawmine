# ADR-008: Raspberry Pi Deployment (Drop-Box)

## Status
Accepted

## Date
2026-09-17

## Context
Autorisierte Pentests brauchen eine physische Drop-Box, die lange unbeaufsichtigt laufen kann, ohne Cloud-Abhängigkeit und ohne macOS-/iOS-Support. Der Fork ist bewusst auf Windows, Linux und Docker begrenzt. Ein ARM64-Linux-Gerät muss denselben lokalen Stack tragen: Gateway, Ollama und verschlüsselte persistente Daten.

Drei Optionen wurden evaluiert:

**Option A — Cloud-VM oder gemieteter VPS:**  
Verstößt gegen die Local-Only-Provider-Politik, erweitert die Angriffsfläche und legt Verkehrs- plus Modellkontext außerhalb des Auftraggebers.

**Option B — x86-Mini-PC:**  
Leistungsfähig, aber höherer Strombedarf, größere Signatur und unnötig für Headless-Ollama-Workloads.

**Option C — Raspberry Pi 4/5 als Linux-Drop-Box:**  
ARM64, 24/7-Betrieb, niedriger Stromverbrauch, vollständig lokal mit Ollama, ohne Cloud-Provider.

## Decision
Raspberry Pi 4 und Raspberry Pi 5 (ARM64 Linux) sind die Referenz-Hardware für autorisierte Pentest-Drop-Boxes.

Pflicht-Constraints:

- Headless-Betrieb, kein Desktop-Stack
- Autostart über systemd (`openclaw gateway` als Dienst)
- Volle Datenträger-Verschlüsselung mit LUKS
- Tamper-Detection (Gehäuse-/Boot-Integrität, Dienst-Health, Alert bei unerwartetem Offline-Status)
- Nur lokale Inferenz (Ollama). Keine Cloud-Provider, keine Messenger-Channels
- Physischer Zugang und Scope bleiben Auftraggeber-kontrolliert

## Rationale
- ARM64 Linux liegt in der unterstützten Plattformmatrix (Linux; nicht macOS/iOS)
- 24/7-Betrieb bei niedrigem Strombedarf ist für Drop-Box-Einsätze entscheidend
- Lokales Ollama erfüllt die Provider-Politik ohne API-Keys oder ausgehende Modellaufrufe
- systemd ist der native Headless-Autostart auf Debian/Raspberry Pi OS
- LUKS plus Tamper-Detection begrenzt den Schaden bei Verlust oder Manipulation des Geräts

## Consequences
- Images, systemd-Units und Backup-Pfade müssen ARM64-Linux annehmen
- Modellgrößen und RAM-Limits (Pi 4 vs. Pi 5) steuern, welche lokalen Modelle zulässig sind
- Cloud-Fallbacks oder Messenger-Relays bleiben ausgeschlossen
- Tamper- und Health-Signale laufen lokal oder über den späteren AntarBridge-Kanal, nicht über Drittanbieter-Messenger

## Betroffene Dateien
- `docs/adr/ADR-008-raspberry-pi-deployment.md`
- `docs/adr/ADR-index.md`
- spätere systemd-/Install-Artefakte unter Linux-Deploy-Dokumentation

## Referenzen
- `AGENTS.md` — Supported Platforms, Provider Policy Local Only
- `docs/adr/ADR-007-edition-architecture.md` — API-First Core auf lokalem Gateway
