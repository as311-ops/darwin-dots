// simulator.ts -- Main simulation engine
// Ported from biosim4: simulator.cpp, endOfSimStep.cpp, endOfGeneration.cpp

import { Coord, Sensor, Action, Challenge, Indiv, type Genome } from './types';
import { Grid } from './grid';
import { Peeps } from './peeps';
import { Signals } from './signals';
import { SimParams, DEFAULT_PARAMS } from './params';
import { feedForward } from './neural-net';
import { getSensor } from './sensors';
import { executeActions } from './actions';
import { initializeGeneration0, spawnNewGeneration, type GenerationResult } from './spawn';
import { nameFromGenome, clanFromGenome } from './naming';

// Reusable Coord to avoid GC pressure in hot paths
const _tmpCoord = new Coord(0, 0);

// ---------------------------------------------------------------------------
// AgentInfo: detailed info for agent inspector
// ---------------------------------------------------------------------------

export interface AgentInfo {
  index: number;
  name: string;
  clan: string;
  x: number;
  y: number;
  age: number;
  genomeLength: number;
  neuronCount: number;
  connectionCount: number;
  responsiveness: number;
  oscPeriod: number;
  lastMoveDir: number;
  challengeBits: number;
  sensorValues: { name: string; value: number }[];
  connections: { from: string; to: string; weight: number }[];
}

const ACTION_NAMES = [
  'MOVE_X', 'MOVE_Y', 'MOVE_FWD', 'MOVE_RL', 'MOVE_RND',
  'SET_OSC', 'SET_PROBE', 'SET_RESP', 'EMIT_SIG',
  'MOVE_E', 'MOVE_W', 'MOVE_N', 'MOVE_S',
  'MOVE_L', 'MOVE_R', 'MOVE_REV',
];

// ---------------------------------------------------------------------------
// SimState: serializable snapshot for rendering
// ---------------------------------------------------------------------------

export interface SimState {
  generation: number;
  simStep: number;
  population: number;
  survivors: number;
  agentLocations: Float32Array;
  agentColors: Uint8Array;
  barrierLocations: Uint16Array;
  signalLayers: Float32Array[];
  gridSize: { x: number; y: number };
}

// ---------------------------------------------------------------------------
// Simulator
// ---------------------------------------------------------------------------

export class Simulator {
  grid: Grid;
  peeps: Peeps;
  signals: Signals;
  params: SimParams;

  generation = 0;
  simStep = 0;
  lastSurvivors = 0;

  // Cached rendering data to reduce allocations
  private _cachedColors: Uint8Array | null = null;
  private _colorsGeneration = -1;
  private _stateCounter = 0;

  constructor(params?: Partial<SimParams>) {
    this.params = { ...DEFAULT_PARAMS, ...params };
    this.grid = new Grid();
    this.peeps = new Peeps();
    this.signals = new Signals();
  }

  /**
   * Initialize the simulation with the given parameters.
   */
  init(params?: Partial<SimParams>, seedGenome?: Genome): void {
    if (params) {
      this.params = { ...this.params, ...params };
    }

    this.generation = 0;
    this.simStep = 0;
    this.lastSurvivors = 0;

    this.grid.init(this.params.sizeX, this.params.sizeY);
    this.signals.init(this.params.signalLayers, this.params.sizeX, this.params.sizeY);

    initializeGeneration0(this.peeps, this.grid, this.signals, this.params, seedGenome);
  }

  lastGenerationResult: GenerationResult | null = null;

  /**
   * Advance simulation by one step (all agents think + act, then cleanup).
   * Returns the GenerationResult if a generation just ended, null otherwise.
   */
  step(): GenerationResult | null {
    // Process each agent
    for (let i = 1; i <= this.peeps.population; i++) {
      const indiv = this.peeps.getIndiv(i);
      if (!indiv.alive) continue;

      indiv.age++;
      this.simStepOneIndiv(indiv);
    }

    // End-of-step cleanup
    this.endOfSimStep();
    this.simStep++;

    // Check if generation is complete
    if (this.simStep >= this.params.stepsPerGeneration) {
      const result = this.endOfGeneration();
      this.lastSurvivors = result.survivors;
      this.lastGenerationResult = result;
      this.generation++;
      this.simStep = 0;
      return result;
    }

    return null;
  }

