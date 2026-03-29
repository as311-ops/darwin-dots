// actions.ts -- All 16 action implementations + KILL_FORWARD
// Ported from biosim4 executeActions.cpp

import { Indiv, Action, Coord, Dir } from './types';
import { Grid } from './grid';
import { Peeps } from './peeps';
import { Signals } from './signals';
import { SimParams } from './params';
import { randomFloat } from './random';

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
  actionLevels: number[],
  grid: Grid,
  peeps: Peeps,
  signals: Signals,
  params: SimParams,
): void {
  const isEnabled = (action: Action): boolean => action < Action.NUM_ACTIONS;

  // --- SET_RESPONSIVENESS ---
  if (isEnabled(Action.SET_RESPONSIVENESS)) {
    const level = actionLevels[Action.SET_RESPONSIVENESS];
    indiv.responsiveness = (Math.tanh(level) + 1.0) / 2.0;
  }

  const responsivenessAdjusted = responseCurve(
    indiv.responsiveness,
    params.responsivenessCurveKFactor,
  );

  // --- SET_OSCILLATOR_PERIOD ---
  if (isEnabled(Action.SET_OSCILLATOR_PERIOD)) {
    const periodf = actionLevels[Action.SET_OSCILLATOR_PERIOD];
    const newPeriodf01 = (Math.tanh(periodf) + 1.0) / 2.0;
    const newPeriod = 1 + Math.floor(1.5 + Math.exp(7.0 * newPeriodf01));
    indiv.oscPeriod = Math.max(2, Math.min(2048, newPeriod));
  }

  // --- SET_LONGPROBE_DIST ---
  if (isEnabled(Action.SET_LONGPROBE_DIST)) {
    const maxLongProbeDistance = 32;
    let level = actionLevels[Action.SET_LONGPROBE_DIST];
    level = (Math.tanh(level) + 1.0) / 2.0;
    level = 1 + level * maxLongProbeDistance;
    indiv.longProbeDist = Math.floor(level);
  }

  // --- EMIT_SIGNAL0 ---
  if (isEnabled(Action.EMIT_SIGNAL0)) {
    const emitThreshold = 0.5;
    let level = actionLevels[Action.EMIT_SIGNAL0];
    level = (Math.tanh(level) + 1.0) / 2.0;
    level *= responsivenessAdjusted;
    if (level > emitThreshold && prob2bool(level)) {
      signals.increment(0, indiv.loc);
    }
  }

  // --- KILL_FORWARD ---
  if (isEnabled(Action.KILL_FORWARD) && params.killEnable) {
    const killThreshold = 0.5;
    let level = actionLevels[Action.KILL_FORWARD];
    level = (Math.tanh(level) + 1.0) / 2.0;
    level *= responsivenessAdjusted;
    if (level > killThreshold && prob2bool(level)) {
      const otherLoc = indiv.loc.add(indiv.lastMoveDir);
      if (grid.isInBounds(otherLoc) && grid.isOccupiedAt(otherLoc)) {
        const indiv2 = peeps.getIndivAt(otherLoc, grid);
        peeps.queueForDeath(indiv2.index);
      }
    }
  }

  // ------------- Movement action neurons ---------------
  const lastMoveOffset = indiv.lastMoveDir.asNormalizedCoord();

  let moveX = isEnabled(Action.MOVE_X) ? actionLevels[Action.MOVE_X] : 0.0;
  let moveY = isEnabled(Action.MOVE_Y) ? actionLevels[Action.MOVE_Y] : 0.0;

  if (isEnabled(Action.MOVE_EAST)) moveX += actionLevels[Action.MOVE_EAST];
  if (isEnabled(Action.MOVE_WEST)) moveX -= actionLevels[Action.MOVE_WEST];
  if (isEnabled(Action.MOVE_NORTH)) moveY += actionLevels[Action.MOVE_NORTH];
  if (isEnabled(Action.MOVE_SOUTH)) moveY -= actionLevels[Action.MOVE_SOUTH];

  if (isEnabled(Action.MOVE_FORWARD)) {
    const level = actionLevels[Action.MOVE_FORWARD];
    moveX += lastMoveOffset.x * level;
    moveY += lastMoveOffset.y * level;
  }

  if (isEnabled(Action.MOVE_REVERSE)) {
    const level = actionLevels[Action.MOVE_REVERSE];
    moveX -= lastMoveOffset.x * level;
    moveY -= lastMoveOffset.y * level;
  }

  if (isEnabled(Action.MOVE_LEFT)) {
    const level = actionLevels[Action.MOVE_LEFT];
    const offset = indiv.lastMoveDir.rotate90DegCCW().asNormalizedCoord();
    moveX += offset.x * level;
    moveY += offset.y * level;
  }

  if (isEnabled(Action.MOVE_RIGHT)) {
    const level = actionLevels[Action.MOVE_RIGHT];
    const offset = indiv.lastMoveDir.rotate90DegCW().asNormalizedCoord();
    moveX += offset.x * level;
    moveY += offset.y * level;
  }

  if (isEnabled(Action.MOVE_RL)) {
    const level = actionLevels[Action.MOVE_RL];
    const offset = indiv.lastMoveDir.rotate90DegCW().asNormalizedCoord();
    moveX += offset.x * level;
    moveY += offset.y * level;
  }

  if (isEnabled(Action.MOVE_RANDOM)) {
    const level = actionLevels[Action.MOVE_RANDOM];
    const offset = Dir.random8().asNormalizedCoord();
    moveX += offset.x * level;
    moveY += offset.y * level;
  }

  // Convert accumulated sums to -1.0..1.0 and scale by responsiveness
  moveX = Math.tanh(moveX) * responsivenessAdjusted;
  moveY = Math.tanh(moveY) * responsivenessAdjusted;

  const probX = prob2bool(Math.abs(moveX)) ? 1 : 0;
  const probY = prob2bool(Math.abs(moveY)) ? 1 : 0;

  const signumX = moveX < 0.0 ? -1 : 1;
  const signumY = moveY < 0.0 ? -1 : 1;

  const movementOffset = new Coord(probX * signumX, probY * signumY);
  const newLoc = indiv.loc.add(movementOffset);

  if (grid.isInBounds(newLoc) && grid.isEmptyAt(newLoc)) {
    peeps.queueForMove(indiv.index, newLoc);
  }
}
