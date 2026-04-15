// sensors.ts -- All 21 sensor implementations
// Ported from biosim4 getSensor.cpp

import { Indiv, Sensor, Coord, Dir, Compass } from './types';
import { Grid, visitNeighborhood } from './grid';
import { Peeps } from './peeps';
import { Signals } from './signals';
import { SimParams } from './params';
import { genomeSimilarity } from './genome';
import { randomFloat } from './random';

// Signal max matches C++ SIGNAL_MAX = UINT8_MAX = 255
const SIGNAL_MAX = 255;

// ---------------------------------------------------------------------------
// Helper: population density along an axis
// ---------------------------------------------------------------------------

function getPopulationDensityAlongAxis(
  loc: Coord,
  dir: Dir,
  grid: Grid,
  params: SimParams,
): number {
  let sum = 0.0;
  const dirVec = dir.asNormalizedCoord();
  const len = Math.sqrt(dirVec.x * dirVec.x + dirVec.y * dirVec.y);
  if (len === 0) return 0.5;
  const dirVecX = dirVec.x / len;
  const dirVecY = dirVec.y / len;

  visitNeighborhood(loc, params.populationSensorRadius, params.sizeX, params.sizeY, (tloc) => {
    if (!tloc.equals(loc) && grid.isOccupiedAt(tloc)) {
      const offset = tloc.subtract(loc);
      const proj = dirVecX * offset.x + dirVecY * offset.y;
      const contrib = proj / (offset.x * offset.x + offset.y * offset.y);
      sum += contrib;
    }
  });

  const maxSumMag = 6.0 * params.populationSensorRadius;
  let sensorVal = sum / maxSumMag; // -1.0..1.0
  sensorVal = (sensorVal + 1.0) / 2.0; // 0.0..1.0
  return sensorVal;
}

// ---------------------------------------------------------------------------
// Helper: short-range barrier distance probe
// ---------------------------------------------------------------------------

function getShortProbeBarrierDistance(
  loc0: Coord,
  dir: Dir,
  probeDistance: number,
  grid: Grid,
): number {
  const nc = dir.asNormalizedCoord();
  const dx = nc.x;
  const dy = nc.y;
  let countFwd = 0;
  let countRev = 0;
  const probe = new Coord(0, 0);

  let cx = loc0.x + dx;
  let cy = loc0.y + dy;
  let numLocsToTest = probeDistance;
  while (numLocsToTest > 0) {
    probe.x = cx;
    probe.y = cy;
    if (!grid.isInBounds(probe) || grid.isBarrierAt(probe)) break;
    countFwd++;
    cx += dx;
    cy += dy;
    numLocsToTest--;
  }
  if (numLocsToTest > 0) {
    probe.x = cx;
    probe.y = cy;
    if (!grid.isInBounds(probe)) countFwd = probeDistance;
  }

  numLocsToTest = probeDistance;
  cx = loc0.x - dx;
  cy = loc0.y - dy;
  while (numLocsToTest > 0) {
    probe.x = cx;
    probe.y = cy;
    if (!grid.isInBounds(probe) || grid.isBarrierAt(probe)) break;
    countRev++;
    cx -= dx;
    cy -= dy;
    numLocsToTest--;
  }
  if (numLocsToTest > 0) {
    probe.x = cx;
    probe.y = cy;
    if (!grid.isInBounds(probe)) countRev = probeDistance;
  }

  let sensorVal = (countFwd - countRev) + probeDistance;
  sensorVal = (sensorVal / 2.0) / probeDistance;
  return sensorVal;
}

// ---------------------------------------------------------------------------
// Helper: signal density in neighborhood
// ---------------------------------------------------------------------------

function getSignalDensity(
  layerNum: number,
  loc: Coord,
  signals: Signals,
  params: SimParams,
): number {
  let countLocs = 0;
  let sum = 0;

  visitNeighborhood(loc, params.signalSensorRadius, params.sizeX, params.sizeY, (tloc) => {
    countLocs++;
    sum += signals.getMagnitude(layerNum, tloc);
  });

  const maxSum = countLocs * SIGNAL_MAX;
  if (maxSum === 0) return 0;
  return sum / maxSum;
}

// ---------------------------------------------------------------------------
// Helper: signal density along an axis
// ---------------------------------------------------------------------------

