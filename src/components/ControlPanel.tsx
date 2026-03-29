import { useState, useCallback } from "react";
import type { SimState } from "./SimCanvas";

export interface SimConfig {
  sizeX: number;
  sizeY: number;
  population: number;
  stepsPerGeneration: number;
  maxGenerations: number; // not currently used as stop condition, just for ETA
  genomeInitialLength: number;
  maxNumberNeurons: number;
  pointMutationRate: number;
  sexualReproduction: boolean;
  chooseParentsByFitness: boolean;
  killEnable: boolean;
  populationSensorRadius: number;
  signalLayers: number;
  longProbeDistance: number;
  challenge: number;
  barrierType: number;
  responsivenessCurveKFactor: number;
}

export const DEFAULT_CONFIG: SimConfig = {
  sizeX: 128,
  sizeY: 128,
  population: 1000,
  stepsPerGeneration: 300,
  maxGenerations: 500,
  genomeInitialLength: 24,
  maxNumberNeurons: 5,
  pointMutationRate: 0.001,
  sexualReproduction: true,
  chooseParentsByFitness: true,
  killEnable: false,
  populationSensorRadius: 3.5,
  signalLayers: 1,
  longProbeDistance: 8,
  challenge: 1,
  barrierType: 0,
  responsivenessCurveKFactor: 4,
};

// Must match Challenge enum in types.ts exactly
const CHALLENGE_NAMES: Record<number, string> = {
  0: "Circle (SW Quarter)",
  1: "Right Half",
  2: "Right Quarter",
  3: "String Behavior",
  4: "Center (Weighted)",
  5: "Center (Unweighted)",
  6: "Corners",
  7: "Corners (Weighted)",
  8: "Migration Distance",
  9: "Center (Sparse)",
  10: "Left Eighth",
  11: "Radioactive Walls",
  12: "Against Wall (End)",
  13: "Wall Touched (Any)",
  14: "East-West Eighth",
  15: "Near Barrier",
  16: "Pair Formation",
  17: "Location Sequence",
  18: "Altruism",
};

const BARRIER_NAMES: Record<number, string> = {
  0: "None",
  1: "Vertical Wall (Center)",
  2: "Cross",
  3: "Vertical Wall (Offset)",
  4: "Spiral",
  5: "Diagonal",
  6: "Multiple Rectangles",
};

