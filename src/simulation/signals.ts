// signals.ts -- Pheromone signal layers
// Ported from biosim4: signals.h, signals.cpp

import { Coord } from './types';
import { visitNeighborhood } from './grid';

const SIGNAL_MIN = 0.0;
const SIGNAL_MAX = 255.0; // equivalent to UINT8_MAX in C++

/**
 * Signals manages layered pheromone data over the 2D grid.
 * Uses Float32Array for better precision than uint8 while keeping good performance.
 * Layout: data[layer * sizeX * sizeY + x * sizeY + y]
 */
export class Signals {
  private data!: Float32Array;
  private _numLayers: number = 0;
  private _sizeX: number = 0;
  private _sizeY: number = 0;

  get numLayers(): number {
    return this._numLayers;
  }

  get sizeX(): number {
    return this._sizeX;
  }

  get sizeY(): number {
    return this._sizeY;
  }

  /**
   * Initialize the signal layers. All values start at 0.
   */
  init(layers: number, sizeX: number, sizeY: number): void {
    this._numLayers = layers;
    this._sizeX = sizeX;
    this._sizeY = sizeY;
    this.data = new Float32Array(layers * sizeX * sizeY);
  }

  private index(layer: number, x: number, y: number): number {
    return layer * this._sizeX * this._sizeY + x * this._sizeY + y;
  }

  /**
   * Get the signal magnitude at the given layer and location.
   */
  getMagnitude(layer: number, loc: Coord): number {
    return this.data[this.index(layer, loc.x, loc.y)];
  }

  /**
   * Get signal magnitude by raw x/y coordinates (avoids Coord allocation).
   */
  getMagnitudeXY(layer: number, x: number, y: number): number {
    return this.data[this.index(layer, x, y)];
  }

  private getAt(layer: number, x: number, y: number): number {
    return this.data[this.index(layer, x, y)];
  }

  private setAt(layer: number, x: number, y: number, val: number): void {
    this.data[this.index(layer, x, y)] = val;
  }

  /**
   * Increase signal at the given location and its neighborhood.
   * Center gets +2, neighbors get +1 (matching C++ constants).
   */
  increment(layer: number, loc: Coord): void {
    const radius = 1.5;
    const centerIncreaseAmount = 2;
    const neighborIncreaseAmount = 1;

    visitNeighborhood(loc, radius, this._sizeX, this._sizeY, (nloc: Coord) => {
      const idx = this.index(layer, nloc.x, nloc.y);
      if (this.data[idx] < SIGNAL_MAX) {
        this.data[idx] = Math.min(SIGNAL_MAX, this.data[idx] + neighborIncreaseAmount);
      }
    });

    // Additional center boost
    const centerIdx = this.index(layer, loc.x, loc.y);
    if (this.data[centerIdx] < SIGNAL_MAX) {
      this.data[centerIdx] = Math.min(SIGNAL_MAX, this.data[centerIdx] + centerIncreaseAmount);
    }
  }

  /**
   * Zero-fill all layers.
   */
  zeroFill(): void {
    this.data.fill(0);
  }

  /**
   * Fade signal values in the specified layer by subtracting fadeAmount (default 1).
   * Values that would go below 0 are clamped to 0.
   */
  fade(layer: number): void {
    const fadeAmount = 1;
    const layerOffset = layer * this._sizeX * this._sizeY;
    const layerSize = this._sizeX * this._sizeY;

    for (let i = 0; i < layerSize; i++) {
      const idx = layerOffset + i;
      if (this.data[idx] >= fadeAmount) {
        this.data[idx] -= fadeAmount;
      } else {
        this.data[idx] = 0;
      }
    }
  }
}
