// labels.ts -- Human-readable English labels for sensors, actions, and neurons

export const SENSOR_LABELS: Record<string, string> = {
  'LOC_X': 'X Position',
  'LOC_Y': 'Y Position',
  'BDIST_X': 'Distance Left/Right',
  'BDIST': 'Wall Proximity',
  'BDIST_Y': 'Distance Top/Bottom',
  'GEN_SIM': 'Genetic Similarity',
  'LDIR_X': 'Look Direction X',
  'LDIR_Y': 'Look Direction Y',
  'LP_POP': 'Long-Range Agents',
  'LP_BAR': 'Long-Range Barrier',
  'POP': 'Surrounding Density',
  'POP_F': 'Density Ahead',
  'POP_LR': 'Density Sideways',
  'OSC': 'Internal Clock',
  'AGE': 'Age',
  'BAR_F': 'Obstacle Ahead',
  'BAR_LR': 'Obstacle Sideways',
  'RND': 'Random',
  'SIG0': 'Pheromone Strength',
  'SIG0_F': 'Pheromone Ahead',
  'SIG0_LR': 'Pheromone Sideways',
  'BOUNDARY_DIST_X': 'Distance Left/Right',
  'BOUNDARY_DIST': 'Wall Proximity',
  'BOUNDARY_DIST_Y': 'Distance Top/Bottom',
  'GENETIC_SIM_FWD': 'Genetic Similarity',
  'LAST_MOVE_DIR_X': 'Look Direction X',
  'LAST_MOVE_DIR_Y': 'Look Direction Y',
  'LONGPROBE_POP_FWD': 'Long-Range Agents',
  'LONGPROBE_BAR_FWD': 'Long-Range Barrier',
  'POPULATION': 'Surrounding Density',
  'POPULATION_FWD': 'Density Ahead',
  'POPULATION_LR': 'Density Sideways',
  'OSC1': 'Internal Clock',
  'BARRIER_FWD': 'Obstacle Ahead',
  'BARRIER_LR': 'Obstacle Sideways',
  'SIGNAL0': 'Pheromone Strength',
  'SIGNAL0_FWD': 'Pheromone Ahead',
  'SIGNAL0_LR': 'Pheromone Sideways',
};

export const ACTION_LABELS: Record<string, string> = {
  'MV_X': 'Sideways',
  'MV_Y': 'Up/Down',
  'MV_FWD': 'Forward',
  'MV_RL': 'Turn',
  'MV_RND': 'Random Walk',
  'SET_OSC': 'Change Rhythm',
  'SET_PRB': 'Vision Range',
  'SET_RSP': 'Responsiveness',
  'EMIT': 'Emit Pheromone',
  'MV_E': 'Move East',
  'MV_W': 'Move West',
  'MV_N': 'Move North',
  'MV_S': 'Move South',
  'MV_L': 'Turn Left',
  'MV_R': 'Turn Right',
  'MV_REV': 'Reverse',
  // Long-form
  'MOVE_X': 'Sideways',
  'MOVE_Y': 'Up/Down',
  'MOVE_FWD': 'Forward',
  'MOVE_FORWARD': 'Forward',
  'MOVE_RL': 'Turn',
  'MOVE_RANDOM': 'Random Walk',
  'MOVE_RND': 'Random Walk',
  'SET_OSCILLATOR_PERIOD': 'Change Rhythm',
  'SET_LONGPROBE_DIST': 'Vision Range',
  'SET_RESPONSIVENESS': 'Responsiveness',
  'EMIT_SIGNAL0': 'Emit Pheromone',
  'MOVE_EAST': 'Move East',
  'MOVE_WEST': 'Move West',
  'MOVE_NORTH': 'Move North',
  'MOVE_SOUTH': 'Move South',
  'MOVE_LEFT': 'Turn Left',
  'MOVE_RIGHT': 'Turn Right',
  'MOVE_REVERSE': 'Reverse',
  'KILL_FORWARD': 'Attack!',
};

export function neuronLabel(id: string): string {
  // N0, N1, ... → Neuron A, B, ...
  const match = id.match(/^N(\d+)$/);
  if (match) {
    const idx = parseInt(match[1]);
    const letter = String.fromCharCode(65 + idx); // A, B, C, ...
    return `Neuron ${letter}`;
  }
  return id;
}

export function humanLabel(id: string, type?: 'sensor' | 'neuron' | 'action'): string {
  if (type === 'neuron' || /^N\d+$/.test(id)) return neuronLabel(id);
  return SENSOR_LABELS[id] ?? ACTION_LABELS[id] ?? id;
}

/**
 * Describe a connection in plain English.
 * E.g. "Wall Proximity → Forward (+2.3)" or "Neuron A → Turn Right (-1.1)"
 */
export function connectionDescription(
  from: string,
  fromType: 'sensor' | 'neuron',
  to: string,
  toType: 'neuron' | 'action',
  weight?: number,
): string {
  const fromLabel = humanLabel(from, fromType);
  const toLabel = humanLabel(to, toType);
  if (weight !== undefined) {
    const sign = weight >= 0 ? '+' : '';
    return `${fromLabel} → ${toLabel} (${sign}${weight.toFixed(1)})`;
  }
  return `${fromLabel} → ${toLabel}`;
}