  /**
   * Run an entire generation (all sim steps).
   * Returns the generation result.
   */
  runGeneration(): GenerationResult {
    while (this.simStep < this.params.stepsPerGeneration) {
      for (let i = 1; i <= this.peeps.population; i++) {
        const indiv = this.peeps.getIndiv(i);
        if (!indiv.alive) continue;
        indiv.age++;
        this.simStepOneIndiv(indiv);
      }
      this.endOfSimStep();
      this.simStep++;
    }

    const result = this.endOfGeneration();
    this.lastSurvivors = result.survivors;
    this.generation++;
    this.simStep = 0;
    return result;
  }

  /**
   * Get current state as a serializable snapshot for rendering.
   */
  getState(): SimState {
    // Count alive agents
    let aliveCount = 0;
    for (let i = 1; i <= this.peeps.population; i++) {
      if (this.peeps.getIndiv(i).alive) aliveCount++;
    }

    // Agent locations
    const agentLocations = new Float32Array(aliveCount * 2);
    let idx = 0;

    for (let i = 1; i <= this.peeps.population; i++) {
      const indiv = this.peeps.getIndiv(i);
      if (!indiv.alive) continue;
      agentLocations[idx * 2] = indiv.loc.x;
      agentLocations[idx * 2 + 1] = indiv.loc.y;
      idx++;
    }

    // Cache colors per generation (genome doesn't change within a generation)
    if (this._colorsGeneration !== this.generation || !this._cachedColors) {
      const colors = new Uint8Array(this.peeps.population * 3);
      for (let i = 1; i <= this.peeps.population; i++) {
        const indiv = this.peeps.getIndiv(i);
        const color = genomeColor(indiv);
        colors[(i - 1) * 3] = color[0];
        colors[(i - 1) * 3 + 1] = color[1];
        colors[(i - 1) * 3 + 2] = color[2];
      }
      this._cachedColors = colors;
      this._colorsGeneration = this.generation;
    }

    // Build alive-only colors from cache
    const agentColors = new Uint8Array(aliveCount * 3);
    idx = 0;
    for (let i = 1; i <= this.peeps.population; i++) {
      if (!this.peeps.getIndiv(i).alive) continue;
      agentColors[idx * 3] = this._cachedColors[(i - 1) * 3];
      agentColors[idx * 3 + 1] = this._cachedColors[(i - 1) * 3 + 1];
      agentColors[idx * 3 + 2] = this._cachedColors[(i - 1) * 3 + 2];
      idx++;
    }

    // Barrier locations
    const barriers = this.grid.barrierLocations;
    const barrierLocations = new Uint16Array(barriers.length * 2);
    for (let i = 0; i < barriers.length; i++) {
      barrierLocations[i * 2] = barriers[i].x;
      barrierLocations[i * 2 + 1] = barriers[i].y;
    }

    // Signal layers — only include every 3rd frame to save memory/bandwidth
    this._stateCounter++;
    const signalLayers: Float32Array[] = [];
    if (this._stateCounter % 5 === 0) {
      for (let layer = 0; layer < this.params.signalLayers; layer++) {
        const data = new Float32Array(this.params.sizeX * this.params.sizeY);
        for (let x = 0; x < this.params.sizeX; x++) {
          for (let y = 0; y < this.params.sizeY; y++) {
            data[x * this.params.sizeY + y] =
              this.signals.getMagnitudeXY(layer, x, y) / 255.0;
          }
        }
        signalLayers.push(data);
      }
    }

    return {
      generation: this.generation,
      simStep: this.simStep,
      population: aliveCount,
      survivors: this.lastSurvivors,
      agentLocations,
      agentColors,
      barrierLocations,
      signalLayers,
      gridSize: { x: this.params.sizeX, y: this.params.sizeY },
    };
  }

