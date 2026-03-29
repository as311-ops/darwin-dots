// genome.ts -- Genome operations: creation, mutation, recombination, comparison
// Ported from biosim4 genome.cpp and genome-compare.cpp

import { Gene, Genome } from './types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const NEURON = 0 as const;
const SENSOR = 1 as const;
const ACTION = 1 as const;

const WEIGHT_DIVISOR = 8192.0;

// ---------------------------------------------------------------------------
// Gene <-> 32-bit integer conversion (for comparison / hashing)
// ---------------------------------------------------------------------------

/**
 * Pack a Gene into a single 32-bit unsigned integer.
 * Layout (MSB to LSB): sourceType(1) | sourceNum(7) | sinkType(1) | sinkNum(7) | weight(16)
 */
export function geneToNumber(gene: Gene): number {
  // Upper 16 bits: sourceType(1) sourceNum(7) sinkType(1) sinkNum(7)
  const upper =
    ((gene.sourceType & 1) << 15) |
    ((gene.sourceNum & 0x7f) << 8) |
    ((gene.sinkType & 1) << 7) |
    (gene.sinkNum & 0x7f);
  // Lower 16 bits: weight as uint16
  const lower = gene.weight & 0xffff;
  // Combine into a single 32-bit value. Use unsigned shift to stay positive.
  return (upper << 16) | lower;
}

/**
 * Unpack a 32-bit unsigned integer back into a Gene.
 */
export function numberToGene(n: number): Gene {
  const upper = (n >>> 16) & 0xffff;
  const lower = n & 0xffff;
  const sourceType = (upper >> 15) & 1;
  const sourceNum = (upper >> 8) & 0x7f;
  const sinkType = (upper >> 7) & 1;
  const sinkNum = upper & 0x7f;
  // Convert lower 16 bits back to signed int16
  let weight = lower;
  if (weight >= 0x8000) {
    weight -= 0x10000;
  }
  return { sourceType, sourceNum, sinkType, sinkNum, weight } as Gene;
}

// ---------------------------------------------------------------------------
// Gene weight helper
// ---------------------------------------------------------------------------

/** Convert the integer weight to a float, matching C++ Gene::weightAsFloat() */
export function weightAsFloat(gene: Gene): number {
  return gene.weight / WEIGHT_DIVISOR;
}

// ---------------------------------------------------------------------------
// Random helpers (internal)
// ---------------------------------------------------------------------------

