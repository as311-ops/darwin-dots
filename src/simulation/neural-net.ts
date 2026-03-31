// neural-net.ts -- Neural net construction and feed-forward execution
// Ported from biosim4 genome.cpp (createWiringFromGenome) and feedForward.cpp

import { Gene, Genome, NeuralNet, Neuron, Indiv, Sensor, Action } from './types';

// ---------------------------------------------------------------------------
// Constants (matching C++ genome-neurons.h)
// ---------------------------------------------------------------------------

const NEURON = 0 as const;  // source or sink type
const SENSOR = 1 as const;  // always a source
const ACTION = 1 as const;  // always a sink

const WEIGHT_DIVISOR = 8192.0;
const INITIAL_NEURON_OUTPUT = 0.5;

// ---------------------------------------------------------------------------
// Wiring parameters interface
// ---------------------------------------------------------------------------

export interface WiringParams {
  maxNumberNeurons: number;
  numSenses: number;    // number of active sensors
  numActions: number;   // number of active actions
}

// ---------------------------------------------------------------------------
// Internal types for wiring construction
// ---------------------------------------------------------------------------

/** Tracks neuron connectivity during the culling process. */
interface NodeInfo {
  remappedNumber: number;
  numOutputs: number;
  numSelfInputs: number;
  numInputsFromSensorsOrOtherNeurons: number;
}

// ---------------------------------------------------------------------------
// Connection list construction (Step 1)
// ---------------------------------------------------------------------------

/**
 * Convert a genome to a renumbered connection list.
 * Neuron numbers are mapped to 0..maxNumberNeurons-1 via modulo.
 * Sensor numbers are mapped to 0..numSenses-1 via modulo.
 * Action numbers are mapped to 0..numActions-1 via modulo.
 */
function makeRenumberedConnectionList(
  genome: Genome,
  params: WiringParams,
): Gene[] {
  const connectionList: Gene[] = [];

  for (const gene of genome) {
    const conn: Gene = { ...gene };

    if (conn.sourceType === NEURON) {
      conn.sourceNum = conn.sourceNum % params.maxNumberNeurons;
    } else {
      conn.sourceNum = conn.sourceNum % params.numSenses;
    }

    if (conn.sinkType === NEURON) {
      conn.sinkNum = conn.sinkNum % params.maxNumberNeurons;
    } else {
      conn.sinkNum = conn.sinkNum % params.numActions;
    }

    connectionList.push(conn);
  }

  return connectionList;
}

// ---------------------------------------------------------------------------
// Node map construction (Step 2)
// ---------------------------------------------------------------------------

/**
 * Build a map of neuron numbers to their connectivity info.
 * Tracks input counts, output counts, and self-connections.
 */
function makeNodeMap(
  connectionList: Gene[],
  maxNumberNeurons: number,
): Map<number, NodeInfo> {
  const nodeMap = new Map<number, NodeInfo>();

  const getOrCreateNode = (neuronNum: number): NodeInfo => {
    let node = nodeMap.get(neuronNum);
    if (node === undefined) {
      node = {
        remappedNumber: 0,
        numOutputs: 0,
        numSelfInputs: 0,
        numInputsFromSensorsOrOtherNeurons: 0,
      };
      nodeMap.set(neuronNum, node);
    }
    return node;
  };

  for (const conn of connectionList) {
    if (conn.sinkType === NEURON) {
      const sinkNode = getOrCreateNode(conn.sinkNum);
      if (conn.sourceType === NEURON && conn.sourceNum === conn.sinkNum) {
        sinkNode.numSelfInputs++;
      } else {
        sinkNode.numInputsFromSensorsOrOtherNeurons++;
      }
    }
    if (conn.sourceType === NEURON) {
      const sourceNode = getOrCreateNode(conn.sourceNum);
      sourceNode.numOutputs++;
    }
  }

  return nodeMap;
}

// ---------------------------------------------------------------------------
// Neuron culling (Step 3)
// ---------------------------------------------------------------------------

