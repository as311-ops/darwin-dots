// challenge-overlay.ts -- Visual shapes for survival zone overlays
// Defines what to draw on the canvas to show WHERE agents need to be

import { Challenge } from './types';

export type OverlayShape =
  | { type: 'circle'; cx: number; cy: number; radius: number }
  | { type: 'rect'; x: number; y: number; w: number; h: number }
  | { type: 'border'; thickness: number }
  | { type: 'radioactive'; step: number; maxSteps: number };

export function getChallengeOverlay(
  challenge: number,
  sizeX: number,
  sizeY: number,
  simStep?: number,
  stepsPerGeneration?: number,
): OverlayShape[] {
  switch (challenge as Challenge) {
    case Challenge.CHALLENGE_CIRCLE:
      return [{
        type: 'circle',
        cx: Math.floor(sizeX / 4),
        cy: Math.floor(sizeY / 4),
        radius: sizeX / 4,
      }];

    case Challenge.CHALLENGE_RIGHT_HALF:
      return [{
        type: 'rect',
        x: Math.floor(sizeX / 2),
        y: 0,
        w: sizeX - Math.floor(sizeX / 2),
        h: sizeY,
      }];

    case Challenge.CHALLENGE_RIGHT_QUARTER:
      return [{
        type: 'rect',
        x: Math.floor(sizeX / 2) + Math.floor(sizeX / 4),
        y: 0,
        w: sizeX - Math.floor(sizeX / 2) - Math.floor(sizeX / 4),
        h: sizeY,
      }];

    case Challenge.CHALLENGE_CENTER_WEIGHTED:
    case Challenge.CHALLENGE_CENTER_UNWEIGHTED:
      return [{
        type: 'circle',
        cx: Math.floor(sizeX / 2),
        cy: Math.floor(sizeY / 2),
        radius: sizeX / 3,
      }];

    case Challenge.CHALLENGE_CORNER: {
      const r = sizeX / 8;
      return [
        { type: 'circle', cx: 0, cy: 0, radius: r },
        { type: 'circle', cx: sizeX - 1, cy: 0, radius: r },
        { type: 'circle', cx: 0, cy: sizeY - 1, radius: r },
        { type: 'circle', cx: sizeX - 1, cy: sizeY - 1, radius: r },
      ];
    }

    case Challenge.CHALLENGE_CORNER_WEIGHTED: {
      const r = sizeX / 4;
      return [
        { type: 'circle', cx: 0, cy: 0, radius: r },
        { type: 'circle', cx: sizeX - 1, cy: 0, radius: r },
        { type: 'circle', cx: 0, cy: sizeY - 1, radius: r },
        { type: 'circle', cx: sizeX - 1, cy: sizeY - 1, radius: r },
      ];
    }

    case Challenge.CHALLENGE_CENTER_SPARSE:
      return [{
        type: 'circle',
        cx: Math.floor(sizeX / 2),
        cy: Math.floor(sizeY / 2),
        radius: sizeX / 4,
      }];

    case Challenge.CHALLENGE_LEFT_EIGHTH:
      return [{
        type: 'rect',
        x: 0,
        y: 0,
        w: Math.floor(sizeX / 8),
        h: sizeY,
      }];

    case Challenge.CHALLENGE_RADIOACTIVE_WALLS:
      return [{
        type: 'radioactive',
        step: simStep ?? 0,
        maxSteps: stepsPerGeneration ?? 300,
      }];

    case Challenge.CHALLENGE_AGAINST_ANY_WALL:
    case Challenge.CHALLENGE_TOUCH_ANY_WALL:
      return [{ type: 'border', thickness: 1 }];

    case Challenge.CHALLENGE_EAST_WEST_EIGHTHS: {
      const eighth = Math.floor(sizeX / 8);
      return [
        { type: 'rect', x: 0, y: 0, w: eighth, h: sizeY },
        { type: 'rect', x: sizeX - eighth, y: 0, w: eighth, h: sizeY },
      ];
    }

    case Challenge.CHALLENGE_ALTRUISM:
      return [{
        type: 'circle',
        cx: Math.floor(sizeX / 4),
        cy: Math.floor(sizeY / 4),
        radius: sizeX / 4,
      }];

    default:
      return [];
  }
}