  /**
   * Get detailed info about the agent at grid position (x,y).
   * Returns null if no agent is there.
   */
  getAgentInfo(x: number, y: number): AgentInfo | null {
    const loc = new Coord(x, y);
    if (!this.grid.isInBounds(loc) || !this.grid.isOccupiedAt(loc)) return null;

    const indiv = this.peeps.getIndivAt(loc, this.grid);
    if (!indiv || !indiv.alive) return null;

    // Compute current sensor values
    const sensorValues: { name: string; value: number }[] = [];
    const sensorNames = [
      'LOC_X', 'LOC_Y', 'BOUNDARY_DIST_X', 'BOUNDARY_DIST',
      'BOUNDARY_DIST_Y', 'GENETIC_SIM_FWD', 'LAST_MOVE_DIR_X',
      'LAST_MOVE_DIR_Y', 'LONGPROBE_POP_FWD', 'LONGPROBE_BAR_FWD',
      'POPULATION', 'POPULATION_FWD', 'POPULATION_LR', 'OSC1', 'AGE',
      'BARRIER_FWD', 'BARRIER_LR', 'RANDOM', 'SIGNAL0', 'SIGNAL0_FWD', 'SIGNAL0_LR',
    ];
    for (let s = 0; s < Sensor.NUM_SENSES; s++) {
      const val = getSensor(indiv, s as Sensor, this.simStep, this.grid, this.peeps, this.signals, this.params);
      sensorValues.push({ name: sensorNames[s] ?? `SENSOR_${s}`, value: Math.round(val * 1000) / 1000 });
    }

    // Neural net connections summary
    const connections: { from: string; to: string; weight: number }[] = [];
    for (const conn of indiv.nnet.connections) {
      const fromName = conn.sourceType === 1
        ? sensorNames[conn.sourceNum] ?? `S${conn.sourceNum}`
        : `N${conn.sourceNum}`;
      const toName = conn.sinkType === 1
        ? ACTION_NAMES[conn.sinkNum] ?? `A${conn.sinkNum}`
        : `N${conn.sinkNum}`;
      connections.push({ from: fromName, to: toName, weight: Math.round((conn.weight / 8192) * 1000) / 1000 });
    }

    return {
      index: indiv.index,
      name: nameFromGenome(indiv.genome),
      clan: clanFromGenome(indiv.genome),
      x: indiv.loc.x,
      y: indiv.loc.y,
      age: indiv.age,
      genomeLength: indiv.genome.length,
      neuronCount: indiv.nnet.neurons.length,
      connectionCount: indiv.nnet.connections.length,
      responsiveness: Math.round(indiv.responsiveness * 1000) / 1000,
      oscPeriod: indiv.oscPeriod,
      lastMoveDir: indiv.lastMoveDir.asInt(),
      challengeBits: indiv.challengeBits,
      sensorValues,
      connections,
    };
  }

  // ---- Private methods ----

  private simStepOneIndiv(indiv: Indiv): void {
    const getSensorFunc = (sensor: number, simStep: number) =>
      getSensor(indiv, sensor as Sensor, simStep, this.grid, this.peeps, this.signals, this.params);

    const actionLevels = feedForward(
      indiv.nnet,
      this.simStep,
      getSensorFunc,
      { numActions: Action.NUM_ACTIONS },
    );

    executeActions(indiv, actionLevels, this.grid, this.peeps, this.signals, this.params);
  }

