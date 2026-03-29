# Darwin-Dots

Evolutionssimulation im Browser. Beobachte, wie neuronale Netze durch natürliche Selektion lernen, Challenges zu meistern.

## Was ist das?

Darwin-Dots simuliert eine Population kleiner Punkte ("Dots"), die jeweils ein eigenes neuronales Netz als Gehirn besitzen. Jeder Dot nimmt seine Umgebung wahr (Position, Wandnähe, Artgenossen, Hindernisse) und entscheidet sich basierend auf seinen Genen für Bewegungen. Am Ende jeder Generation überleben nur die Dots, die eine bestimmte Challenge geschafft haben. Ihre Gene werden vererbt und mutiert -- und über viele Generationen entstehen Strategien, die niemand programmiert hat.

Basiert auf dem Originalkonzept von [biosim4](https://github.com/davidrmiller/biosim4) ("I programmed some creatures. They evolved."), komplett neu geschrieben als interaktive Web-App.

## Features

- **19 Challenges** -- von einfacher Navigation bis zu komplexen Aufgaben wie Paarbildung, Altruismus oder Flucht vor radioaktiven Waenden
- **Echtzeit-Visualisierung** -- Canvas-Rendering mit farbcodierten Dots und Challenge-Overlays
- **Live-Kommentar** -- Sportreporter-Stil Kommentare zum Evolutionsverlauf
- **ASCII-Avatar** -- animierte Kreatur-Darstellung, die Genome visuell abbildet (Gehirngroesse, Sinne, Bewegungsart)
- **Genom-Visualisierung** -- Netzwerkgraph der neuronalen Verbindungen
- **Presets** -- vorkonfigurierte Szenarien (Schwarmbildung, Genies, Extrembedingungen)
- **Agent-Inspektor** -- Klicke auf einen Dot, um sein Genom, seine Sinne und sein Verhalten zu untersuchen
- **Web Worker** -- Simulation laeuft im Hintergrund-Thread, UI bleibt fluessig

## Tech-Stack

- **React 19** + **TypeScript**
- **Vite** als Build-Tool
- **Tailwind CSS 4** fuer Styling
- **Web Workers** fuer die Simulations-Engine
- **Canvas API** fuer Rendering

## Lokal starten

```bash
npm install
npm run dev
```

Oeffnet `http://localhost:5173` im Browser.

## Deployment

Die App ist eine reine Client-Side SPA ohne Backend. Deployment auf Vercel:

1. Repo mit Vercel verbinden
2. Vite wird automatisch erkannt -- kein Setup noetig
3. Jeder Push deployed automatisch

## Wie funktioniert die Simulation?

1. **Initialisierung**: Eine Population von Dots wird mit zufaelligen Genomen erzeugt. Jedes Genom kodiert ein neuronales Netz (Sensor-Neuronen, innere Neuronen, Aktions-Neuronen).

2. **Simulation**: Jeden Schritt liest jeder Dot seine Sensor-Eingaben (Position, Entfernung zu Waenden, Populationsdichte, etc.), verarbeitet sie durch sein neuronales Netz, und fuehrt die resultierende Aktion aus (Bewegung in verschiedene Richtungen, Signale senden).

3. **Selektion**: Am Ende einer Generation wird geprueft, welche Dots die aktive Challenge erfuellt haben. Nur diese ueberleben.

4. **Reproduktion**: Die Ueberlebenden vererben ihre Gene an die naechste Generation. Dabei koennen Punktmutationen und Crossover auftreten.

5. **Evolution**: Ueber viele Generationen optimiert die natuerliche Selektion die neuronalen Netze, bis komplexe Verhaltensweisen entstehen.

## Challenges (Auswahl)

| Nr. | Name | Ziel |
|-----|------|------|
| 0 | Kreis (SW-Viertel) | Erreiche den Schutzkreis im Suedwesten |
| 1 | Rechte Haelfte | Ueberquere die Mittellinie |
| 6 | Ecken | Finde eine der vier Ecken |
| 7 | Ecken (gewichtet) | Je naeher an einer Ecke, desto besser |
| 11 | Radioaktive Waende | Fliehe vor heranrueckenden Strahlungswaenden |
| 16 | Paare bilden | Finde genau einen Partner |
| 18 | Altruismus | Opfere dich, damit andere ueberleben |

## Herkunft

Dieses Projekt ist ein kompletter Rewrite von [biosim4](https://github.com/davidrmiller/biosim4) (C++ CLI) als interaktive Browser-Anwendung. Die originalen C++ Quellen sind unter `src-cpp/` archiviert.

## Lizenz

MIT
