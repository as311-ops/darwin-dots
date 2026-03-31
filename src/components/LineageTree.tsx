import { useMemo } from 'react';
import type { ChampionSnapshot } from '../simulation/lineage';

interface LineageTreeProps {
  snapshots: ChampionSnapshot[];
  maxDisplay?: number;
}

// --- Mini avatar types ---

interface ColorChar {
  char: string;
  color: string;
}

// --- Human-readable labels for diff annotations ---

// Match short names from genome-profile.ts / lineage.ts
const SENSOR_LABEL: Record<string, string> = {
  LOC_X: 'Location', LOC_Y: 'Location',
  BDIST_X: 'Boundary', BDIST: 'Boundary', BDIST_Y: 'Boundary',
  GEN_SIM: 'Genetics',
  LDIR_X: 'Direction', LDIR_Y: 'Direction',
  LP_POP: 'Probe', LP_BAR: 'Probe',
  POP: 'Population', POP_F: 'Population', POP_LR: 'Population',
  OSC: 'Oscillator',
  AGE: 'Age',
  BAR_F: 'Barrier', BAR_LR: 'Barrier',
  RND: 'Random',
  SIG0: 'Signal', SIG0_F: 'Signal', SIG0_LR: 'Signal',
};

const ACTION_LABEL: Record<string, string> = {
  MV_X: 'MoveX', MV_Y: 'MoveY', MV_FWD: 'Forward', MV_RL: 'Sideways',
  MV_RND: 'Random', SET_OSC: 'Oscillate', SET_PRB: 'Probe', SET_RSP: 'Adapt',
  EMIT: 'Emit', MV_E: 'East', MV_W: 'West', MV_N: 'North',
  MV_S: 'South', MV_L: 'Left', MV_R: 'Right', MV_REV: 'Reverse',
};

// --- Mini avatar builder (same structure as CreatureAvatar) ---

function buildMiniAvatar(snapshot: ChampionSnapshot): ColorChar[][] {
  const c = (char: string, color: string): ColorChar => ({ char, color });
  const CY = 'text-cyan-400';
  const VL = 'text-violet-400';
  const EM = 'text-emerald-400';
  const G = 'text-zinc-600';
  const YL = 'text-yellow-300';
  const RD = 'text-red-400';

  const sensors = new Set(snapshot.sensors);
  const actions = new Set(snapshot.actions);
  const lines: ColorChar[][] = [];

  // Antennae
  const hasSignal = sensors.has('SIG0') || sensors.has('SIG0_F') || sensors.has('SIG0_LR');
  const hasBarrier = sensors.has('BAR_F') || sensors.has('BAR_LR');
  if (hasSignal || hasBarrier) {
    const left = hasSignal ? [c('~', YL), c('\\', G)] : [c(' ', G), c(' ', G)];
    const right = hasBarrier ? [c('/', G), c('!', RD)] : [c(' ', G), c(' ', G)];
    lines.push([c(' ', G), ...left, c(' ', G), ...right]);
  }

  // Eyes
  const eyeSensors = [
    sensors.has('LOC_X') || sensors.has('LOC_Y'),
    sensors.has('BDIST') || sensors.has('BDIST_X') || sensors.has('BDIST_Y'),
    sensors.has('POP') || sensors.has('POP_F'),
    sensors.has('AGE'),
  ].filter(Boolean).length;
  if (eyeSensors >= 3) {
    lines.push([c('◉', CY), c('◉', CY), c('◉', CY)]);
  } else if (eyeSensors >= 2) {
    lines.push([c('◉', CY), c(' ', G), c('◉', CY)]);
  } else {
    lines.push([c(' ', G), c('◉', CY), c(' ', G)]);
  }

  // Head
  const headW = Math.min(snapshot.neuronCount + 1, 5);
  lines.push([c('╔', VL), c('█'.repeat(headW), VL), c('╗', VL)]);

  // Body
  const bodyW = Math.min(Math.floor(snapshot.genomeLength / 8) + 1, 5);
  const bodyChar = snapshot.score > 0.7 ? '▓' : snapshot.score > 0.3 ? '▒' : '░';
  lines.push([c(' ', G), c(bodyChar.repeat(bodyW), EM), c(' ', G)]);

  // Legs
  const movesFwd = actions.has('MV_FWD');
  const movesSide = actions.has('MV_RL') || actions.has('MV_L') || actions.has('MV_R');
  if (movesFwd) {
    lines.push([c(' ╿', 'text-zinc-100'), c(' ', G), c('╿', 'text-zinc-100')]);
  } else if (movesSide) {
    lines.push([c('╾', 'text-amber-400'), c('─', 'text-amber-400'), c('╼', 'text-amber-400')]);
  }

  return lines;
}

