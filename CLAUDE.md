# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projekt-Überblick

Darwin's Arena ist eine interaktive Evolutionssimulation im Browser. Virtuelle Kreaturen (Dots) mit neuronalen Netz-Gehirnen entwickeln sich durch natürliche Selektion. Basiert konzeptuell auf [biosim4](https://github.com/davidrmiller/biosim4), aber komplett in TypeScript/React neu implementiert.

## Befehle

```bash
npm run dev       # Dev-Server starten (http://localhost:5173, Hot Reload)
npm run build     # TypeScript prüfen + Vite-Bundle erstellen (dist/)
npm run preview   # Produktions-Build lokal testen
```

Kein Lint- oder Test-Script konfiguriert.

## Architektur

### Web Worker / Haupt-Thread-Trennung

Die gesamte Simulationslogik läuft in einem Web Worker (`src/workers/simulation.worker.ts`), damit der UI-Thread reaktiv bleibt. Kommunikation ausschließlich per Message Passing:

- **Commands** (UI → Worker): `init`, `start`, `pause`, `reset`, `setSpeed`, `updateConfig`, `inspectAgent`
- **Messages** (Worker → UI): `state`, `generation`, `agentInfo`, `perf`, `ready`

Der React-Hook `src/hooks/useSimulation.ts` verwaltet die Worker-Instanz und den gesamten bidirektionalen Nachrichtenaustausch. Hier liegt der zentrale State der Anwendung.

### Simulationsengine (`src/simulation/`)

Der Kern-Loop in `simulator.ts`:

1. **Pro Schritt**: Jede Kreatur liest Sensoren (`sensors.ts`) → Feed-Forward durch ihr neuronales Netz (`neural-net.ts`) → führt Aktionen aus (`actions.ts`)
2. **Pro Generation**: Fitness-Bewertung via Challenge (`survival.ts`) → Selektion → Reproduktion mit Mutation/Crossover (`spawn.ts`)

Wichtige Dateien:
- `types.ts` — Zentrale Enums, Typen, Konstanten; hier anfangen beim Verstehen des Datenmodells
- `params.ts` — Alle konfigurierbaren Simulationsparameter
- `genome.ts` + `genome-codec.ts` — Genom-Datenstruktur und URL-safe Serialisierung (Genome teilen)
- `challenge-descriptions.ts` — 19 Challenges mit ihren Überlebensregeln

### React-Komponenten (`src/components/`)

`App.tsx` hält den Top-Level-State und koordiniert:
- `SplashScreen` → Preset-Auswahl beim Start
- `SimCanvas` — Canvas-Rendering (Agenten, Wände, Signal-Schichten); hier liegt auch die Click-to-Inspect-Logik
- `ControlPanel` — Alle Steuer-Parameter
- `Commentary`, `StatsGraph`, `LineageTree`, `GenomeGraph` — Visualisierung/Analyse

### Performance-Besonderheiten

- ArrayBuffers werden per Transferable (Zero-Copy) zwischen Worker und Main Thread übertragen
- History wird auf 500 Einträge gecappt (`useSimulation.ts`)
- `stepsPerUpdate` wird auto-skaliert aus `stepsPerGeneration` um eine Ziel-FPS zu erreichen

## Deployment

Vercel erkennt Vite automatisch. Push auf `main` → Auto-Deploy. Kein `vercel.json` nötig.

Das `Makefile` und `.github/workflows/main.yml` gehören zum Legacy-C++-Simulator und sind für die Web-App irrelevant.
