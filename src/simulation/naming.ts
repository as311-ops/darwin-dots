// naming.ts -- Genome-based creature naming with syllable inheritance

import type { Gene, Genome } from './types';

// Consonant-vowel syllable tables for pronounceable names
const ONSETS = [
  'K', 'Z', 'N', 'R', 'T', 'M', 'L', 'S',
  'V', 'D', 'B', 'F', 'G', 'P', 'X', 'J',
  'Kr', 'Zr', 'Tr', 'Br', 'Dr', 'Fr', 'Gr', 'Pr',
  'Sh', 'Th', 'Ch', 'Sk', 'St', 'Fl', 'Gl', 'Bl',
];

const VOWELS = [
  'a', 'e', 'i', 'o', 'u',
  'ai', 'ei', 'ou', 'au',
  'a', 'o', 'i', 'u', 'e', 'a', 'o', 'i',
];

const CODAS = [
  '', '', '', '', // many open syllables
  'n', 'r', 'x', 's', 'k', 'l', 'm', 'th',
  'ra', 'na', 'ri', 'no', 'lu', 'ki',
];

/**
 * Generate a name from a genome. The name is deterministic —
 * the same genome always produces the same name.
 *
 * Uses the first 4 genes to pick 2 syllables:
 * - Gene 0+1 → first syllable (onset + vowel + coda)
 * - Gene 2+3 → second syllable
 *
 * This means:
 * - Identical genomes → identical names
 * - Similar genomes (same first genes) → similar names
 * - Sexual reproduction mixes parental genes → mixes name syllables
 * - Point mutations slightly alter the name
 */
export function nameFromGenome(genome: Genome): string {
  if (genome.length === 0) return 'Nix';
  if (genome.length === 1) return syllable(genome[0], genome[0]);

  const syl1 = syllable(genome[0], genome.length > 1 ? genome[1] : genome[0]);
  const syl2 = genome.length > 2
    ? syllable(genome[2], genome.length > 3 ? genome[3] : genome[2])
    : syllable(genome[1], genome[0]);

  // Capitalize first letter, lowercase rest
  const name = syl1 + syl2;
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}

function syllable(g1: Gene, g2: Gene): string {
  const onset = ONSETS[((g1.sourceNum + g1.sourceType * 17) ^ g2.sinkNum) & 31];
  const vowel = VOWELS[((g1.sinkNum + g1.weight) ^ g2.sourceNum) & 15];
  const coda = CODAS[((g2.sinkType * 7 + g2.weight) ^ g1.sourceType) & 15];
  return onset + vowel + coda;
}

/**
 * Short version: first syllable only (for dense displays).
 */
export function shortNameFromGenome(genome: Genome): string {
  if (genome.length === 0) return 'Nix';
  const syl = syllable(genome[0], genome.length > 1 ? genome[1] : genome[0]);
  return syl.charAt(0).toUpperCase() + syl.slice(1).toLowerCase();
}

/**
 * Clan name: derived from the dominant neural pathway.
 * Creatures with the same top connection pattern share a clan.
 */
export function clanFromGenome(genome: Genome): string {
  if (genome.length < 2) return '?';
  // Use genes at positions 0 and 1 for clan identity
  const g = genome[0];
  const onset = ONSETS[(g.sourceNum + g.sinkNum) & 31];
  const vowel = VOWELS[(g.sourceType * 8 + g.sinkType * 4 + (g.weight > 0 ? 1 : 0)) & 15];
  const clan = onset + vowel;
  return clan.charAt(0).toUpperCase() + clan.slice(1).toLowerCase();
}