function getSignalDensityAlongAxis(
  layerNum: number,
  loc: Coord,
  dir: Dir,
  signals: Signals,
  params: SimParams,
): number {
  let sum = 0.0;
  const dirVec = dir.asNormalizedCoord();
  const len = Math.sqrt(dirVec.x * dirVec.x + dirVec.y * dirVec.y);
  if (len === 0) return 0.5;
  const dirVecX = dirVec.x / len;
  const dirVecY = dirVec.y / len;

  visitNeighborhood(loc, params.signalSensorRadius, params.sizeX, params.sizeY, (tloc) => {
    if (!tloc.equals(loc)) {
      const offset = tloc.subtract(loc);
      const proj = dirVecX * offset.x + dirVecY * offset.y;
      const contrib =
        (proj * signals.getMagnitude(layerNum, tloc)) /
        (offset.x * offset.x + offset.y * offset.y);
      sum += contrib;
    }
  });

  const maxSumMag = 6.0 * params.signalSensorRadius * SIGNAL_MAX;
  let sensorVal = sum / maxSumMag;
  sensorVal = (sensorVal + 1.0) / 2.0;
  return sensorVal;
}

// ---------------------------------------------------------------------------
// Helper: long probe for population forward
// ---------------------------------------------------------------------------

function longProbePopulationFwd(
  loc: Coord,
  dir: Dir,
  longProbeDist: number,
  grid: Grid,
): number {
  const nc = dir.asNormalizedCoord();
  const dx = nc.x;
  const dy = nc.y;
  let count = 0;
  let cx = loc.x + dx;
  let cy = loc.y + dy;
  let numLocsToTest = longProbeDist;
  const probe = new Coord(cx, cy);

  while (numLocsToTest > 0) {
    probe.x = cx;
    probe.y = cy;
    if (!grid.isInBounds(probe) || !grid.isEmptyAt(probe)) break;
    count++;
    cx += dx;
    cy += dy;
    numLocsToTest--;
  }

  if (numLocsToTest > 0) {
    probe.x = cx;
    probe.y = cy;
    if (!grid.isInBounds(probe) || grid.isBarrierAt(probe)) {
      return longProbeDist;
    }
  }
  return count;
}

// ---------------------------------------------------------------------------
// Helper: long probe for barrier forward
// ---------------------------------------------------------------------------

function longProbeBarrierFwd(
  loc: Coord,
  dir: Dir,
  longProbeDist: number,
  grid: Grid,
): number {
  const nc = dir.asNormalizedCoord();
  const dx = nc.x;
  const dy = nc.y;
  let count = 0;
  let cx = loc.x + dx;
  let cy = loc.y + dy;
  let numLocsToTest = longProbeDist;
  const probe = new Coord(cx, cy);

  while (numLocsToTest > 0) {
    probe.x = cx;
    probe.y = cy;
    if (!grid.isInBounds(probe) || grid.isBarrierAt(probe)) break;
    count++;
    cx += dx;
    cy += dy;
    numLocsToTest--;
  }

  if (numLocsToTest > 0) {
    probe.x = cx;
    probe.y = cy;
    if (!grid.isInBounds(probe)) {
      return longProbeDist;
    }
  }
  return count;
}

// ---------------------------------------------------------------------------
// getSensor -- main entry point
// ---------------------------------------------------------------------------