/**
 * Remove all connections that feed a specific neuron.
 * If a removed connection's source is another neuron, decrement that neuron's output count.
 */
function removeConnectionsToNeuron(
  connections: Gene[],
  nodeMap: Map<number, NodeInfo>,
  neuronNumber: number,
): Gene[] {
  const result: Gene[] = [];
  for (const conn of connections) {
    if (conn.sinkType === NEURON && conn.sinkNum === neuronNumber) {
      // Remove this connection; if source is a neuron, decrement its outputs
      if (conn.sourceType === NEURON) {
        const sourceNode = nodeMap.get(conn.sourceNum);
        if (sourceNode) {
          sourceNode.numOutputs--;
        }
      }
      // Connection is removed (not added to result)
    } else {
      result.push(conn);
    }
  }
  return result;
}

/**
 * Iteratively remove neurons that have no outputs (or only self-feeding outputs).
 * Each removal may cause other neurons to become useless, so we loop until stable.
 */
function cullUselessNeurons(
  connections: Gene[],
  nodeMap: Map<number, NodeInfo>,
): Gene[] {
  let currentConnections = connections;
  let allDone = false;

  while (!allDone) {
    allDone = true;
    const neuronsToRemove: number[] = [];

    for (const [neuronNum, node] of nodeMap) {
      // A neuron is useless if its outputs == its self-inputs (could be 0 == 0)
      if (node.numOutputs === node.numSelfInputs) {
        allDone = false;
        neuronsToRemove.push(neuronNum);
      }
    }

    for (const neuronNum of neuronsToRemove) {
      currentConnections = removeConnectionsToNeuron(currentConnections, nodeMap, neuronNum);
      nodeMap.delete(neuronNum);
    }
  }

  return currentConnections;
}

// ---------------------------------------------------------------------------
// Public: createWiringFromGenome
// ---------------------------------------------------------------------------

/**
 * Convert a genome into a NeuralNet (connections + neurons).
 *
 * This is the main wiring function. Steps:
 * 1. Renumber neuron/sensor/action indices via modulo
 * 2. Build a node map tracking connectivity
 * 3. Cull neurons with no useful outputs
 * 4. Renumber remaining neurons sequentially from 0
 * 5. Order connections: neuron-sinks first, then action-sinks (optimizes feedForward)
 * 6. Create neuron array with initial output values
 */
export function createWiringFromGenome(
  genome: Genome,
  params: WiringParams,
): NeuralNet {
  // Step 1: Renumber
  const connectionList = makeRenumberedConnectionList(genome, params);

  // Step 2: Build node map
  const nodeMap = makeNodeMap(connectionList, params.maxNumberNeurons);

  // Step 3: Cull useless neurons
  const culledConnections = cullUselessNeurons(connectionList, nodeMap);

  // Step 4: Renumber remaining neurons sequentially starting at 0
  let newNumber = 0;
  // Iterate in key order (Map preserves insertion order, but C++ std::map sorts by key)
  const sortedKeys = Array.from(nodeMap.keys()).sort((a, b) => a - b);
  for (const key of sortedKeys) {
    const node = nodeMap.get(key)!;
    node.remappedNumber = newNumber++;
  }

  // Step 5: Build final connection list in two passes
  // First pass: connections to neurons (sinkType === NEURON)
  const finalConnections: Gene[] = [];

  for (const conn of culledConnections) {
    if (conn.sinkType === NEURON) {
      const newConn: Gene = { ...conn };
      // Remap sink neuron number
      const sinkNode = nodeMap.get(newConn.sinkNum);
      if (sinkNode) {
        newConn.sinkNum = sinkNode.remappedNumber;
      }
      // If source is a neuron, remap it too
      if (newConn.sourceType === NEURON) {
        const sourceNode = nodeMap.get(newConn.sourceNum);
        if (sourceNode) {
          newConn.sourceNum = sourceNode.remappedNumber;
        }
      }
      finalConnections.push(newConn);
    }
  }

  // Second pass: connections to actions (sinkType === ACTION)
  for (const conn of culledConnections) {
    if (conn.sinkType === ACTION) {
      const newConn: Gene = { ...conn };
      // If source is a neuron, remap its number
      if (newConn.sourceType === NEURON) {
        const sourceNode = nodeMap.get(newConn.sourceNum);
        if (sourceNode) {
          newConn.sourceNum = sourceNode.remappedNumber;
        }
      }
      finalConnections.push(newConn);
    }
  }

  // Step 6: Create neuron array
  const neurons: Neuron[] = [];
  for (let i = 0; i < nodeMap.size; i++) {
    neurons.push({
      output: INITIAL_NEURON_OUTPUT,
      driven: false, // will be set below
    });
  }

  // Set driven flag: a neuron is driven if it has inputs from sensors or other neurons.
  // We iterate sortedKeys because remappedNumber was assigned in that order.
  for (const key of sortedKeys) {
    const node = nodeMap.get(key)!;
    neurons[node.remappedNumber].driven =
      node.numInputsFromSensorsOrOtherNeurons !== 0;
  }

  return {
    connections: finalConnections,
    neurons,
    actionScratch: new Float32Array(params.numActions),
    neuronScratch: new Float32Array(neurons.length),
  };
}

