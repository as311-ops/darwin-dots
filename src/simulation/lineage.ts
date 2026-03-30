// lineage.ts -- Champion lineage tracking across generations

import { type Genome, Sensor, Action } from './types';
import { createWiringFromGenome } from './neural-net';
import { nameFromGenome } from './naming';

export interface ChampionSnapshot {
  generation: number;
  name: string;
  genome: Genome;
  neuronCount: number;
  genomeLength: number;
  responsiveness: number;
  score: number;
  // Trait flags derived from the neural net
  sensors: string[];   // active sensor short names
  actions: string[];   // active action short names
}

/**
 * Create a snapshot of the best survivor (champion) from a generation.
 * Called from spawnNewGeneration with the highest-scoring candidate.
 */
export function createChampionSnapshot(
  genome: Genome,
  score: number,
  generation: number,
  maxNumberNeurons: number,
): ChampionSnapshot {
  const wiringParams = {
    maxNumberNeurons,
    numSenses: Sensor.NUM_SENSES,
    numActions: Action.NUM_ACTIONS,
  };
  const nnet = createWiringFromGenome(genome, wiringParams);

  // Determine active sensors and actions from connections
  // sourceType: 0=NEURON, 1=SENSOR; sinkType: 0=NEURON, 1=ACTION
  const sensorSet = new Set<string>();
  const actionSet = new Set<string>();
  for (const conn of nnet.connections) {
    if (conn.sourceType === 1) { // sensor
      sensorSet.add(sensorShortName(conn.sourceNum));
    }
    if (conn.sinkType === 1) { // action
      actionSet.add(actionShortName(conn.sinkNum));
    }
  }

  return {
    generation,
    name: nameFromGenome(genome),
    genome: genome.slice(), // defensive copy
    neuronCount: nnet.neurons.length,
    genomeLength: genome.length,
    responsiveness: 0.5, // default, we don't have the indiv's actual value here
    score,
    sensors: [...sensorSet],
    actions: [...actionSet],
  };
}

// Match names from genome-profile.ts for consistency
const SENSOR_NAMES: Record<number, string> = {
  0: 'LOC_X', 1: 'LOC_Y', 2: 'BDIST_X', 3: 'BDIST',
  4: 'BDIST_Y', 5: 'GEN_SIM', 6: 'LDIR_X', 7: 'LDIR_Y',
  8: 'LP_POP', 9: 'LP_BAR', 10: 'POP', 11: 'POP_F',
  12: 'POP_LR', 13: 'OSC', 14: 'AGE', 15: 'BAR_F',
  16: 'BAR_LR', 17: 'RND', 18: 'SIG0', 19: 'SIG0_F',
  20: 'SIG0_LR',
};

const ACTION_NAMES: Record<number, string> = {
  0: 'MV_X', 1: 'MV_Y', 2: 'MV_FWD', 3: 'MV_RL',
  4: 'MV_RND', 5: 'SET_OSC', 6: 'SET_PRB', 7: 'SET_RSP',
  8: 'EMIT', 9: 'MV_E', 10: 'MV_W', 11: 'MV_N',
  12: 'MV_S', 13: 'MV_L', 14: 'MV_R', 15: 'MV_REV',
};

function sensorShortName(num: number): string {
  return SENSOR_NAMES[num] ?? `S${num}`;
}

function actionShortName(num: number): string {
  return ACTION_NAMES[num] ?? `A${num}`;
}