// --- Mutation diff ---

interface MutationAnnotation {
  text: string;
  color: string;
}

function computeMutationDiff(
  prev: ChampionSnapshot,
  curr: ChampionSnapshot,
): MutationAnnotation[] {
  const annotations: MutationAnnotation[] = [];

  // Neuron count change (always show)
  const nDiff = curr.neuronCount - prev.neuronCount;
  if (nDiff !== 0) {
    annotations.push({
      text: `${nDiff > 0 ? '+' : ''}${nDiff}N`,
      color: nDiff > 0 ? 'text-violet-400' : 'text-red-400',
    });
  }

  // Genome length change (always show)
  const gDiff = curr.genomeLength - prev.genomeLength;
  if (gDiff !== 0) {
    annotations.push({
      text: `${gDiff > 0 ? '+' : ''}${gDiff}G`,
      color: gDiff > 0 ? 'text-emerald-400' : 'text-amber-400',
    });
  }

  // Net sensor/action count changes (compact summary instead of listing each one)
  const prevSensors = new Set(prev.sensors);
  const currSensors = new Set(curr.sensors);
  const gained = curr.sensors.filter(s => !prevSensors.has(s));
  const lost = prev.sensors.filter(s => !currSensors.has(s));
  const sDiff = gained.length - lost.length;
  if (sDiff !== 0) {
    annotations.push({
      text: `${sDiff > 0 ? '+' : ''}${sDiff}S`,
      color: sDiff > 0 ? 'text-cyan-400' : 'text-red-400',
    });
  }

  const prevActions = new Set(prev.actions);
  const currActions = new Set(curr.actions);
  const gainedA = curr.actions.filter(a => !prevActions.has(a));
  const lostA = prev.actions.filter(a => !currActions.has(a));
  const aDiff = gainedA.length - lostA.length;
  if (aDiff !== 0) {
    annotations.push({
      text: `${aDiff > 0 ? '+' : ''}${aDiff}A`,
      color: aDiff > 0 ? 'text-amber-400' : 'text-red-400',
    });
  }

  return annotations;
}

// --- Snapshot selection (evenly spaced, always first + last) ---

function selectSnapshots(
  snapshots: ChampionSnapshot[],
  maxDisplay: number,
): ChampionSnapshot[] {
  if (snapshots.length <= maxDisplay) return snapshots;

  const result: ChampionSnapshot[] = [snapshots[0]];
  const step = (snapshots.length - 1) / (maxDisplay - 1);
  for (let i = 1; i < maxDisplay - 1; i++) {
    const idx = Math.round(i * step);
    result.push(snapshots[idx]);
  }
  result.push(snapshots[snapshots.length - 1]);

  return result;
}

// --- Component ---

