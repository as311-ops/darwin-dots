// simulation.worker.ts -- Web Worker running the simulation loop

import { Simulator, type SimState, type AgentInfo } from '../simulation/simulator';
import type { GenomeProfile } from '../simulation/genome-profile';
import type { ChampionSnapshot } from '../simulation/lineage';
import type { Genome } from '../simulation/types';

interface SimConfig {
  sizeX: number;
  sizeY: number;
  population: number;
  stepsPerGeneration: number;
  maxGenerations: number;
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

type WorkerCommand =
  | { type: 'init'; config: SimConfig; seedGenome?: Genome }
  | { type: 'start' }
  | { type: 'pause' }
  | { type: 'reset'; config: SimConfig; seedGenome?: Genome }
  | { type: 'setSpeed'; fps: number }
  | { type: 'updateConfig'; config: Partial<SimConfig> }
  | { type: 'inspectAgent'; x: number; y: number };

type WorkerMessage =
  | { type: 'state'; state: SimState }
  | { type: 'generation'; stats: { generation: number; survivors: number; population: number; diversity: number; avgFitness: number; genomeProfile: GenomeProfile | null; championSnapshot: ChampionSnapshot | null } }
  | { type: 'agentInfo'; info: AgentInfo | null }
  | { type: 'ready' };

let simulator: Simulator | null = null;
let running = false;
let targetFps = 30;
let animFrameId: ReturnType<typeof setTimeout> | null = null;

function configToParams(config: SimConfig) {
  return {
    sizeX: config.sizeX,
    sizeY: config.sizeY,
    population: config.population,
    stepsPerGeneration: config.stepsPerGeneration,
    maxGenerations: config.maxGenerations,
    genomeInitialLengthMin: config.genomeInitialLength,
    genomeInitialLengthMax: config.genomeInitialLength,
    maxNumberNeurons: config.maxNumberNeurons,
    pointMutationRate: config.pointMutationRate,
    sexualReproduction: config.sexualReproduction,
    chooseParentsByFitness: config.chooseParentsByFitness,
    killEnable: config.killEnable,
    populationSensorRadius: config.populationSensorRadius,
    signalLayers: config.signalLayers,
    longProbeDistance: config.longProbeDistance,
    challenge: config.challenge,
    barrierType: config.barrierType,
    responsivenessCurveKFactor: config.responsivenessCurveKFactor,
  };
}

function post(msg: WorkerMessage, transferables?: Transferable[]): void {
  if (transferables) {
    (self as unknown as Worker).postMessage(msg, transferables);
  } else {
    (self as unknown as Worker).postMessage(msg);
  }
}

function sendState(): void {
  if (!simulator) return;
  const state = simulator.getState();
  post({ type: 'state', state }, [
    state.agentLocations.buffer,
    state.agentColors.buffer,
    state.barrierLocations.buffer,
    ...state.signalLayers.map(l => l.buffer),
  ]);
}

function sendGeneration(result: { survivors: number; diversity: number; avgFitness: number; genomeProfile: GenomeProfile | null; championSnapshot: ChampionSnapshot | null }): void {
  if (!simulator) return;
  post({
    type: 'generation',
    stats: {
      generation: simulator.generation,
      survivors: result.survivors,
      population: simulator.params.population,
      diversity: result.diversity,
      avgFitness: result.avgFitness,
      genomeProfile: result.genomeProfile,
      championSnapshot: result.championSnapshot,
    },
  });
}

let lastStateSent = 0;
let generationCount = 0;

function simulationLoop(): void {
  if (!running || !simulator) return;

  try {
    const stepsPerFrame = Math.max(1, Math.min(3, Math.floor(simulator.params.stepsPerGeneration / 100)));

    for (let i = 0; i < stepsPerFrame; i++) {
      const result = simulator.step();
      if (result) {
        generationCount++;
        sendGeneration(result);
        break;
      }
    }

    // Throttle state sends to ~5fps to prevent main thread overload
    const now = performance.now();
    if (now - lastStateSent > 200) {
      sendState();
      lastStateSent = now;
    }
  } catch (err) {
    console.error('Simulation error:', err);
    running = false;
    return;
  }

  const delay = Math.floor(1000 / targetFps);
  animFrameId = setTimeout(simulationLoop, delay);
}

function stopLoop(): void {
  if (animFrameId !== null) {
    clearTimeout(animFrameId);
    animFrameId = null;
  }
}

self.onmessage = (e: MessageEvent<WorkerCommand>) => {
  const msg = e.data;

  switch (msg.type) {
    case 'init': {
      simulator = new Simulator(configToParams(msg.config));
      simulator.init(undefined, msg.seedGenome);
      sendState();
      post({ type: 'ready' });
      break;
    }

    case 'start': {
      running = true;
      simulationLoop();
      break;
    }

    case 'pause': {
      running = false;
      stopLoop();
      break;
    }

    case 'reset': {
      running = false;
      stopLoop();
      simulator = new Simulator(configToParams(msg.config));
      simulator.init(undefined, msg.seedGenome);
      sendState();
      break;
    }

    case 'setSpeed': {
      targetFps = msg.fps;
      break;
    }

    case 'inspectAgent': {
      if (simulator) {
        const info = simulator.getAgentInfo(msg.x, msg.y);
        post({ type: 'agentInfo', info });
      }
      break;
    }

    case 'updateConfig': {
      if (simulator && msg.config) {
        const c = msg.config;
        if (c.pointMutationRate !== undefined) simulator.params.pointMutationRate = c.pointMutationRate;
        if (c.responsivenessCurveKFactor !== undefined) simulator.params.responsivenessCurveKFactor = c.responsivenessCurveKFactor;
        if (c.populationSensorRadius !== undefined) simulator.params.populationSensorRadius = c.populationSensorRadius;
        if (c.longProbeDistance !== undefined) simulator.params.longProbeDistance = c.longProbeDistance;
        if (c.killEnable !== undefined) simulator.params.killEnable = c.killEnable;
        if (c.sexualReproduction !== undefined) simulator.params.sexualReproduction = c.sexualReproduction;
        if (c.chooseParentsByFitness !== undefined) simulator.params.chooseParentsByFitness = c.chooseParentsByFitness;
      }
      break;
    }
  }
};
