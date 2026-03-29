// labels.ts -- Human-readable German labels for sensors, actions, and neurons

export const SENSOR_LABELS: Record<string, string> = {
  'LOC_X': 'X-Position',
  'LOC_Y': 'Y-Position',
  'BDIST_X': 'Abstand links/rechts',
  'BDIST': 'Wandnähe',
  'BDIST_Y': 'Abstand oben/unten',
  'GEN_SIM': 'Verwandtschaft',
  'LDIR_X': 'Blickrichtung X',
  'LDIR_Y': 'Blickrichtung Y',
  'LP_POP': 'Fernsicht Agenten',
  'LP_BAR': 'Fernsicht Barriere',
  'POP': 'Umgebungsdichte',
  'POP_F': 'Dichte voraus',
  'POP_LR': 'Dichte seitlich',
  'OSC': 'Innere Uhr',
  'AGE': 'Alter',
  'BAR_F': 'Hindernis voraus',
  'BAR_LR': 'Hindernis seitlich',
  'RND': 'Zufall',
  'SIG0': 'Pheromon-Stärke',
  'SIG0_F': 'Pheromon voraus',
  'SIG0_LR': 'Pheromon seitlich',
  'BOUNDARY_DIST_X': 'Abstand links/rechts',
  'BOUNDARY_DIST': 'Wandnähe',
  'BOUNDARY_DIST_Y': 'Abstand oben/unten',
  'GENETIC_SIM_FWD': 'Verwandtschaft',
  'LAST_MOVE_DIR_X': 'Blickrichtung X',
  'LAST_MOVE_DIR_Y': 'Blickrichtung Y',
  'LONGPROBE_POP_FWD': 'Fernsicht Agenten',
  'LONGPROBE_BAR_FWD': 'Fernsicht Barriere',
  'POPULATION': 'Umgebungsdichte',
  'POPULATION_FWD': 'Dichte voraus',
  'POPULATION_LR': 'Dichte seitlich',
  'OSC1': 'Innere Uhr',
  'BARRIER_FWD': 'Hindernis voraus',
  'BARRIER_LR': 'Hindernis seitlich',
  'SIGNAL0': 'Pheromon-Stärke',
  'SIGNAL0_FWD': 'Pheromon voraus',
  'SIGNAL0_LR': 'Pheromon seitlich',
};

export const ACTION_LABELS: Record<string, string> = {
  'MV_X': 'Seitwärts',
  'MV_Y': 'Hoch/Runter',
  'MV_FWD': 'Vorwärts',
  'MV_RL': 'Abbiegen',
  'MV_RND': 'Zufallslauf',
  'SET_OSC': 'Takt ändern',
  'SET_PRB': 'Sichtweite',
  'SET_RSP': 'Reaktionsfreude',
  'EMIT': 'Duftmarke setzen',
  'MV_E': 'Nach Osten',
  'MV_W': 'Nach Westen',
  'MV_N': 'Nach Norden',
  'MV_S': 'Nach Süden',
  'MV_L': 'Links abbiegen',
  'MV_R': 'Rechts abbiegen',
  'MV_REV': 'Umkehren',
  // Long-form
  'MOVE_X': 'Seitwärts',
  'MOVE_Y': 'Hoch/Runter',
  'MOVE_FWD': 'Vorwärts',
  'MOVE_FORWARD': 'Vorwärts',
  'MOVE_RL': 'Abbiegen',
  'MOVE_RANDOM': 'Zufallslauf',
  'MOVE_RND': 'Zufallslauf',
  'SET_OSCILLATOR_PERIOD': 'Takt ändern',
  'SET_LONGPROBE_DIST': 'Sichtweite',
  'SET_RESPONSIVENESS': 'Reaktionsfreude',
  'EMIT_SIGNAL0': 'Duftmarke setzen',
  'MOVE_EAST': 'Nach Osten',
  'MOVE_WEST': 'Nach Westen',
  'MOVE_NORTH': 'Nach Norden',
  'MOVE_SOUTH': 'Nach Süden',
  'MOVE_LEFT': 'Links abbiegen',
  'MOVE_RIGHT': 'Rechts abbiegen',
  'MOVE_REVERSE': 'Umkehren',
  'KILL_FORWARD': 'Angriff!',
};

export function neuronLabel(id: string): string {
  // N0, N1, ... → Gehirnzelle A, B, ...
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
 * Describe a connection in plain German.
 * E.g. "Wandnähe → Vorwärts (+2.3)" or "Gehirn A → Rechts abbiegen (-1.1)"
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
