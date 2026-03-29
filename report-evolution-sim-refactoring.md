# Report: Evolution Simulator — Refactoring von C++ zu TypeScript/React

## Zusammenfassung

Das Open-Source-Projekt [biosim4](https://github.com/davidrmiller/biosim4) (ca. 5.000 LOC C++17) wurde vollständig in eine moderne TypeScript/React-WebApp portiert. Die Simulation läuft im Browser mit Echtzeit-Visualisierung via Canvas 2D und interaktiven Controls. Die gesamte Simulationslogik wurde in einen Web Worker ausgelagert, um die UI nicht zu blockieren.

---

## 1. Ausgangslage: biosim4 (C++)

### Was macht biosim4?

Biologische Kreaturen mit neuronalen Netzen (gesteuert durch ein Genom) leben auf einem 2D-Grid. Am Ende jeder Generation wird geprüft, wer eine Challenge bestanden hat. Überlebende reproduzieren sich mit Mutation — über hunderte Generationen entsteht geordnetes Verhalten durch natürliche Selektion.

### Technologie-Stack (Original)

| Komponente | Technologie |
|------------|-------------|
| Sprache | C++17 |
| Parallelismus | OpenMP (`#pragma omp parallel`) |
| Visualisierung | OpenCV (nachträgliche Video-Generierung) |
| Konfiguration | INI-Datei (`biosim4.ini`) |
| Build | CMake / Makefile |
| Plattform | Linux/macOS (CLI) |

### Architektur-Übersicht (C++)

```
main.cpp → simulator()
  ├── ParamManager (biosim4.ini)
  ├── Grid (2D Uint16-Array, column-major)
  ├── Peeps (Population Container, Death/Move Queues)
  ├── Signals (Pheromon-Schichten)
  └── Generation Loop:
       ├── SimStep Loop (parallel pro Agent):
       │    ├── feedForward() → Sensor → Neuron → Action
       │    └── executeActions() → Move/Signal/Kill Queues
       ├── endOfSimStep() → Drain Queues, Fade Signals
       └── spawnNewGeneration() → Survival, Selection, Mutation
```

---

## 2. Zielarchitektur: TypeScript + React + Canvas

### Gewählter Ansatz

**Option 1 (TypeScript + Canvas 2D)** wurde gewählt als bester Kompromiss aus Zugänglichkeit (läuft im Browser), Interaktivität (Live-Controls) und Entwicklungsgeschwindigkeit.

### Neuer Technologie-Stack

| Komponente | Technologie |
|------------|-------------|
| Sprache | TypeScript (strict mode) |
| Framework | React 19 + Vite 8 |
| Styling | Tailwind CSS v4 |
| Visualisierung | Canvas 2D API (Echtzeit, jeden Frame) |
| Parallelismus | Web Worker (non-blocking UI) |
| Konfiguration | React State + UI Controls (Slider, Dropdowns) |
| Build | Vite + TypeScript Compiler |
| Plattform | Jeder moderne Browser |

### Dateistruktur

```
src/
├── simulation/                  # Portierte Simulationslogik
│   ├── types.ts          (451 LOC)  — Coord, Dir, Gene, Genome, NeuralNet, Indiv, Enums
│   ├── grid.ts           (285 LOC)  — 2D Uint16Array Grid + 7 Barrier-Typen
│   ├── peeps.ts          (126 LOC)  — Population Container, Death/Move Queues
│   ├── signals.ts        (115 LOC)  — Pheromon-Schichten (Float32Array)
│   ├── params.ts         (140 LOC)  — SimParams Interface + Defaults
│   ├── random.ts          (15 LOC)  — RNG Utilities
│   ├── genome.ts         (450 LOC)  — Gene-Erstellung, Mutation, Crossover, Vergleich
│   ├── neural-net.ts     (365 LOC)  — createWiringFromGenome + feedForward
│   ├── sensors.ts        (300 LOC)  — 21 Sensor-Typen
│   ├── actions.ts        (165 LOC)  — 16 Action-Typen
│   ├── survival.ts       (377 LOC)  — 19 Challenge-Typen
│   ├── spawn.ts          (120 LOC)  — Generations-Management
│   └── simulator.ts      (260 LOC)  — Hauptschleife + State-Serialisierung
├── workers/
│   └── simulation.worker.ts (165 LOC)  — Web Worker Loop
├── components/
│   ├── SimCanvas.tsx     (105 LOC)  — Canvas 2D Renderer
│   ├── ControlPanel.tsx  (280 LOC)  — Parameter-Controls
│   └── StatsGraph.tsx    (110 LOC)  — Überlebensrate + Diversitäts-Graph
├── hooks/
│   └── useSimulation.ts   (85 LOC)  — Worker-Kommunikation Hook
└── App.tsx                (55 LOC)  — Hauptlayout
```

**Gesamt: ca. 3.970 LOC TypeScript** (vs. 5.170 LOC C++)

---

## 3. Mapping: C++ → TypeScript

### Datenstrukturen

| C++ | TypeScript | Anmerkungen |
|-----|-----------|-------------|
| `class Grid` (Uint16 2D-Array) | `class Grid` (Uint16Array, column-major) | Identisches Layout |
| `struct Indiv` | `interface Indiv` | Immutable Interface statt Struct |
| `struct Gene` (Bitfields) | `interface Gene` (5 number-Felder) | Kein Bitpacking nötig |
| `struct NeuralNet` | `interface NeuralNet` | Connections + Neurons |
| `class Peeps` (std::vector) | `class Peeps` (Array) | Index 0 reserviert |
| `struct Signals` (uint8 3D) | `class Signals` (Float32Array) | Bessere Präzision |
| `enum Compass` | `enum Compass` | 1:1 Mapping |
| `class Dir` | `class Dir` | Rotation via Lookup-Table |
| `class Coord` | `class Coord` | Arithmetik-Methoden |

### Simulation Engine

| C++ Funktion | TypeScript Äquivalent |
|-------------|----------------------|
| `simulator()` | `class Simulator` mit `step()` / `runGeneration()` |
| `simStepOneIndiv()` | `Simulator.simStepOneIndiv()` |
| `feedForward()` | `feedForward(nnet, simStep, getSensor, params)` |
| `getSensor()` | `getSensor(indiv, sensor, simStep, grid, peeps, signals, params)` |
| `executeActions()` | `executeActions(indiv, actionLevels, grid, peeps, signals, params)` |
| `endOfSimStep()` | `Simulator.endOfSimStep()` |
| `spawnNewGeneration()` | `spawnNewGeneration(peeps, grid, signals, params, gen)` |
| `passedSurvivalCriterion()` | `passedSurvivalCriterion(indiv, challenge, params, grid)` |
| OpenMP `#pragma omp parallel` | Web Worker (einzelner Thread, non-blocking) |

### Parallelismus-Modell

```
C++:                              TypeScript:
┌──────────────────┐              ┌──────────────────┐
│   Main Thread    │              │   Main Thread    │
│  ┌────────────┐  │              │  React + Canvas  │
│  │ Sim Loop   │  │              │  (nur Rendering) │
│  │ (OpenMP)   │  │              └────────┬─────────┘
│  │ 4 Threads  │  │                       │ postMessage
│  └────────────┘  │              ┌────────▼─────────┐
│  Video Output    │              │   Web Worker     │
└──────────────────┘              │  Sim Loop        │
                                  │  (single thread) │
                                  └──────────────────┘
```

---

## 4. Portierte Features

### Sensoren (21/21 portiert)

| Kategorie | Sensoren |
|-----------|----------|
| Position | `LOC_X`, `LOC_Y` |
| Grenzen | `BOUNDARY_DIST`, `BOUNDARY_DIST_X`, `BOUNDARY_DIST_Y` |
| Population | `POPULATION`, `POPULATION_FWD`, `POPULATION_LR` |
| Barrieren | `BARRIER_FWD`, `BARRIER_LR` |
| Pheromone | `SIGNAL0`, `SIGNAL0_FWD`, `SIGNAL0_LR` |
| Individuum | `AGE`, `OSC1`, `LAST_MOVE_DIR_X/Y`, `GENETIC_SIM_FWD` |
| Fernprobe | `LONGPROBE_POP_FWD`, `LONGPROBE_BAR_FWD` |
| Zufall | `RANDOM` |

### Aktionen (16/16 + KILL_FORWARD portiert)

- Bewegung: `MOVE_X/Y`, `MOVE_FORWARD`, `MOVE_RL`, `MOVE_RANDOM`, `MOVE_EAST/WEST/NORTH/SOUTH`, `MOVE_LEFT/RIGHT/REVERSE`
- Interne Parameter: `SET_OSCILLATOR_PERIOD`, `SET_LONGPROBE_DIST`, `SET_RESPONSIVENESS`
- Umwelt: `EMIT_SIGNAL0`, `KILL_FORWARD`

### Challenges (19/19 portiert)

Alle Challenge-Typen aus dem C++ Original, darunter:
- Räumliche Ziele: Circle, Right Half, Center Weighted, Corner, Corner Weighted
- Verhaltens-Ziele: Migrate Distance, Pairs, Touch Any Wall
- Spezial: Radioactive Walls, Altruism, Location Sequence

### Barrier-Typen (7 Typen)

0: Keine, 1: Vertikale Wand, 2: Zufällige vertikale Wand, 3: Fünf Blöcke, 4: Horizontale Wand, 5: Drei Inseln, 6: Vertikale Punkt-Reihe

---

## 5. Neue Features (vs. C++ Original)

| Feature | C++ Original | TypeScript Version |
|---------|-------------|-------------------|
| Visualisierung | Nachträgliche MP4-Generierung | Echtzeit Canvas 2D, jeden Frame |
| Interaktion | INI-Datei editieren + Neustart | Live-Slider, Dropdowns, Start/Pause/Reset |
| Statistiken | Console Output + externe Scripts | Echtzeit-Graph (Überlebensrate + Diversität) |
| Plattform | Linux/macOS mit OpenCV | Jeder Browser, kein Install |
| Agenten-Farben | Einheitlich | Genom-Hash-basierte Farben (ähnliche Genome = ähnliche Farben) |
| UI-Tabs | — | Welt / Genom / Sensor Kategorien |
| Challenge-Auswahl | INI-Datei | Dropdown mit deutschen Beschreibungen |

---

## 6. Performance-Optimierungen

### Identifizierte und behobene Probleme

| Problem | Ursache | Auswirkung | Lösung |
|---------|---------|------------|--------|
| Browser-Tab Crash nach ~30s | `postMessage` kopierte ~75KB TypedArrays pro Frame | Out-of-Memory (OOM) | **Transferable Objects** — Zero-Copy Buffer-Transfer an Main Thread |
| Massive GC-Pressure | `visitNeighborhood` erstellte ~500.000 `new Coord()` pro Sekunde | Ruckeln, Memory-Spikes | Wiederverwendbarer `_visitCoord` statt neuer Allokation |
| Unnötige CPU-Last | `genomeColor()` bei jedem Frame für jeden Agenten neu berechnet | Verschwendete Zyklen | Farb-Cache pro Generation (Genom ändert sich nicht innerhalb einer Generation) |
| Message-Flooding | State bei jedem Loop-Tick an Main Thread gesendet | Main Thread überlastet | Throttle auf ~10fps (State-Updates) |
| Signal-Layer Allokation | 16.384 `new Coord()` Objekte pro Frame für Signal-Lesen | GC-Pressure | `getMagnitudeXY(x, y)` — direkter Index-Zugriff ohne Coord |

### Performance-Kennzahlen (nach Optimierung)

| Metrik | Wert |
|--------|------|
| Build-Größe (JS) | 204 KB (gzip: 64 KB) |
| Build-Größe (CSS) | 15 KB (gzip: 4 KB) |
| Worker-Bundle | 32 KB |
| Build-Zeit | ~100ms |
| Sim-Geschwindigkeit | ~3 Generationen/10s (1000 Pop, 300 Steps/Gen) |
| State-Updates | ~10 fps (throttled) |
| Stabilitätstest | 60+ Sekunden ohne Crash oder Memory-Leak |

---

## 7. Architektur-Entscheidungen

### Warum Web Worker statt WebGPU?

Die ursprüngliche Empfehlung war WebGPU Compute Shaders. Für den ersten Meilenstein wurde stattdessen ein Web Worker gewählt:

- **Portierbarkeit**: CPU-basierte Simulation ist 1:1 aus C++ übersetzbar
- **Debugging**: TypeScript-Code ist leichter zu debuggen als WGSL-Shader
- **Browser-Support**: Web Workers funktionieren überall, WebGPU nur in Chrome/Edge
- **Upgrade-Pfad**: Die Simulationslogik kann später in WebGPU Compute Shaders verschoben werden, ohne die UI zu ändern

### Warum Canvas 2D statt WebGL/WebGPU Rendering?

- 128×128 Grid mit 1000 Agenten ist für Canvas 2D trivial
- Kein Shader-Boilerplate nötig
- Bei größeren Grids (512×512+) wäre WebGL sinnvoll

### Warum Vite statt Next.js?

- Reine Client-Side App, kein SSR nötig
- Web Worker Integration ist mit Vite einfacher
- Schnellerer Dev-Server Start (~130ms)

---

## 8. Bekannte Einschränkungen

| Einschränkung | Beschreibung | Möglicher Fix |
|---------------|-------------|---------------|
| Single-Threaded Simulation | Kein OpenMP-Äquivalent im Browser | WebGPU Compute Shaders für parallele Agent-Steps |
| Challenge-Nummern | Die C++ Challenge-Enum-Nummern stimmen nicht 1:1 mit den TS-Enums überein | Explizites Mapping statt sequentieller Enum-Werte |
| Keine Config-Persistenz | Parameter gehen bei Page-Reload verloren | `localStorage` oder URL-Parameter |
| Kein Genom-Inspector | Im C++ gab es Console-Output für Sample-Genome | Modal/Panel mit Genom-Visualisierung |
| Geschwindigkeit | ~3 Gen/10s vs. C++ mit OpenMP deutlich schneller | WebGPU oder WASM-Compilation |

---

## 9. Mögliche nächste Schritte

1. **WebGPU Compute Shaders** — feedForward + executeActions auf GPU verlagern (10-100× Speedup)
2. **Genom-Visualisierung** — Neuronales Netz als interaktiven Graphen anzeigen
3. **Preset-System** — Interessante Konfigurationen als One-Click-Presets
4. **Export/Import** — Genome als JSON exportieren/importieren
5. **Vercel Deployment** — Als statische Web-App deployen (Zero-Config)
6. **Population Heatmap** — Dichte-Overlay auf dem Grid
7. **Geschwindigkeits-Boost** — Headless-Modus (kein Rendering) für schnelle Evolution

---

## 10. Fazit

Die Portierung von biosim4 nach TypeScript/React ist vollständig und funktionsfähig. Die gesamte Simulationslogik (21 Sensoren, 16 Aktionen, 19 Challenges, Neural-Net feedForward mit 2-Pass-Logik, Genom-Mutation und sexuelle Rekombination) wurde originalgetreu übersetzt. Die Web-Version bietet gegenüber dem C++ Original erhebliche Vorteile in Zugänglichkeit und Interaktivität — auf Kosten der Rohgeschwindigkeit, die durch WebGPU in einem späteren Schritt zurückgewonnen werden kann.