// ---------------------------------------------------------------------------
// Feed-forward parameters
// ---------------------------------------------------------------------------

export interface FeedForwardParams {
  numActions: number;
}

/**
 * Sensor function type: given a sensor enum value and the current sim step,
 * return a float value in 0.0..1.0.
 */
export type GetSensorFunc = (sensor: number, simStep: number) => number;

// ---------------------------------------------------------------------------
// Public: feedForward
// ---------------------------------------------------------------------------

/**
 * Execute one feed-forward pass through an individual's neural net.
 *
 * For each connection, reads the source value (sensor or neuron output),
 * multiplies by the connection weight, and accumulates into the sink
 * (neuron accumulator or action level).
 *
 * TWO PASSES (matching C++ exactly):
 * 1. Process all neuron-sink connections, accumulating weighted inputs.
 *    When we encounter the FIRST action-sink connection, apply tanh to all
 *    driven neuron accumulators and latch their outputs.
 * 2. Continue processing action-sink connections using the updated neuron outputs.
 *
 * The connection list is pre-sorted (neuron-sinks first, then action-sinks)
 * by createWiringFromGenome, so this ordering is guaranteed.
 *
 * @returns actionLevels array of length numActions (raw weighted sums, arbitrary range)
 */
export function feedForward(
  nnet: NeuralNet,
  simStep: number,
  getSensor: GetSensorFunc,
  params: FeedForwardParams,
): Float32Array {
  const actionLevels = nnet.actionScratch;
  const neuronAccumulators = nnet.neuronScratch;
  actionLevels.fill(0.0);
  neuronAccumulators.fill(0.0);

  // Flag: have we already computed (tanh'd) the neuron outputs?
  let neuronOutputsComputed = false;

  for (const conn of nnet.connections) {
    // When we hit the first action-sink connection, latch all neuron outputs
    if (conn.sinkType === ACTION && !neuronOutputsComputed) {
      for (let i = 0; i < nnet.neurons.length; i++) {
        if (nnet.neurons[i].driven) {
          nnet.neurons[i].output = Math.tanh(neuronAccumulators[i]);
        }
      }
      neuronOutputsComputed = true;
    }

    // Get the input value from the source
    let inputVal: number;
    if (conn.sourceType === SENSOR) {
      inputVal = getSensor(conn.sourceNum, simStep);
    } else {
      inputVal = nnet.neurons[conn.sourceNum].output;
    }

    // Weight the input and accumulate into sink
    const weightedInput = inputVal * (conn.weight / WEIGHT_DIVISOR);

    if (conn.sinkType === ACTION) {
      actionLevels[conn.sinkNum] += weightedInput;
    } else {
      neuronAccumulators[conn.sinkNum] += weightedInput;
    }
  }

  return actionLevels;
}
