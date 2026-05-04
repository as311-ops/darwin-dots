import { useState } from "react";
import type { SimConfig } from "./ControlPanel";
import { DEFAULT_CONFIG } from "./ControlPanel";

export interface Preset {
  name: string;
  description: string;
  config: Partial<SimConfig>;
}

export const PRESETS: Preset[] = [
  {
    name: "Quick Start",
    description: "Simple challenge, fast results. Perfect for getting started.",
    config: {
      challenge: 1, // Right Half
      population: 1000,
      stepsPerGeneration: 300,
      maxGenerations: 200,
      genomeInitialLength: 24,
      maxNumberNeurons: 5,
      pointMutationRate: 0.001,
      barrierType: 0,
    },
  },
  {
    name: "Swarms",
    description: "Large population, 4 corners as target. Watch colorful clusters form.",
    config: {
      challenge: 7, // Corners weighted
      population: 2000,
      stepsPerGeneration: 200,
      maxGenerations: 300,
      genomeInitialLength: 24,
      maxNumberNeurons: 5,
      pointMutationRate: 0.001,
      barrierType: 0,
    },
  },
  {
    name: "Maze",
    description: "The center is the goal — but a cross of walls blocks the way.",
    config: {
      challenge: 4, // Center weighted
      population: 1000,
      stepsPerGeneration: 300,
      maxGenerations: 500,
      genomeInitialLength: 24,
      maxNumberNeurons: 5,
      pointMutationRate: 0.001,
      barrierType: 3, // Five blocks
    },
  },
  {
    name: "Apocalypse",
    description: "Radioactive walls close in from all sides. Only the fastest survive.",
    config: {
      challenge: 11, // Radioactive Walls
      population: 2000,
      stepsPerGeneration: 500,
      maxGenerations: 300,
      genomeInitialLength: 24,
      maxNumberNeurons: 5,
      pointMutationRate: 0.002,
      barrierType: 0,
    },
  },
  {
    name: "Dating",
    description: "Find exactly one partner. No love triangles. Monogamy or death.",
    config: {
      challenge: 16, // Pairs
      population: 1000,
      stepsPerGeneration: 300,
      maxGenerations: 1000,
      genomeInitialLength: 24,
      maxNumberNeurons: 8,
      pointMutationRate: 0.001,
      barrierType: 0,
    },
  },
  {
    name: "Nomads",
    description: "The farther from birth, the better. Couch potatoes go extinct.",
    config: {
      challenge: 8, // Migration distance
      population: 1000,
      stepsPerGeneration: 300,
      maxGenerations: 300,
      genomeInitialLength: 24,
      maxNumberNeurons: 5,
      pointMutationRate: 0.001,
      barrierType: 0,
    },
  },
  {
    name: "The Tide",
    description: "A safe zone drifts back and forth. Follow the wave or vanish.",
    config: {
      challenge: 19,
      population: 1000,
      stepsPerGeneration: 600,
      maxGenerations: 500,
      genomeInitialLength: 32,
      maxNumberNeurons: 8,
      pointMutationRate: 0.001,
      barrierType: 0,
    },
  },
  {
    name: "Hunt or Hide",
    description: "Kill rivals or outlast them. Kill Enable is on — this gets brutal.",
    config: {
      challenge: 20,
      population: 1000,
      stepsPerGeneration: 300,
      maxGenerations: 500,
      genomeInitialLength: 32,
      maxNumberNeurons: 8,
      pointMutationRate: 0.001,
      killEnable: true,
      barrierType: 0,
    },
  },
  {
    name: "Hot Potato",
    description: "Three zones, three phases. Miss two and you're culled.",
    config: {
      challenge: 21,
      population: 1000,
      stepsPerGeneration: 600,
      maxGenerations: 500,
      genomeInitialLength: 40,
      maxNumberNeurons: 10,
      pointMutationRate: 0.001,
      barrierType: 0,
    },
  },
  {
    name: "Boomerang",
    description: "Reach the far corner — then find your way back home.",
    config: {
      challenge: 22,
      population: 1000,
      stepsPerGeneration: 600,
      maxGenerations: 500,
      genomeInitialLength: 40,
      maxNumberNeurons: 10,
      pointMutationRate: 0.001,
      barrierType: 0,
    },
  },
  {
    name: "Kill Bill",
    description: "Reach the center circle — and eliminate your rivals. Kill or be killed.",
    config: {
      challenge: 5, // Center (Unweighted)
      population: 1000,
      stepsPerGeneration: 300,
      maxGenerations: 500,
      genomeInitialLength: 32,
      maxNumberNeurons: 8,
      pointMutationRate: 0.001,
      killEnable: true,
      barrierType: 0,
    },
  },
  {
    name: "Geniuses",
    description: "Big brains, many genes, slow mutation. Complex strategies take time.",
    config: {
      challenge: 7, // Corners weighted
      population: 500,
      stepsPerGeneration: 400,
      maxGenerations: 1000,
      genomeInitialLength: 64,
      maxNumberNeurons: 15,
      pointMutationRate: 0.0005,
      barrierType: 0,
    },
  },
];

interface PresetsProps {
  onSelect: (config: SimConfig) => void;
  disabled?: boolean;
}

export default function PresetSelector({ onSelect, disabled }: PresetsProps) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between w-full bg-zinc-900 border border-zinc-800
                   rounded-lg px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
      >
        <span>Presets</span>
        <span className={`transition-transform ${open ? "rotate-180" : ""}`}>▼</span>
      </button>
      {open && (
        <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-3 mt-1">
          <div className="grid grid-cols-2 gap-1.5">
            {PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => { onSelect({ ...DEFAULT_CONFIG, ...preset.config }); setOpen(false); }}
                disabled={disabled}
                className="text-left bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40
                           rounded-md px-2.5 py-2 transition-colors group"
                title={preset.description}
              >
                <div className="text-xs text-zinc-200 group-hover:text-white font-medium">
                  {preset.name}
                </div>
                <div className="text-[10px] text-zinc-500 leading-tight mt-0.5 line-clamp-2">
                  {preset.description}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