  private endOfSimStep(): void {
    const challenge = this.params.challenge as Challenge;

    // Challenge-specific step logic
    if (challenge === Challenge.CHALLENGE_RADIOACTIVE_WALLS) {
      // Kill agents near walls. Zone grows from edges toward center.
      // Scaled so a small safe zone (~8x8) remains at the end of the generation.
      const maxZone = Math.floor(this.params.sizeX / 2) - 4;
      const wallZone = Math.floor((this.simStep / this.params.stepsPerGeneration) * maxZone);
      for (let i = 1; i <= this.peeps.population; i++) {
        const indiv = this.peeps.getIndiv(i);
        if (!indiv.alive) continue;
        if (
          indiv.loc.x < wallZone ||
          indiv.loc.x >= this.params.sizeX - wallZone ||
          indiv.loc.y < wallZone ||
          indiv.loc.y >= this.params.sizeY - wallZone
        ) {
          this.peeps.queueForDeath(i);
        }
      }
    }

    // Set challengeBits for TOUCH_ANY_WALL
    if (
      challenge === Challenge.CHALLENGE_TOUCH_ANY_WALL ||
      challenge === Challenge.CHALLENGE_AGAINST_ANY_WALL
    ) {
      for (let i = 1; i <= this.peeps.population; i++) {
        const indiv = this.peeps.getIndiv(i);
        if (!indiv.alive) continue;
        if (this.grid.isBorder(indiv.loc)) {
          indiv.challengeBits |= 1;
        }
      }
    }

    // Drain queues
    this.peeps.drainDeathQueue(this.grid);
    this.peeps.drainMoveQueue(this.grid);

    // Fade signals
    for (let layer = 0; layer < this.params.signalLayers; layer++) {
      this.signals.fade(layer);
    }
  }

  private endOfGeneration(): GenerationResult {
    return spawnNewGeneration(
      this.peeps,
      this.grid,
      this.signals,
      this.params,
      this.generation,
    );
  }
}

// ---------------------------------------------------------------------------
// Genome-based color generation
// ---------------------------------------------------------------------------

/**
 * Genome-based color that reflects genetic relatedness:
 *
 * - HUE from genes 0-1 (clan identity) → same clan = same color family
 *   Uses a smooth mapping so similar first genes = nearby hues.
 *
 * - SATURATION from genes 2-3 (secondary traits) → variation within clan
 *   Keeps colors vivid but distinguishable.
 *
 * - LIGHTNESS from genes 4+ (individual variation) → subtle differences
 *   Within the same clan+subgroup, individuals vary in brightness.
 *
 * Result: visually, you can spot related clusters — they share a color.
 * As evolution converges, the grid becomes more monochromatic.
 */
function genomeColor(indiv: Indiv): [number, number, number] {
  const genome = indiv.genome;
  if (genome.length === 0) return [128, 128, 128];

  const g0 = genome[0];
  const g1 = genome.length > 1 ? genome[1] : g0;
  const g2 = genome.length > 2 ? genome[2] : g0;
  const g3 = genome.length > 3 ? genome[3] : g1;

  // Hue: derived from genes 0+1 — the "clan" genes
  // Uses sourceType, sourceNum, sinkType, sinkNum (NOT weight, which mutates too fast)
  const clanHash =
    (g0.sourceType * 128 + g0.sourceNum) * 256 +
    (g0.sinkType * 128 + g0.sinkNum) +
    (g1.sourceType * 64 + (g1.sourceNum & 0x3F)) * 7;
  const hue = (clanHash * 137) % 360; // golden-angle-ish spread for good distribution

  // Saturation: genes 2+3 add variation — 0.55..0.85
  const subHash = ((g2.sourceNum ^ g3.sinkNum) + g2.sinkType * 50) & 0xFF;
  const sat = 0.55 + (subHash % 30) / 100;

  // Lightness: subtle individual variation — 0.4..0.65
  let indivHash = 0;
  for (let i = 0; i < Math.min(genome.length, 8); i++) {
    indivHash = (indivHash * 17 + genome[i].weight) & 0xFFFF;
  }
  const lit = 0.4 + (indivHash % 25) / 100;

  return hslToRgb(hue / 360, sat, lit);
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number): number => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return [
    Math.round(r * 255),
    Math.round(g * 255),
    Math.round(b * 255),
  ];
}