export default function LineageTree({
  snapshots,
  maxDisplay = 3,
}: LineageTreeProps) {
  const displaySnapshots = useMemo(
    () => selectSnapshots(snapshots, maxDisplay),
    [snapshots, maxDisplay],
  );

  if (snapshots.length === 0) {
    return (
      <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-zinc-500 text-sm">&#x1F9EC;</span>
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
            Lineage
          </span>
        </div>
        <div className="text-[11px] text-zinc-500 text-center py-6">
          Waiting for lineage data...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-3 flex flex-col max-h-full">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2 flex-shrink-0">
        <svg
          className="w-3.5 h-3.5 text-emerald-500"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2c-1.7 4-3 6-3 9a3 3 0 1 0 6 0c0-3-1.3-5-3-9Z" />
          <path d="M12 11v11" />
          <path d="M9 17c-2-1-4-.5-5 1" />
          <path d="M15 17c2-1 4-.5 5 1" />
        </svg>
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
          Lineage
        </span>
        <span className="text-[10px] text-zinc-600 ml-auto font-mono">
          {snapshots.length} gen{snapshots.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto min-h-0 pr-1">
        {displaySnapshots.map((snap, idx) => {
          const isFirst = idx === 0;
          const isLast = idx === displaySnapshots.length - 1;
          const prevSnap = idx > 0 ? displaySnapshots[idx - 1] : null;
          const mutations = prevSnap ? computeMutationDiff(prevSnap, snap) : [];
          const avatar = buildMiniAvatar(snap);

          return (
            <div key={snap.generation} className="relative">
              {/* Mutation annotations between nodes */}
              {!isFirst && mutations.length > 0 && (
                <div className="flex items-center gap-1 pl-[18px] py-0.5">
                  <div className="w-px h-3 bg-zinc-700 mr-1.5 flex-shrink-0" />
                  <div className="flex flex-wrap gap-1">
                    {mutations.map((m, mi) => (
                      <span
                        key={mi}
                        className={`text-[8px] font-mono px-1 py-px rounded bg-zinc-800/80 ${m.color}`}
                      >
                        {m.text}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Connector line above */}
              {!isFirst && (
                <div className="pl-[18px]">
                  <div className="w-px h-2 bg-zinc-700" />
                </div>
              )}

              {/* Node */}
              <div className="flex gap-2 items-start">
                {/* Vertical rail + dot */}
                <div className="flex flex-col items-center flex-shrink-0 w-[38px]">
                  <div
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      isLast
                        ? 'bg-emerald-500 ring-2 ring-emerald-500/30'
                        : isFirst
                          ? 'bg-violet-500 ring-2 ring-violet-500/30'
                          : 'bg-zinc-600'
                    }`}
                  />
                  {!isLast && (
                    <div className="w-px flex-1 min-h-[8px] bg-zinc-700" />
                  )}
                </div>

                {/* Card */}
                <div
                  className={`flex-1 rounded border px-2 py-1.5 min-w-0 ${
                    isLast
                      ? 'bg-emerald-950/30 border-emerald-800/50'
                      : 'bg-zinc-800/40 border-zinc-800'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {/* Mini avatar */}
                    <pre className="font-mono text-[9px] leading-[11px] select-none flex-shrink-0">
                      {avatar.map((line, li) => (
                        <div key={li}>
                          {line.map((ch, ci) => (
                            <span key={ci} className={ch.color}>
                              {ch.char}
                            </span>
                          ))}
                        </div>
                      ))}
                    </pre>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-bold text-zinc-100 truncate">
                        {snap.name}
                      </div>
                      <div className="text-[9px] text-zinc-500">
                        Gen {snap.generation}
                        {snap.score > 0 && (
                          <span className="ml-1.5 text-emerald-500">
                            {(snap.score * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>
                      {/* Trait badges */}
                      <div className="flex flex-wrap gap-0.5 mt-1">
                        <span className="text-[8px] px-1 py-px rounded bg-violet-900/60 text-violet-300 font-mono">
                          {snap.neuronCount}N
                        </span>
                        <span className="text-[8px] px-1 py-px rounded bg-zinc-800 text-zinc-400 font-mono">
                          {snap.genomeLength}G
                        </span>
                        {snap.sensors.length > 0 && (
                          <span className="text-[8px] px-1 py-px rounded bg-cyan-900/60 text-cyan-300 font-mono">
                            {snap.sensors.length}S
                          </span>
                        )}
                        {snap.actions.length > 0 && (
                          <span className="text-[8px] px-1 py-px rounded bg-amber-900/60 text-amber-300 font-mono">
                            {snap.actions.length}A
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
