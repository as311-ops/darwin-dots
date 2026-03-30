import type { Gene, Genome } from './types';

function toBase64Url(binary: string): string {
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(encoded: string): string {
  let b64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const pad = (4 - (b64.length % 4)) % 4;
  b64 += '='.repeat(pad);
  return atob(b64);
}

/** Encode a genome to a URL-safe base64 string */
export function encodeGenome(genome: Genome): string {
  const bytes = new Uint8Array(genome.length * 4);
  for (let i = 0; i < genome.length; i++) {
    const g = genome[i];
    const offset = i * 4;
    bytes[offset] = ((g.sourceType & 1) << 7) | (g.sourceNum & 0x7f);
    bytes[offset + 1] = ((g.sinkType & 1) << 7) | (g.sinkNum & 0x7f);
    const unsigned = (g.weight + 0x8000) & 0xffff;
    bytes[offset + 2] = (unsigned >> 8) & 0xff;
    bytes[offset + 3] = unsigned & 0xff;
  }
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return toBase64Url(binary);
}

/** Decode a genome from a URL-safe base64 string. Returns null if invalid. */
export function decodeGenome(encoded: string): Genome | null {
  let binary: string;
  try {
    binary = fromBase64Url(encoded);
  } catch {
    return null;
  }
  if (binary.length === 0 || binary.length % 4 !== 0) {
    return null;
  }
  const geneCount = binary.length / 4;
  const genome: Genome = [];
  for (let i = 0; i < geneCount; i++) {
    const offset = i * 4;
    const b0 = binary.charCodeAt(offset);
    const b1 = binary.charCodeAt(offset + 1);
    const b2 = binary.charCodeAt(offset + 2);
    const b3 = binary.charCodeAt(offset + 3);
    const unsigned = (b2 << 8) | b3;
    const weight = unsigned - 0x8000;
    const gene: Gene = {
      sourceType: (b0 >> 7) & 1,
      sourceNum: b0 & 0x7f,
      sinkType: (b1 >> 7) & 1,
      sinkNum: b1 & 0x7f,
      weight,
    };
    genome.push(gene);
  }
  return genome;
}

const HASH_PREFIX = 'genome=';

/** Read genome from current URL hash. Returns null if no genome in hash. */
export function genomeFromHash(): Genome | null {
  const hash = window.location.hash.replace(/^#/, '');
  if (!hash.startsWith(HASH_PREFIX)) {
    return null;
  }
  const encoded = hash.slice(HASH_PREFIX.length);
  if (!encoded) {
    return null;
  }
  return decodeGenome(encoded);
}

/** Write genome to URL hash without triggering navigation */
export function genomeToHash(genome: Genome): void {
  const encoded = encodeGenome(genome);
  const newHash = '#' + HASH_PREFIX + encoded;
  history.replaceState(null, '', newHash);
}

/** Build a full shareable URL with the genome hash */
export function genomeShareUrl(genome: Genome): string {
  const encoded = encodeGenome(genome);
  const url = new URL(window.location.href);
  url.hash = HASH_PREFIX + encoded;
  return url.toString();
}

/** Clear genome from URL hash */
export function clearGenomeHash(): void {
  history.replaceState(null, '', window.location.pathname + window.location.search);
}