/** Random integer in [min, max] inclusive */
function randomUint(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

/** Random float in [0, 1) */
function randomFloat(): number {
  return Math.random();
}

/** Random signed int16 weight, range -32768..32767 */
function makeRandomWeight(): number {
  const val = randomUint(0, 0xffff) - 0x8000;
  return val;
}

// ---------------------------------------------------------------------------
// Gene / Genome creation
// ---------------------------------------------------------------------------

/** Create a single gene with random fields. */
export function makeRandomGene(): Gene {
  return {
    sourceType: randomUint(0, 1),
    sourceNum: randomUint(0, 0x7f),
    sinkType: randomUint(0, 1),
    sinkNum: randomUint(0, 0x7f),
    weight: makeRandomWeight(),
  };
}

/**
 * Create a genome of `length` random genes.
 * If min/max are given, a random length in that range is used.
 */
export function makeRandomGenome(length: number): Genome;
export function makeRandomGenome(minLength: number, maxLength: number): Genome;
export function makeRandomGenome(a: number, b?: number): Genome {
  const length = b !== undefined ? randomUint(a, b) : a;
  const genome: Genome = [];
  for (let i = 0; i < length; i++) {
    genome.push(makeRandomGene());
  }
  return genome;
}

// ---------------------------------------------------------------------------
// Mutation operations
// ---------------------------------------------------------------------------

/**
 * Flip one random bit in a random gene of the genome.
 * Uses the C++ "method 1" approach: pick a random field to mutate
 * with equal 20% probability for each of sourceType, sinkType, sourceNum, sinkNum, weight.
 */
export function randomBitFlip(genome: Genome): void {
  if (genome.length === 0) return;

  const elementIndex = randomUint(0, genome.length - 1);
  const bitIndex8 = 1 << randomUint(0, 7);
  const chance = randomFloat();

  if (chance < 0.2) {
    // sourceType: flip bit 0
    genome[elementIndex].sourceType ^= 1;
  } else if (chance < 0.4) {
    // sinkType: flip bit 0
    genome[elementIndex].sinkType ^= 1;
  } else if (chance < 0.6) {
    // sourceNum: flip a random bit (0..6, masked to 7 bits)
    genome[elementIndex].sourceNum = (genome[elementIndex].sourceNum ^ bitIndex8) & 0x7f;
  } else if (chance < 0.8) {
    // sinkNum: flip a random bit (0..6, masked to 7 bits)
    genome[elementIndex].sinkNum = (genome[elementIndex].sinkNum ^ bitIndex8) & 0x7f;
  } else {
    // weight: flip a random bit 1..15 (matching C++ randomUint(1,15))
    const weightBit = 1 << randomUint(1, 15);
    let w = genome[elementIndex].weight ^ weightBit;
    // Keep in int16 range
    if (w > 32767) w -= 65536;
    if (w < -32768) w += 65536;
    genome[elementIndex].weight = w;
  }
}

/**
 * If the genome is longer than `maxLength`, trim from the front or back (50/50).
 */
export function cropLength(genome: Genome, maxLength: number): Genome {
  if (genome.length > maxLength && maxLength > 0) {
    if (randomFloat() < 0.5) {
      // trim front
      const numberToTrim = genome.length - maxLength;
      genome.splice(0, numberToTrim);
    } else {
      // trim back
      genome.splice(maxLength);
    }
  }
  return genome;
}

// ---------------------------------------------------------------------------
// Reproduction parameters interface
// ---------------------------------------------------------------------------

export interface ReproductionParams {
  sexualReproduction: boolean;
  chooseParentsByFitness: boolean;
  pointMutationRate: number;       // probability per gene
  geneInsertionDeletionRate: number;
  deletionRatio: number;           // probability of deletion vs insertion
  genomeMaxLength: number;
  maxNumberNeurons: number;
}

// ---------------------------------------------------------------------------
// Point mutations
// ---------------------------------------------------------------------------

/** Apply point mutations to a genome with probability `rate` per gene. */
function applyPointMutations(genome: Genome, rate: number): void {
  let numberOfGenes = genome.length;
  while (numberOfGenes-- > 0) {
    if (randomFloat() < rate) {
      randomBitFlip(genome);
    }
  }
}

/** Insert or delete a single gene with the given probability. */
function randomInsertDeletion(
  genome: Genome,
  insertionDeletionRate: number,
  deletionRatio: number,
  genomeMaxLength: number,
): void {
  if (randomFloat() < insertionDeletionRate) {
    if (randomFloat() < deletionRatio) {
      // deletion
      if (genome.length > 1) {
        genome.splice(randomUint(0, genome.length - 1), 1);
      }
    } else if (genome.length < genomeMaxLength) {
      // insertion (append, matching C++ behavior)
      genome.push(makeRandomGene());
    }
  }
}

// ---------------------------------------------------------------------------
// Child genome generation
// ---------------------------------------------------------------------------

/**
 * Generate a child genome from one or two parent genomes.
 * Faithful port of C++ generateChildGenome().
 */
export function generateChildGenome(
  parentGenomes: Genome[],
  params: ReproductionParams,
): Genome {
  let parent1Idx: number;
  let parent2Idx: number;

  if (params.chooseParentsByFitness && parentGenomes.length > 1) {
    parent1Idx = randomUint(1, parentGenomes.length - 1);
    parent2Idx = randomUint(0, parent1Idx - 1);
  } else {
    parent1Idx = randomUint(0, parentGenomes.length - 1);
    parent2Idx = randomUint(0, parentGenomes.length - 1);
  }

  const g1 = parentGenomes[parent1Idx];
  const g2 = parentGenomes[parent2Idx];

  if (g1.length === 0 || g2.length === 0) {
    throw new Error('Invalid genome: empty parent genome');
  }

  let genome: Genome;

  if (params.sexualReproduction) {
    // Start with the longer genome, overlay a slice from the shorter
    let gLonger: Genome;
    let gShorter: Genome;
    if (g1.length > g2.length) {
      gLonger = g1;
      gShorter = g2;
    } else {
      gLonger = g2;
      gShorter = g1;
    }

    // Deep copy the longer genome
    genome = gLonger.map((gene) => ({ ...gene }));

    // Overlay a random slice from the shorter genome
    const index0raw = randomUint(0, gShorter.length - 1);
    const index1raw = randomUint(0, gShorter.length);
    const sliceStart = Math.min(index0raw, index1raw);
    const sliceEnd = Math.max(index0raw, index1raw);
    for (let i = sliceStart; i < sliceEnd && i < genome.length; i++) {
      genome[i] = { ...gShorter[i] };
    }

    // Trim to average length of parents
    let sum = g1.length + g2.length;
    // If average is not integral, add one half the time
    if ((sum & 1) && (randomUint(0, 1) === 1)) {
      sum++;
    }
    cropLength(genome, Math.floor(sum / 2));
  } else {
    // Asexual: clone parent2
    genome = g2.map((gene) => ({ ...gene }));
  }

  randomInsertDeletion(
    genome,
    params.geneInsertionDeletionRate,
    params.deletionRatio,
    params.genomeMaxLength,
  );
  applyPointMutations(genome, params.pointMutationRate);

  return genome;
}

// ---------------------------------------------------------------------------
// Genome comparison
// ---------------------------------------------------------------------------

/** Check if two genes are identical (all fields match). */
function genesMatch(g1: Gene, g2: Gene): boolean {
  return (
    g1.sourceType === g2.sourceType &&
    g1.sourceNum === g2.sourceNum &&
    g1.sinkType === g2.sinkType &&
    g1.sinkNum === g2.sinkNum &&
    g1.weight === g2.weight
  );
}

/**
 * Jaro-Winkler distance between two genomes.
 * Returns 0.0..1.0 similarity. Tolerant of gaps, relocations, unequal lengths.
 * Ported from C++ jaro_winkler_distance().
 */
export function jaroWinklerDistance(genome1: Genome, genome2: Genome): number {
  const maxNumGenesToCompare = 20;

  const sl = Math.min(maxNumGenesToCompare, genome1.length);
  const al = Math.min(maxNumGenesToCompare, genome2.length);

  if (sl === 0 || al === 0) return 0.0;

  const s = genome1;
  const a = genome2;

  const sflags = new Array<number>(sl).fill(0);
  const aflags = new Array<number>(al).fill(0);
  const range = Math.max(0, Math.floor(Math.max(sl, al) / 2) - 1);

  let m = 0;
  let t = 0;

  // Calculate matching characters
  for (let i = 0; i < al; i++) {
    const jStart = Math.max(i - range, 0);
    const jEnd = Math.min(i + range + 1, sl);
    for (let j = jStart; j < jEnd; j++) {
      if (genesMatch(a[i], s[j]) && !sflags[j]) {
        sflags[j] = 1;
        aflags[i] = 1;
        m++;
        break;
      }
    }
  }

  if (m === 0) return 0.0;

  // Calculate character transpositions
  let l = 0;
  for (let i = 0; i < al; i++) {
    if (aflags[i] === 1) {
      let j = l;
      for (; j < sl; j++) {
        if (sflags[j] === 1) {
          l = j + 1;
          break;
        }
      }
      if (!genesMatch(a[i], s[j])) {
        t++;
      }
    }
  }
  t = Math.floor(t / 2);

  // Jaro distance
  const dw = (m / sl + m / al + (m - t) / m) / 3.0;
  return dw;
}

/**
 * Hamming distance in bits between two equal-length genomes.
 * Returns 0.0..1.0 similarity (1.0 = identical).
 * Ported from C++ hammingDistanceBits().
 */
export function hammingDistanceBits(genome1: Genome, genome2: Genome): number {
  if (genome1.length !== genome2.length) {
    throw new Error('hammingDistanceBits requires equal-length genomes');
  }
  if (genome1.length === 0) return 1.0;

  const numElements = genome1.length;
  const bitsPerElement = 32; // 1 sourceType + 7 sourceNum + 1 sinkType + 7 sinkNum + 16 weight = 32 bits
  const lengthBits = numElements * bitsPerElement;
  let bitCount = 0;

  for (let i = 0; i < numElements; i++) {
    const n1 = geneToNumber(genome1[i]);
    const n2 = geneToNumber(genome2[i]);
    let xor = (n1 ^ n2) >>> 0; // unsigned
    // popcount
    while (xor !== 0) {
      bitCount++;
      xor &= xor - 1;
    }
  }

  // Scale: for random patterns ~50% bits differ, so 2x scaling maps to 0..1 range
  return 1.0 - Math.min(1.0, (2.0 * bitCount) / lengthBits);
}

/**
 * Hamming distance in bytes (gene-level equality) between two equal-length genomes.
 * Returns 0.0..1.0 similarity.
 */
export function hammingDistanceBytes(genome1: Genome, genome2: Genome): number {
  if (genome1.length !== genome2.length) {
    throw new Error('hammingDistanceBytes requires equal-length genomes');
  }
  if (genome1.length === 0) return 1.0;

  const numElements = genome1.length;
  // In C++ this divides by lengthBytes, but each gene is treated as one uint32 comparison
  const bytesPerElement = 4; // sizeof(Gene) = 4 bytes (2 bytes bitfield + 2 bytes weight)
  const lengthBytes = numElements * bytesPerElement;
  let byteCount = 0;

  for (let i = 0; i < numElements; i++) {
    if (geneToNumber(genome1[i]) === geneToNumber(genome2[i])) {
      byteCount++;
    }
  }

  return byteCount / lengthBytes;
}

/**
 * Genome similarity, 0.0..1.0.
 * @param method 0 = Jaro-Winkler, 1 = Hamming bits, 2 = Hamming bytes
 */
export function genomeSimilarity(
  g1: Genome,
  g2: Genome,
  method: number = 0,
): number {
  switch (method) {
    case 0:
      return jaroWinklerDistance(g1, g2);
    case 1:
      return hammingDistanceBits(g1, g2);
    case 2:
      return hammingDistanceBytes(g1, g2);
    default:
      throw new Error(`Unknown genome comparison method: ${method}`);
  }
}
