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
    name: "Schnellstart",
    description: "Einfache Challenge, schnelles Ergebnis. Perfekt zum Kennenlernen.",
    config: {
      challenge: 1, // Rechte Hälfte
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
    name: "Schwärme",
    description: "Große Population, 4 Ecken als Ziel. Beobachte wie sich farbige Cluster bilden.",
    config: {
      challenge: 7, // Ecken gewichtet
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
    name: "Labyrinth",
    description: "Die Mitte ist das Ziel — aber ein Kreuz aus Wänden versperrt den Weg.",
    config: {
      challenge: 4, // Mitte gewichtet
      population: 1000,
      stepsPerGeneration: 300,
      maxGenerations: 500,
      genomeInitialLength: 24,
      maxNumberNeurons: 5,
      pointMutationRate: 0.001,
      barrierType: 3, // Fünf Blöcke
    },
  },
  {
    name: "Apokalypse",
    description: "Radioaktive Wände rücken von allen Seiten vor. Nur die Schnellsten überleben.",
    config: {
      challenge: 11, // Radioaktive Wände
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
    description: "Finde genau einen Partner. Kein Dreiecks-Drama. Monogamie oder Tod.",
    config: {
      challenge: 16, // Paare
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
    name: "Nomaden",
    description: "Je weiter von der Geburt entfernt, desto besser. Stubenhocker sterben aus.",
    config: {
      challenge: 8, // Migrations-Distanz
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
    name: "Mutanten",
    description: "Extreme Mutationsrate. Chaotisch, aber erstaunlich schnelle Anpassung.",
    config: {
      challenge: 1, // Rechte Hälfte
      population: 3000,
      stepsPerGeneration: 200,
      maxGenerations: 200,
      genomeInitialLength: 24,
      maxNumberNeurons: 5,
      pointMutationRate: 0.05,
      barrierType: 0,
    },
  },
  {
    name: "Genies",
    description: "Große Gehirne, viele Gene, langsame Mutation. Komplexe Strategien brauchen Zeit.",
    config: {
      challenge: 7, // Ecken gewichtet
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