interface ControlPanelProps {
  config: SimConfig;
  onConfigChange: (config: SimConfig) => void;
  state: SimState | null;
  running: boolean;
  speed: number;
  lastSurvivors: number;
  lastGeneration: number;
  lastAvgFitness: number;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onSpeedChange: (speed: number) => void;
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-zinc-400">{label}</span>
        <span className="text-zinc-300 font-mono">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        className="w-full h-5 bg-transparent appearance-none cursor-pointer
                   [&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:bg-zinc-800
                   [&::-webkit-slider-runnable-track]:rounded-full
                   [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4
                   [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full
                   [&::-webkit-slider-thumb]:bg-zinc-100 [&::-webkit-slider-thumb]:cursor-grab
                   [&::-webkit-slider-thumb]:-mt-1
                   [&::-moz-range-track]:h-2 [&::-moz-range-track]:bg-zinc-800
                   [&::-moz-range-track]:rounded-full
                   [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4
                   [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-zinc-100
                   [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-grab
                   disabled:opacity-40"
      />
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <span className="text-xs text-zinc-400">{label}</span>
      <button
        onClick={() => onChange(!checked)}
        disabled={disabled}
        className={`w-8 h-4 rounded-full transition-colors relative ${
          checked ? "bg-emerald-600" : "bg-zinc-700"
        } disabled:opacity-40`}
      >
        <span
          className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
            checked ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </button>
    </label>
  );
}

export default function ControlPanel({
  config,
  onConfigChange,
  state,
  running,
  speed,
  lastSurvivors,
  lastGeneration,
  lastAvgFitness,
  onStart,
  onPause,
  onReset,
  onSpeedChange,
}: ControlPanelProps) {
  const [section, setSection] = useState<"sim" | "genome" | "sensors">("sim");
  const [configOpen, setConfigOpen] = useState(false);

  // Estimate time remaining
  const currentGen = state?.generation ?? 0;
  const remainingGens = config.maxGenerations - currentGen;
  const eta = running && currentGen > 0
    ? estimateEta(remainingGens, config.stepsPerGeneration, speed)
    : null;

  const update = useCallback(
    <K extends keyof SimConfig>(key: K, value: SimConfig[K]) => {
      onConfigChange({ ...config, [key]: value });
    },
    [config, onConfigChange]
  );

  return (
    <div className="w-full flex flex-col gap-3 text-sm">
      {/* Survival Rate KPI */}
      <SurvivalKPI
        survivors={lastSurvivors}
        population={config.population}
        generation={lastGeneration}
        avgFitness={lastAvgFitness}
        running={running}
      />

      {/* Header Stats */}
      <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-zinc-500 text-xs uppercase tracking-wider">Status</span>
          <span
            className={`text-xs font-mono px-2 py-0.5 rounded ${
              running
                ? "bg-emerald-950 text-emerald-400"
                : "bg-zinc-800 text-zinc-400"
            }`}
          >
            {running ? "Running" : "Paused"}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <div className="text-zinc-500">Generation</div>
            <div className="font-mono text-zinc-200 text-lg">
              {state?.generation ?? 0}
            </div>
          </div>
          <div>
            <div className="text-zinc-500">Step</div>
            <div className="font-mono text-zinc-200 text-lg">
              {state?.simStep ?? 0}
            </div>
          </div>
          <div>
            <div className="text-zinc-500">Population</div>
            <div className="font-mono text-zinc-200">
              {state?.population ?? config.population}
            </div>
          </div>
          <div>
            <div className="text-zinc-500">Survivors</div>
            <div className="font-mono text-emerald-400">
              {state?.survivors ?? "–"}
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-3 space-y-3">
        <div className="flex gap-2">
          {!running ? (
            <button
              onClick={onStart}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium
                         py-2 px-3 rounded-md transition-colors"
            >
              ▶ Start
            </button>
          ) : (
            <button
              onClick={onPause}
              className="flex-1 bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium
                         py-2 px-3 rounded-md transition-colors"
            >
              ⏸ Pause
            </button>
          )}
          <button
            onClick={onReset}
            className="bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-xs font-medium
                       py-2 px-3 rounded-md transition-colors"
          >
            ↺ Reset
          </button>
        </div>
        <Slider
          label="Speed"
          value={speed}
          min={1}
          max={60}
          step={1}
          unit=" fps"
          onChange={onSpeedChange}
        />
        {eta !== null && (
          <div className="text-[10px] text-zinc-500 text-right font-mono">
            {eta}
          </div>
        )}
      </div>

      {/* Config Toggle */}
      <button
        onClick={() => setConfigOpen((v) => !v)}
        className="flex items-center justify-between w-full bg-zinc-900 border border-zinc-800
                   rounded-lg px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
      >
        <span>Configuration</span>
        <span className={`transition-transform ${configOpen ? "rotate-180" : ""}`}>▼</span>
      </button>

      {configOpen && <>
      {/* Section Tabs */}
      <div className="flex border border-zinc-800 rounded-lg overflow-hidden">
        {(["sim", "genome", "sensors"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSection(s)}
            className={`flex-1 text-xs py-1.5 transition-colors ${
              section === s
                ? "bg-zinc-800 text-zinc-100"
                : "bg-zinc-900 text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {s === "sim" ? "World" : s === "genome" ? "Genome" : "Sensor"}
          </button>
        ))}
      </div>

      {/* Section Content */}
      <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-3 space-y-3 overflow-y-auto max-h-[400px]">
        {section === "sim" && (
          <>
            <Slider
              label="Population"
              value={config.population}
              min={100}
              max={5000}
              step={100}
              onChange={(v) => update("population", v)}
              disabled={running}
            />
            <Slider
              label="Steps/Gen."
              value={config.stepsPerGeneration}
              min={50}
              max={1000}
              step={50}
              onChange={(v) => update("stepsPerGeneration", v)}
              disabled={running}
            />
            <div className="space-y-1">
              <label className="text-xs text-zinc-400">Challenge</label>
              <select
                value={config.challenge}
                onChange={(e) => update("challenge", Number(e.target.value))}
                disabled={running}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-md text-xs text-zinc-200
                           py-1.5 px-2 focus:outline-none focus:ring-1 focus:ring-zinc-600
                           disabled:opacity-40"
              >
                {Object.entries(CHALLENGE_NAMES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-zinc-400">Barrier</label>
              <select
                value={config.barrierType}
                onChange={(e) => update("barrierType", Number(e.target.value))}
                disabled={running}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-md text-xs text-zinc-200
                           py-1.5 px-2 focus:outline-none focus:ring-1 focus:ring-zinc-600
                           disabled:opacity-40"
              >
                {Object.entries(BARRIER_NAMES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        {section === "genome" && (
          <>
            <Slider
              label="Genome Length"
              value={config.genomeInitialLength}
              min={4}
              max={64}
              step={2}
              onChange={(v) => update("genomeInitialLength", v)}
              disabled={running}
            />
            <Slider
              label="Max Neurons"
              value={config.maxNumberNeurons}
              min={1}
              max={20}
              step={1}
              onChange={(v) => update("maxNumberNeurons", v)}
              disabled={running}
            />
            <Slider
              label="Mutation Rate"
              value={config.pointMutationRate}
              min={0}
              max={0.05}
              step={0.001}
              onChange={(v) => update("pointMutationRate", v)}
            />
            <Toggle
              label="Sexual Reproduction"
              checked={config.sexualReproduction}
              onChange={(v) => update("sexualReproduction", v)}
            />
            <Toggle
              label="Fitness-Based Selection"
              checked={config.chooseParentsByFitness}
              onChange={(v) => update("chooseParentsByFitness", v)}
            />
            <Toggle
              label="Kill Action Enabled"
              checked={config.killEnable}
              onChange={(v) => update("killEnable", v)}
            />
          </>
        )}

        {section === "sensors" && (
          <>
            <Slider
              label="Sensor Radius (Population)"
              value={config.populationSensorRadius}
              min={1}
              max={10}
              step={0.5}
              unit=""
              onChange={(v) => update("populationSensorRadius", v)}
            />
            <Slider
              label="Long Probe Distance"
              value={config.longProbeDistance}
              min={1}
              max={32}
              step={1}
              onChange={(v) => update("longProbeDistance", v)}
            />
            <Slider
              label="Signal Layers"
              value={config.signalLayers}
              min={1}
              max={4}
              step={1}
              onChange={(v) => update("signalLayers", v)}
              disabled={running}
            />
            <Slider
              label="Response Curve K"
              value={config.responsivenessCurveKFactor}
              min={1}
              max={10}
              step={0.5}
              onChange={(v) => update("responsivenessCurveKFactor", v)}
            />
          </>
        )}
      </div>
      </>}
    </div>
  );
}

function SurvivalKPI({
  survivors,
  population,
  generation,
  avgFitness,
  running,
}: {
  survivors: number;
  population: number;
  generation: number;
  avgFitness: number;
  running: boolean;
}) {
  const rate = population > 0 ? survivors / population : 0;
  const hasData = generation > 0;

  // If all survive (e.g. migration challenge), show fitness instead
  const allSurvive = hasData && rate >= 0.99;
  const displayRate = allSurvive ? avgFitness : rate;
  const pct = Math.round(displayRate * 100);
  const label = allSurvive ? 'Avg Fitness' : 'Survival Rate';
  const detail = allSurvive
    ? `All survive — score matters`
    : `${survivors} of ${population}`;

  // Color transitions: 0% = red, 30% = amber, 60%+ = green
  const color = !hasData
    ? 'text-zinc-600'
    : pct >= 60
      ? 'text-emerald-400'
      : pct >= 30
        ? 'text-amber-400'
        : pct > 0
          ? 'text-red-400'
          : 'text-red-500';

  const ringColor = !hasData
    ? 'stroke-zinc-800'
    : pct >= 60
      ? 'stroke-emerald-500'
      : pct >= 30
        ? 'stroke-amber-500'
        : 'stroke-red-500';

  const circumference = 2 * Math.PI * 34;
  const dashOffset = circumference - (circumference * (hasData ? displayRate : 0));

  return (
    <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-4 flex items-center gap-4">
      {/* Circular progress */}
      <div className="relative flex-shrink-0">
        <svg width="80" height="80" className="-rotate-90">
          <circle
            cx="40" cy="40" r="34"
            fill="none"
            stroke="#27272a"
            strokeWidth="5"
          />
          <circle
            cx="40" cy="40" r="34"
            fill="none"
            className={`${ringColor} transition-all duration-700`}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`font-mono font-bold text-xl ${color} transition-colors duration-700`}>
            {hasData ? `${pct}%` : '–'}
          </span>
        </div>
      </div>

      {/* Label */}
      <div>
        <div className="text-zinc-400 text-xs">{label}</div>
        <div className="text-zinc-500 text-[10px] mt-0.5">
          {hasData
            ? detail
            : running ? 'Waiting for gen. 1...' : 'Start the simulation'}
        </div>
        {hasData && (
          <div className="text-zinc-600 text-[10px] font-mono mt-0.5">
            Gen. {generation}
          </div>
        )}
      </div>
    </div>
  );
}

function estimateEta(remainingGens: number, stepsPerGen: number, fps: number): string {
  // Empirical: at 60fps, ~3 steps/frame are simulated (from worker stepsPerFrame logic)
  const stepsPerFrame = Math.max(1, Math.min(5, Math.floor(stepsPerGen / 100)));
  const stepsPerSecond = stepsPerFrame * fps;
  const totalRemainingSteps = remainingGens * stepsPerGen;
  const secondsRemaining = totalRemainingSteps / stepsPerSecond;
  const minutes = secondsRemaining / 60;

  if (minutes < 1) return `~${Math.ceil(secondsRemaining)}s remaining`;
  if (minutes < 60) return `~${Math.ceil(minutes)} min remaining`;
  const hours = minutes / 60;
  if (hours < 24) return `~${hours.toFixed(1)}h remaining`;
  const days = hours / 24;
  return `~${days.toFixed(1)} days remaining`;
}
