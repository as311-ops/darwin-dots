// actions.ts -- All 16 action implementations + KILL_FORWARD
// Ported from biosim4 executeActions.cpp

import { Indiv, Action, Coord, Dir } from './types';
import { Grid } from './grid';
import { Peeps } from './peeps';
import { Signals } from './signals';
import { SimParams } from './params';
import { randomFloat, randomUint } from './random';

// 8-direction normalized coords as flat integer pairs [x0,y0, x1,y1, ...] — compass order SW,S,SE,W,E,NW,N,NE
// Avoids Dir.random8().asNormalizedCoord() (2 allocations) in MOVE_RANDOM hot path
const RANDOM8_XY = new Int8Array([
  -1,-1, // SW=0
   0,-1, // S=1
   1,-1, // SE=2
  -1, 0, // W=3
   1, 0, // E=5 (skip CENTER=4)
  -1, 1, // NW=6
   0, 1, // N=7
   1, 1, // NE=8
]);

// ---------------------------------------------------------------------------
// prob2bool -- convert probability to boolean
// ---------------------------------------------------------------------------

export function prob2bool(factor: number): boolean {
  return randomFloat() < factor;
}

// ---------------------------------------------------------------------------
// responseCurve -- sigmoid-like response curve
// ---------------------------------------------------------------------------

export function responseCurve(r: number, kFactor: number): number {
  const k = kFactor;
  return Math.pow(r - 2.0, -2.0 * k) - Math.pow(2.0, -2.0 * k) * (1.0 - r);
}

// ---------------------------------------------------------------------------
// executeActions -- main entry point
// ---------------------------------------------------------------------------

export function executeActions(
  indiv: Indiv,
  actionLevels: ArrayLike<number>,
  grid: Grid,
  peeps: Peeps,
  signals: Signals,
  params: SimParams,
  onKill?: (killer: Indiv, x: number, y: number) => void,
): void {
  // isEnabled was always true (all Action values < NUM_ACTIONS) — removed closure

  // --- SET_RESPONSIVENESS ---
  {
    const level = actionLevels[Action.SET_RESPONSIVENESS];
    indiv.responsiveness = (Math.tanh(level) + 1.0) / 2.0;
  }

  const responsivenessAdjusted = responseCurve(
    indiv.responsiveness,
    params.responsivenessCurveKFactor,
  );

  // --- SET_OSCILLATOR_PERIOD ---
  {
    const periodf = actionLevels[Action.SET_OSCILLATOR_PERIOD];
    const newPeriodf01 = (Math.tanh(periodf) + 1.0) / 2.0;
    const newPeriod = 1 + Math.floor(1.5 + Math.exp(7.0 * newPeriodf01));
    indiv.oscPeriod = Math.max(2, Math.min(2048, newPeriod));
  }

  // --- SET_LONGPROBE_DIST ---
  {
    const maxLongProbeDistance = 32;
    let level = actionLevels[Action.SET_LONGPROBE_DIST];
    level = (Math.tanh(level) + 1.0) / 2.0;
    level = 1 + level * maxLongProbeDistance;
    indiv.longProbeDist = Math.floor(level);
  }

  // --- EMIT_SIGNAL0 ---
  {
    const emitThreshold = 0.5;
    let level = actionLevels[Action.EMIT_SIGNAL0];
    level = (Math.tanh(level) + 1.0) / 2.0;
    level *= responsivenessAdjusted;
    if (level > emitThreshold && prob2bool(level)) {
      signals.increment(0, indiv.loc);
    }
  }

  // Precompute lastMoveDir normalized coord as integers once — eliminates per-call Coord allocations
  const lastMoveNc = indiv.lastMoveDir.asNormalizedCoord();
  const lmdx = lastMoveNc.x;
  const lmdy = lastMoveNc.y;
  // rotate90DegCW:  (lmdy, -lmdx) — no Dir/Coord allocation needed
  // rotate90DegCCW: (-lmdy, lmdx) — no Dir/Coord allocation needed

  // --- KILL_FORWARD ---
  if (params.killEnable) {
    const killThreshold = 0.5;
    let level = actionLevels[Action.KILL_FORWARD];
    level = (Math.tanh(level) + 1.0) / 2.0;
    level *= responsivenessAdjusted;
    if (level > killThreshold && prob2bool(level)) {
      const ox = indiv.loc.x + lmdx;
      const oy = indiv.loc.y + lmdy;
      const otherLoc = new Coord(ox, oy);
      if (grid.isInBounds(otherLoc) && grid.isOccupiedAt(otherLoc)) {
        const indiv2 = peeps.getIndivAt(otherLoc, grid);
        peeps.queueForDeath(indiv2.index);
        onKill?.(indiv, ox, oy);
      }
    }
  }

  // ------------- Movement action neurons ---------------
  let moveX = actionLevels[Action.MOVE_X];
  let moveY = actionLevels[Action.MOVE_Y];

  moveX += actionLevels[Action.MOVE_EAST];
  moveX -= actionLevels[Action.MOVE_WEST];
  moveY += actionLevels[Action.MOVE_NORTH];
  moveY -= actionLevels[Action.MOVE_SOUTH];

  {
    const level = actionLevels[Action.MOVE_FORWARD];
    moveX += lmdx * level;
    moveY += lmdy * level;
  }

  {
    const level = actionLevels[Action.MOVE_REVERSE];
    moveX -= lmdx * level;
    moveY -= lmdy * level;
  }

  {
    const level = actionLevels[Action.MOVE_LEFT];
    // rotate90DegCCW: (-y, x) applied to (lmdx, lmdy) → (-lmdy, lmdx)
    moveX += (-lmdy) * level;
    moveY += lmdx * level;
  }

  {
    const level = actionLevels[Action.MOVE_RIGHT];
    // rotate90DegCW: (y, -x) applied to (lmdx, lmdy) → (lmdy, -lmdx)
    moveX += lmdy * level;
    moveY += (-lmdx) * level;
  }

  {
    const level = actionLevels[Action.MOVE_RL];
    // rotate90DegCW: (y, -x) applied to (lmdx, lmdy) → (lmdy, -lmdx)
    moveX += lmdy * level;
    moveY += (-lmdx) * level;
  }

  {
    const level = actionLevels[Action.MOVE_RANDOM];
    const rndIdx = randomUint(0, 7) * 2;
    moveX += RANDOM8_XY[rndIdx] * level;
    moveY += RANDOM8_XY[rndIdx + 1] * level;
  }

  // Convert accumulated sums to -1.0..1.0 and scale by responsiveness
  moveX = Math.tanh(moveX) * responsivenessAdjusted;
  moveY = Math.tanh(moveY) * responsivenessAdjusted;

  const probX = prob2bool(Math.abs(moveX)) ? 1 : 0;
  const probY = prob2bool(Math.abs(moveY)) ? 1 : 0;

  const signumX = moveX < 0.0 ? -1 : 1;
  const signumY = moveY < 0.0 ? -1 : 1;

  // Inline newLoc as integer arithmetic — no intermediate Coord object
  const newLocX = indiv.loc.x + probX * signumX;
  const newLocY = indiv.loc.y + probY * signumY;
  const newLoc = new Coord(newLocX, newLocY);

  if (grid.isInBounds(newLoc) && grid.isEmptyAt(newLoc)) {
    peeps.queueForMove(indiv.index, newLoc);
  }
}
