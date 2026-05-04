// survival.ts -- Survival criteria for all challenge types
// Ported from biosim4: survival-criteria.cpp

import { Coord, type Indiv, Challenge } from './types';
import type { Grid } from './grid';
import { visitNeighborhood } from './grid';

// ---------------------------------------------------------------------------
// Result type
// ---------------------------------------------------------------------------

export interface SurvivalResult {
  passed: boolean;
  score: number; // 0.0..1.0
}

// ---------------------------------------------------------------------------
// Params subset needed by survival criteria
// ---------------------------------------------------------------------------

export interface SurvivalParams {
  sizeX: number;
  sizeY: number;
  challenge: Challenge;
  stepsPerGeneration: number;
}

// ---------------------------------------------------------------------------
// passedSurvivalCriterion
// ---------------------------------------------------------------------------

/**
 * Evaluate whether an individual passes the survival criterion for the
 * given challenge. Returns { passed, score } where score is 0.0..1.0.
 * Faithful port of C++ passedSurvivalCriterion().
 *
 * Note: The C++ uses different numeric challenge values than the TS enum.
 * The TS Challenge enum has been renumbered sequentially 0..18, so we
 * match on enum names, not on the C++ numeric constants.
 */
export function passedSurvivalCriterion(
  indiv: Indiv,
  challenge: Challenge,
  params: SurvivalParams,
  grid: Grid,
): SurvivalResult {
  if (!indiv.alive) {
    return { passed: false, score: 0.0 };
  }

  switch (challenge) {
    // Survivors are those inside the circular area defined by safeCenter and radius
    case Challenge.CHALLENGE_CIRCLE: {
      const safeCenter = new Coord(
        Math.floor(params.sizeX / 4.0),
        Math.floor(params.sizeY / 4.0),
      );
      const radius = params.sizeX / 4.0;
      const offset = safeCenter.subtract(indiv.loc);
      const distance = offset.length();
      if (distance <= radius) {
        return { passed: true, score: (radius - distance) / radius };
      }
      return { passed: false, score: 0.0 };
    }

    // Survivors are all those on the right side of the arena
    case Challenge.CHALLENGE_RIGHT_HALF:
      if (indiv.loc.x > Math.floor(params.sizeX / 2)) {
        return { passed: true, score: 1.0 };
      }
      return { passed: false, score: 0.0 };

    // Survivors are all those on the right quarter of the arena
    case Challenge.CHALLENGE_RIGHT_QUARTER:
      if (indiv.loc.x > Math.floor(params.sizeX / 2) + Math.floor(params.sizeX / 4)) {
        return { passed: true, score: 1.0 };
      }
      return { passed: false, score: 0.0 };

    // Survivors are those not touching the border and with the specified
    // number of neighbors (including self) within a given radius
    case Challenge.CHALLENGE_STRING: {
      const minNeighbors = 22;
      const maxNeighbors = 2;
      const radius = 1.5;

      if (grid.isBorder(indiv.loc)) {
        return { passed: false, score: 0.0 };
      }

      let count = 0;
      visitNeighborhood(indiv.loc, radius, params.sizeX, params.sizeY, (loc2: Coord) => {
        if (grid.isOccupiedAt(loc2)) count++;
      });
      if (count >= minNeighbors && count <= maxNeighbors) {
        return { passed: true, score: 1.0 };
      }
      return { passed: false, score: 0.0 };
    }

    // Survivors are those within the specified radius of the center.
    // Score is linearly weighted by distance from center.
    case Challenge.CHALLENGE_CENTER_WEIGHTED: {
      const safeCenter = new Coord(
        Math.floor(params.sizeX / 2.0),
        Math.floor(params.sizeY / 2.0),
      );
      const radius = params.sizeX / 3.0;
      const offset = safeCenter.subtract(indiv.loc);
      const distance = offset.length();
      if (distance <= radius) {
        return { passed: true, score: (radius - distance) / radius };
      }
      return { passed: false, score: 0.0 };
    }

    // Survivors are those within the specified radius of the center (unweighted)
    case Challenge.CHALLENGE_CENTER_UNWEIGHTED: {
      const safeCenter = new Coord(
        Math.floor(params.sizeX / 2.0),
        Math.floor(params.sizeY / 2.0),
      );
      const radius = params.sizeX / 3.0;
      const offset = safeCenter.subtract(indiv.loc);
      const distance = offset.length();
      if (distance <= radius) {
        return { passed: true, score: 1.0 };
      }
      return { passed: false, score: 0.0 };
    }

    // Survivors are those within the specified radius of any corner
    case Challenge.CHALLENGE_CORNER: {
      const radius = params.sizeX / 8.0;

      const corners = [
        new Coord(0, 0),
        new Coord(0, params.sizeY - 1),
        new Coord(params.sizeX - 1, 0),
        new Coord(params.sizeX - 1, params.sizeY - 1),
      ];

      for (const corner of corners) {
        const distance = corner.subtract(indiv.loc).length();
        if (distance <= radius) {
          return { passed: true, score: 1.0 };
        }
      }
      return { passed: false, score: 0.0 };
    }

    // Survivors are those within the specified radius of any corner,
    // weighted by distance from corner point
    case Challenge.CHALLENGE_CORNER_WEIGHTED: {
      const radius = params.sizeX / 4.0;

      const corners = [
        new Coord(0, 0),
        new Coord(0, params.sizeY - 1),
        new Coord(params.sizeX - 1, 0),
        new Coord(params.sizeX - 1, params.sizeY - 1),
      ];

      for (const corner of corners) {
        const distance = corner.subtract(indiv.loc).length();
        if (distance <= radius) {
          return { passed: true, score: (radius - distance) / radius };
        }
      }
      return { passed: false, score: 0.0 };
    }

    // Everybody survives, scored by how far they migrated from birth
    case Challenge.CHALLENGE_MIGRATE_DISTANCE: {
      const distance = indiv.loc.subtract(indiv.birthLoc).length();
      const normalizedDistance = distance / Math.max(params.sizeX, params.sizeY);
      return { passed: true, score: normalizedDistance };
    }

    // Survivors are those within the outer radius of center with the right
    // number of neighbors (penalizes crowding)
    case Challenge.CHALLENGE_CENTER_SPARSE: {
      const safeCenter = new Coord(
        Math.floor(params.sizeX / 2.0),
        Math.floor(params.sizeY / 2.0),
      );
      const outerRadius = params.sizeX / 4.0;
      const innerRadius = 1.5;
      const minNeighbors = 5; // includes self
      const maxNeighbors = 8;

      const offset = safeCenter.subtract(indiv.loc);
      const distance = offset.length();
      if (distance <= outerRadius) {
        let count = 0;
        visitNeighborhood(indiv.loc, innerRadius, params.sizeX, params.sizeY, (loc2: Coord) => {
          if (grid.isOccupiedAt(loc2)) count++;
        });
        if (count >= minNeighbors && count <= maxNeighbors) {
          return { passed: true, score: 1.0 };
        }
      }
      return { passed: false, score: 0.0 };
    }

    // Survivors are all those on the left eighth of the arena
    case Challenge.CHALLENGE_LEFT_EIGHTH:
      if (indiv.loc.x < Math.floor(params.sizeX / 8)) {
        return { passed: true, score: 1.0 };
      }
      return { passed: false, score: 0.0 };

    // Radioactive walls: handled in endOfSimStep. All remaining alive become parents.
    case Challenge.CHALLENGE_RADIOACTIVE_WALLS:
      return { passed: true, score: 1.0 };

    // Survivors are those touching any wall at end of generation
    case Challenge.CHALLENGE_AGAINST_ANY_WALL: {
      const onEdge =
        indiv.loc.x === 0 ||
        indiv.loc.x === params.sizeX - 1 ||
        indiv.loc.y === 0 ||
        indiv.loc.y === params.sizeY - 1;
      if (onEdge) {
        return { passed: true, score: 1.0 };
      }
      return { passed: false, score: 0.0 };
    }

    // Survivors are those who touched a wall at any time during their life
    // (challengeBits is set in endOfSimStep)
    case Challenge.CHALLENGE_TOUCH_ANY_WALL:
      if (indiv.challengeBits !== 0) {
        return { passed: true, score: 1.0 };
      }
      return { passed: false, score: 0.0 };

    // Survivors are all those on the left or right eighths of the arena
    case Challenge.CHALLENGE_EAST_WEST_EIGHTHS:
      if (
        indiv.loc.x < Math.floor(params.sizeX / 8) ||
        indiv.loc.x >= params.sizeX - Math.floor(params.sizeX / 8)
      ) {
        return { passed: true, score: 1.0 };
      }
      return { passed: false, score: 0.0 };

    // Survivors are those within radius of any barrier center, weighted by distance
    case Challenge.CHALLENGE_NEAR_BARRIER: {
      const radius = params.sizeX / 2;
      const barrierCenters = grid.barrierCenters;
      let minDistance = 1e8;
      for (const center of barrierCenters) {
        const distance = indiv.loc.subtract(center).length();
        if (distance < minDistance) {
          minDistance = distance;
        }
      }
      if (minDistance <= radius) {
        return { passed: true, score: 1.0 - minDistance / radius };
      }
      return { passed: false, score: 0.0 };
    }

    // Survivors are those not touching a border and with exactly one neighbor
    // which has no other neighbor
    case Challenge.CHALLENGE_PAIRS: {
      const onEdge =
        indiv.loc.x === 0 ||
        indiv.loc.x === params.sizeX - 1 ||
        indiv.loc.y === 0 ||
        indiv.loc.y === params.sizeY - 1;

      if (onEdge) {
        return { passed: false, score: 0.0 };
      }

      let count = 0;
      for (let x = indiv.loc.x - 1; x <= indiv.loc.x + 1; ++x) {
        for (let y = indiv.loc.y - 1; y <= indiv.loc.y + 1; ++y) {
          const tloc = new Coord(x, y);
          if (!tloc.equals(indiv.loc) && grid.isInBounds(tloc) && grid.isOccupiedAt(tloc)) {
            ++count;
            if (count === 1) {
              // Check that this neighbor has no other neighbors besides us
              for (let x1 = tloc.x - 1; x1 <= tloc.x + 1; ++x1) {
                for (let y1 = tloc.y - 1; y1 <= tloc.y + 1; ++y1) {
                  const tloc1 = new Coord(x1, y1);
                  if (
                    !tloc1.equals(tloc) &&
                    !tloc1.equals(indiv.loc) &&
                    grid.isInBounds(tloc1) &&
                    grid.isOccupiedAt(tloc1)
                  ) {
                    return { passed: false, score: 0.0 };
                  }
                }
              }
            } else {
              return { passed: false, score: 0.0 };
            }
          }
        }
      }
      if (count === 1) {
        return { passed: true, score: 1.0 };
      }
      return { passed: false, score: 0.0 };
    }

    // Survivors are those that contacted locations in a sequence,
    // ranked by the number of locations contacted
    case Challenge.CHALLENGE_LOCATION_SEQUENCE: {
      let count = 0;
      const bits = indiv.challengeBits;
      const maxNumberOfBits = 32; // sizeof(unsigned) * 8

      for (let n = 0; n < maxNumberOfBits; ++n) {
        if ((bits & (1 << n)) !== 0) {
          ++count;
        }
      }
      if (count > 0) {
        return { passed: true, score: count / maxNumberOfBits };
      }
      return { passed: false, score: 0.0 };
    }

    // Altruism: survivors are those inside the circular area near SW corner
    case Challenge.CHALLENGE_ALTRUISM: {
      const safeCenter = new Coord(
        Math.floor(params.sizeX / 4.0),
        Math.floor(params.sizeY / 4.0),
      );
      const radius = params.sizeX / 4.0;
      const offset = safeCenter.subtract(indiv.loc);
      const distance = offset.length();
      if (distance <= radius) {
        return { passed: true, score: (radius - distance) / radius };
      }
      return { passed: false, score: 0.0 };
    }

    // Survivors are those who spent the most time inside the oscillating safe zone.
    // Score = ticks_in_zone / stepsPerGeneration. challengeBits stores the tick count (low 16 bits).
    case Challenge.CHALLENGE_THE_TIDE: {
      const ticksInZone = indiv.challengeBits & 0xFFFF;
      const score = ticksInZone / params.stepsPerGeneration;
      if (score > 0.3) {
        return { passed: true, score };
      }
      return { passed: false, score: 0.0 };
    }

    // All alive creatures pass; score = base (0.4) + kill bonus (up to 0.6).
    // challengeBits low 8 bits = kill count (capped at 255).
    case Challenge.CHALLENGE_HUNT_OR_HIDE: {
      const kills = indiv.challengeBits & 0xFF;
      const score = 0.4 + Math.min(0.6, kills * 0.15);
      return { passed: true, score };
    }

    // Survivors reached at least 2 of 3 zones in time.
    // challengeBits: bit 0 = phase 1 reached, bit 1 = phase 2, bit 2 = phase 3.
    case Challenge.CHALLENGE_HOT_POTATO: {
      const bits = indiv.challengeBits & 0b111;
      const phases = [0, 1, 2].filter(i => (bits >> i) & 1).length;
      const score = phases / 3.0;
      if (phases >= 2) {
        return { passed: true, score };
      }
      return { passed: false, score: 0.0 };
    }

    // Survivor visited the NE checkpoint AND returned near birthLoc.
    // challengeBits bit 0 = checkpoint visited.
    case Challenge.CHALLENGE_BOOMERANG: {
      const visited = (indiv.challengeBits & 1) !== 0;
      if (!visited) {
        return { passed: false, score: 0.0 };
      }
      const returnRadius = params.sizeX / 6;
      const dist = indiv.loc.subtract(indiv.birthLoc).length();
      if (dist < returnRadius) {
        return { passed: true, score: Math.max(0, 1.0 - dist / returnRadius) };
      }
      return { passed: false, score: 0.0 };
    }

    default:
      throw new Error(`Unknown challenge type: ${challenge}`);
  }
}

// ---------------------------------------------------------------------------
// Altruism sacrifice criterion (separate, as in C++)
// ---------------------------------------------------------------------------

/**
 * Check whether an individual is within the sacrificial area (NE corner)
 * for the altruism challenge. This is a separate criterion from the main
 * survival check.
 */
export function passedAltruismSacrificeCriterion(
  indiv: Indiv,
  params: SurvivalParams,
): SurvivalResult {
  if (!indiv.alive) {
    return { passed: false, score: 0.0 };
  }

  const radius = params.sizeX / 4.0;
  const sacrificeCenter = new Coord(
    params.sizeX - Math.floor(params.sizeX / 4),
    params.sizeY - Math.floor(params.sizeY / 4),
  );
  const distance = sacrificeCenter.subtract(indiv.loc).length();
  if (distance <= radius) {
    return { passed: true, score: (radius - distance) / radius };
  }
  return { passed: false, score: 0.0 };
}