export function getSensor(
  indiv: Indiv,
  sensorNum: Sensor,
  simStep: number,
  grid: Grid,
  peeps: Peeps,
  signals: Signals,
  params: SimParams,
): number {
  let sensorVal = 0.0;

  switch (sensorNum) {
    case Sensor.AGE:
      sensorVal = indiv.age / params.stepsPerGeneration;
      break;

    case Sensor.BOUNDARY_DIST: {
      const distX = Math.min(indiv.loc.x, (params.sizeX - indiv.loc.x) - 1);
      const distY = Math.min(indiv.loc.y, (params.sizeY - indiv.loc.y) - 1);
      const closest = Math.min(distX, distY);
      const maxPossible = Math.max(
        Math.floor(params.sizeX / 2) - 1,
        Math.floor(params.sizeY / 2) - 1,
      );
      sensorVal = maxPossible > 0 ? closest / maxPossible : 0;
      break;
    }

    case Sensor.BOUNDARY_DIST_X: {
      const minDistX = Math.min(indiv.loc.x, (params.sizeX - indiv.loc.x) - 1);
      sensorVal = minDistX / (params.sizeX / 2.0);
      break;
    }

    case Sensor.BOUNDARY_DIST_Y: {
      const minDistY = Math.min(indiv.loc.y, (params.sizeY - indiv.loc.y) - 1);
      sensorVal = minDistY / (params.sizeY / 2.0);
      break;
    }

    case Sensor.LAST_MOVE_DIR_X: {
      const lastX = indiv.lastMoveDir.asNormalizedCoord().x;
      sensorVal = lastX === 0 ? 0.5 : (lastX === -1 ? 0.0 : 1.0);
      break;
    }

    case Sensor.LAST_MOVE_DIR_Y: {
      const lastY = indiv.lastMoveDir.asNormalizedCoord().y;
      sensorVal = lastY === 0 ? 0.5 : (lastY === -1 ? 0.0 : 1.0);
      break;
    }

    case Sensor.LOC_X:
      sensorVal = params.sizeX > 1 ? indiv.loc.x / (params.sizeX - 1) : 0.5;
      break;

    case Sensor.LOC_Y:
      sensorVal = params.sizeY > 1 ? indiv.loc.y / (params.sizeY - 1) : 0.5;
      break;

    case Sensor.OSC1: {
      const phase = (simStep % indiv.oscPeriod) / indiv.oscPeriod;
      let factor = -Math.cos(phase * 2.0 * Math.PI);
      factor = (factor + 1.0) / 2.0;
      sensorVal = Math.min(1.0, Math.max(0.0, factor));
      break;
    }

    case Sensor.LONGPROBE_POP_FWD:
      sensorVal =
        longProbePopulationFwd(indiv.loc, indiv.lastMoveDir, indiv.longProbeDist, grid) /
        indiv.longProbeDist;
      break;

    case Sensor.LONGPROBE_BAR_FWD:
      sensorVal =
        longProbeBarrierFwd(indiv.loc, indiv.lastMoveDir, indiv.longProbeDist, grid) /
        indiv.longProbeDist;
      break;

    case Sensor.POPULATION: {
      let countLocs = 0;
      let countOccupied = 0;
      visitNeighborhood(indiv.loc, params.populationSensorRadius, params.sizeX, params.sizeY, (tloc) => {
        countLocs++;
        if (grid.isOccupiedAt(tloc)) countOccupied++;
      });
      sensorVal = countLocs > 0 ? countOccupied / countLocs : 0;
      break;
    }

    case Sensor.POPULATION_FWD:
      sensorVal = getPopulationDensityAlongAxis(indiv.loc, indiv.lastMoveDir, grid, params);
      break;

    case Sensor.POPULATION_LR:
      sensorVal = getPopulationDensityAlongAxis(indiv.loc, indiv.lastMoveDir.rotate90DegCW(), grid, params);
      break;

    case Sensor.BARRIER_FWD:
      sensorVal = getShortProbeBarrierDistance(indiv.loc, indiv.lastMoveDir, params.shortProbeBarrierDistance, grid);
      break;

    case Sensor.BARRIER_LR:
      sensorVal = getShortProbeBarrierDistance(indiv.loc, indiv.lastMoveDir.rotate90DegCW(), params.shortProbeBarrierDistance, grid);
      break;

    case Sensor.RANDOM:
      sensorVal = randomFloat();
      break;

    case Sensor.SIGNAL0:
      sensorVal = getSignalDensity(0, indiv.loc, signals, params);
      break;

    case Sensor.SIGNAL0_FWD:
      sensorVal = getSignalDensityAlongAxis(0, indiv.loc, indiv.lastMoveDir, signals, params);
      break;

    case Sensor.SIGNAL0_LR:
      sensorVal = getSignalDensityAlongAxis(0, indiv.loc, indiv.lastMoveDir.rotate90DegCW(), signals, params);
      break;

    case Sensor.GENETIC_SIM_FWD: {
      const loc2 = indiv.loc.add(indiv.lastMoveDir);
      if (grid.isInBounds(loc2) && grid.isOccupiedAt(loc2)) {
        const indiv2 = peeps.getIndivAt(loc2, grid);
        if (indiv2.alive) {
          sensorVal = genomeSimilarity(indiv.genome, indiv2.genome);
        }
      }
      break;
    }

    default:
      break;
  }

  if (isNaN(sensorVal) || sensorVal < 0.0) sensorVal = 0.0;
  else if (sensorVal > 1.0) sensorVal = 1.0;

  return sensorVal;
}
