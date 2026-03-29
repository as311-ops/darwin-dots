# Darwin-Dots

Evolution simulation in the browser. Watch neural networks learn to master challenges through natural selection.

## What is this?

Darwin-Dots simulates a population of tiny dots, each with its own neural network as a brain. Every dot perceives its environment (position, wall proximity, nearby peers, barriers) and decides on movements based on its genes. At the end of each generation, only the dots that completed a given challenge survive. Their genes are inherited and mutated -- and over many generations, strategies emerge that nobody programmed.

Based on the original concept of [biosim4](https://github.com/davidrmiller/biosim4) ("I programmed some creatures. They evolved."), completely rewritten as an interactive web app.

## Features

- **19 Challenges** -- from simple navigation to complex tasks like pair formation, altruism, or escaping radioactive walls
- **Real-time visualization** -- Canvas rendering with color-coded dots and challenge overlays
- **Live commentary** -- sports-reporter style commentary on the evolution progress
- **ASCII avatar** -- animated creature display that visually maps genomes (brain size, senses, movement type)
- **Genome visualization** -- network graph of neural connections
- **Presets** -- preconfigured scenarios (swarming, geniuses, extreme conditions)
- **Agent inspector** -- click on a dot to examine its genome, senses, and behavior
- **Web Worker** -- simulation runs in a background thread, UI stays responsive

## Tech Stack

- **React 19** + **TypeScript**
- **Vite** as build tool
- **Tailwind CSS 4** for styling
- **Web Workers** for the simulation engine
- **Canvas API** for rendering

## Getting Started

```bash
npm install
npm run dev
```

Opens `http://localhost:5173` in the browser.

## Deployment

The app is a pure client-side SPA with no backend. Deploy on Vercel:

1. Connect the repo to Vercel
2. Vite is auto-detected -- no setup needed
3. Every push deploys automatically

## How does the simulation work?

1. **Initialization**: A population of dots is created with random genomes. Each genome encodes a neural network (sensor neurons, inner neurons, action neurons).

2. **Simulation**: Each step, every dot reads its sensor inputs (position, distance to walls, population density, etc.), processes them through its neural network, and executes the resulting action (movement in various directions, emitting signals).

3. **Selection**: At the end of a generation, the system checks which dots fulfilled the active challenge. Only those survive.

4. **Reproduction**: Survivors pass their genes to the next generation. Point mutations and crossover can occur.

5. **Evolution**: Over many generations, natural selection optimizes the neural networks until complex behaviors emerge.

## Challenges (Selection)

| # | Name | Goal |
|---|------|------|
| 0 | Circle (SW quadrant) | Reach the safe circle in the southwest |
| 1 | Right half | Cross the center line |
| 6 | Corners | Find one of the four corners |
| 7 | Corners (weighted) | The closer to a corner, the better |
| 11 | Radioactive walls | Flee from approaching radiation walls |
| 16 | Pair formation | Find exactly one partner |
| 18 | Altruism | Sacrifice yourself so others survive |

## Origin

This project is a complete rewrite of [biosim4](https://github.com/davidrmiller/biosim4) (C++ CLI) as an interactive browser application. The original C++ sources are archived under `src-cpp/`.

## License

MIT
