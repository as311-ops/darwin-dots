// commentary.ts -- Sports-style live commentary for the evolution simulation

import type { GenomeProfile, ConnectionProfile } from './genome-profile';
import { humanLabel, connectionDescription } from './labels';

export interface CommentaryInput {
  generation: number;
  survivors: number;
  population: number;
  diversity: number;
  genomeProfile: GenomeProfile | null;
  prevSurvivors: number;
  prevDiversity: number;
  prevProfile: GenomeProfile | null;
  challengeName: string;
}

export interface CommentaryLine {
  text: string;
  type: 'hype' | 'analysis' | 'concern' | 'milestone';
  generation: number;
}

export function generateCommentary(input: CommentaryInput): CommentaryLine[] {
  const lines: CommentaryLine[] = [];
  const {
    generation, survivors, population, diversity,
    genomeProfile, prevSurvivors, prevDiversity, prevProfile, challengeName,
  } = input;

  const rate = population > 0 ? survivors / population : 0;
  const prevRate = population > 0 ? prevSurvivors / population : 0;
  const rateChange = rate - prevRate;
  const diversityChange = diversity - prevDiversity;

  // --- Generation milestones ---
  if (generation === 1) {
    lines.push({
      text: `Welcome to the ${challengeName} Challenge! ${population} Darwin-Dots are lining up at the start. Who will make it to the goal zone?`,
      type: 'hype',
      generation,
    });
  } else if (generation % 50 === 0) {
    lines.push({
      text: `Generation ${generation}! ${survivors} out of ${population} made it — a survival rate of ${pct(rate)}.`,
      type: 'milestone',
      generation,
    });
  }

  // --- Survival rate commentary ---
  if (generation > 1) {
    if (rateChange > 0.15) {
      lines.push({
        text: pick([
          `UNBELIEVABLE! The survival rate is skyrocketing — from ${pct(prevRate)} to ${pct(rate)}! Evolution just shifted into high gear!`,
          `What a leap! ${pct(rate)} survivors! The training is paying off — the Darwin-Dots have learned something crucial!`,
          `BREAKTHROUGH in generation ${generation}! ${survivors} survivors — that's a new record for this population!`,
        ]),
        type: 'hype',
        generation,
      });
    } else if (rateChange > 0.05) {
      lines.push({
        text: pick([
          `Solid improvement! ${pct(rate)} are making it through — the trend is pointing upward.`,
          `The population is getting stronger. ${survivors} survivors, that's ${Math.round(rateChange * population)} more than last generation.`,
        ]),
        type: 'analysis',
        generation,
      });
    } else if (rateChange < -0.1) {
      lines.push({
        text: pick([
          `Ouch! The survival rate drops to ${pct(rate)}. Were the mutations too aggressive?`,
          `Setback! Only ${survivors} survivors left. This generation just doesn't have it.`,
          `That hurts — down from ${pct(prevRate)} to ${pct(rate)}. Sometimes evolution takes a step backward.`,
        ]),
        type: 'concern',
        generation,
      });
    } else if (survivors === 0) {
      lines.push({
        text: pick([
          `TOTAL WIPEOUT! Zero survivors! The population gets completely reshuffled. Back to square one!`,
          `Complete reset — nobody beat the challenge. Evolution is brutal.`,
        ]),
        type: 'concern',
        generation,
      });
    }
  }

  // --- Genome analysis ---
  if (genomeProfile && genomeProfile.topConnections.length > 0) {
    const top = genomeProfile.topConnections[0];

    // New dominant connection appeared
    if (prevProfile) {
      const prevTop = prevProfile.topConnections[0];
      if (prevTop && (top.from !== prevTop.from || top.to !== prevTop.to)) {
        lines.push({
          text: `Tactical shift! The most common connection is now ${connDesc(top)} — previously it was ${connDesc(prevTop)}.`,
          type: 'analysis',
          generation,
        });
      } else if (top.frequency > 0.7 && (!prevTop || prevTop.frequency < 0.7)) {
        lines.push({
          text: `${pct(top.frequency)} of survivors are using ${connDesc(top)} — that's practically a herd mentality!`,
          type: 'analysis',
          generation,
        });
      }
    }

    // Describe dominant strategy
    if (generation > 2 && generation % 5 === 0) {
      const strategy = describeStrategy(genomeProfile.topConnections);
      if (strategy) {
        lines.push({ text: strategy, type: 'analysis', generation });
      }
    }

    // Connection count convergence
    if (prevProfile && genomeProfile.connectionCount < prevProfile.connectionCount * 0.7) {
      lines.push({
        text: `The genomes are getting leaner — only ${genomeProfile.connectionCount} distinct connection types left. The population is converging!`,
        type: 'analysis',
        generation,
      });
    }
  }

  // --- Diversity commentary ---
  if (generation > 3) {
    if (diversityChange < -0.1) {
      lines.push({
        text: pick([
          `Genetic diversity is dropping fast. The Darwin-Dots are looking more and more alike — a dominant genome is taking over.`,
          `Monoculture incoming! Diversity falls to ${pct(diversity)}. A winning genome is pushing out the competition.`,
        ]),
        type: 'analysis',
        generation,
      });
    } else if (diversity > 0.8) {
      lines.push({
        text: `Maximum diversity! The population is still trying wildly different strategies. No clear favorite yet.`,
        type: 'analysis',
        generation,
      });
    }
  }

  return lines;
}

// ---------------------------------------------------------------------------
// Match Summary
// ---------------------------------------------------------------------------

export interface SummaryInput {
  challengeName: string;
  population: number;
  totalGenerations: number;
  history: { generation: number; survivors: number; population: number; diversity: number; genomeProfile: GenomeProfile | null }[];
}

export interface MatchSummary {
  headline: string;
  paragraphs: string[];
}

export function generateSummary(input: SummaryInput): MatchSummary {
  const { challengeName, population, totalGenerations, history } = input;

  if (history.length < 2) {
    return {
      headline: 'Simulation not yet started',
      paragraphs: ['Start the simulation to get a summary.'],
    };
  }

  const first = history[0];
  const last = history[history.length - 1];
  const firstRate = first.survivors / population;
  const lastRate = last.survivors / population;

  // Find best and worst generation
  let bestGen = history[0], worstGen = history[0];
  for (const h of history) {
    if (h.survivors > bestGen.survivors) bestGen = h;
    if (h.survivors < worstGen.survivors) worstGen = h;
  }
  const bestRate = bestGen.survivors / population;
  const worstRate = worstGen.survivors / population;

  // Find biggest jump
  let biggestJump = 0, jumpFrom = 0, jumpTo = 0, jumpGen = 0;
  for (let i = 1; i < history.length; i++) {
    const jump = (history[i].survivors - history[i - 1].survivors) / population;
    if (jump > biggestJump) {
      biggestJump = jump;
      jumpFrom = history[i - 1].survivors;
      jumpTo = history[i].survivors;
      jumpGen = history[i].generation;
    }
  }

  // Count resets (0 survivors)
  const resets = history.filter(h => h.survivors === 0).length;

  // Diversity trend
  const firstDiv = history[0].diversity;
  const lastDiv = last.diversity;

  // Final strategy
  const finalProfile = last.genomeProfile;

  // --- Build headline ---
  let headline: string;
  if (lastRate > 0.7) {
    headline = `Dominant Victory: ${pct(lastRate)} survival rate after ${totalGenerations} generations!`;
  } else if (lastRate > 0.3) {
    headline = `Solid Result: ${challengeName} Challenge conquered with ${pct(lastRate)}`;
  } else if (lastRate > 0.05) {
    headline = `Tough Fight: Only ${pct(lastRate)} survive the ${challengeName} Challenge`;
  } else if (lastRate > 0) {
    headline = `On the Brink: ${last.survivors} survivors after ${totalGenerations} generations`;
  } else {
    headline = `Total Wreck: The ${challengeName} Challenge remains unbeaten`;
  }

  // --- Build paragraphs ---
  const paras: string[] = [];

  // Opening
  paras.push(
    `${population} Darwin-Dots competed across ${totalGenerations} generations in the ${challengeName} Challenge. ` +
    `The survival rate started at ${pct(firstRate)} and ended at ${pct(lastRate)} — ` +
    (lastRate > firstRate
      ? `a clear improvement of ${pct(lastRate - firstRate)}.`
      : lastRate < firstRate
        ? `a decline of ${pct(firstRate - lastRate)}.`
        : `no change.`)
  );

  // Key moments
  const moments: string[] = [];
  if (biggestJump > 0.05) {
    moments.push(`The biggest breakthrough came in generation ${jumpGen}, when survivors jumped from ${jumpFrom} to ${jumpTo}.`);
  }
  if (bestGen.generation !== last.generation) {
    moments.push(`The best generation was #${bestGen.generation} with ${bestGen.survivors} survivors (${pct(bestRate)}).`);
  }
  if (worstGen.survivors === 0 && resets > 0) {
    moments.push(`${resets}x the population had to be completely reshuffled — zero survivors, back to square one.`);
  } else if (worstGen.survivors > 0 && worstRate < lastRate * 0.5) {
    moments.push(`The low point was generation ${worstGen.generation} with only ${worstGen.survivors} survivors.`);
  }
  if (moments.length > 0) {
    paras.push(moments.join(' '));
  }

  // Diversity analysis
  if (lastDiv < 0.3 && firstDiv > 0.5) {
    paras.push(`Genetic diversity dropped from ${pct(firstDiv)} to ${pct(lastDiv)}. A dominant genome has taken over — the Darwin-Dots are practically clones.`);
  } else if (lastDiv > 0.7) {
    paras.push(`Diversity remained high at ${pct(lastDiv)}. The population hasn't found a unified formula for success yet.`);
  } else {
    paras.push(`Genetic diversity settled at ${pct(lastDiv)} — a healthy mix of convergence and variation.`);
  }

  // Final strategy
  if (finalProfile && finalProfile.topConnections.length > 0) {
    const topConns = finalProfile.topConnections.slice(0, 3);
    const sensorConns = topConns.filter(c => c.fromType === 'sensor');
    const moveConns = topConns.filter(c => c.toType === 'action' && c.to.startsWith('MV_'));

    const parts: string[] = [];
    if (sensorConns.length > 0) {
      const sNames = sensorConns.map(c => `"${humanLabel(c.from, 'sensor')}"`).join(' and ');
      parts.push(`relies on ${sNames} as senses`);
    }
    if (moveConns.length > 0) {
      const mNames = moveConns.map(c => `"${humanLabel(c.to, 'action')}"`).join(' and ');
      parts.push(`banks on ${mNames}`);
    }

    if (parts.length > 0) {
      paras.push(
        `The winning genome (${finalProfile.avgGenomeLength} genes, ${finalProfile.avgNeuronCount} neurons) ` +
        parts.join(' and ') + '. ' +
        `${finalProfile.connectionCount} distinct connection patterns were observed among the survivors.`
      );
    }
  }

  // Closing
  if (lastRate > 0.5) {
    paras.push(pick([
      `An impressive feat of evolution. The Darwin-Dots have this challenge firmly in hand.`,
      `Darwin would be proud. This population has figured out what it takes.`,
      `Bottom line: Natural selection delivers — ${pct(lastRate)} reliably find the way.`,
    ]));
  } else if (lastRate > 0) {
    paras.push(pick([
      `There's still room to grow. More generations could push the survival rate even higher.`,
      `Evolution is working — slowly but steadily. Stay tuned!`,
    ]));
  } else {
    paras.push(`This challenge hasn't been cracked yet. Maybe with different parameters?`);
  }

  return { headline, paragraphs: paras };
}

// --- Helpers ---

function pct(v: number): string {
  return `${Math.round(v * 100)}%`;
}

function pick(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

function connDesc(c: ConnectionProfile): string {
  return connectionDescription(c.from, c.fromType, c.to, c.toType, c.avgWeight);
}

function describeStrategy(conns: ConnectionProfile[]): string | null {
  const moveConns = conns.filter(c => c.toType === 'action' && c.to.startsWith('MV_'));
  const sensorConns = conns.filter(c => c.fromType === 'sensor' && c.frequency > 0.3);

  if (moveConns.length === 0) return null;

  const topMove = moveConns[0];
  const topSensor = sensorConns[0];
  const moveDesc = humanLabel(topMove.to, 'action');

  if (topSensor) {
    const sensorDesc = humanLabel(topSensor.from, 'sensor');
    return pick([
      `The winning strategy: "${sensorDesc}" as compass for "${moveDesc}". ${pct(topMove.frequency)} of survivors are running with it.`,
      `The secret recipe: The Darwin-Dots sense "${sensorDesc}" and respond with "${moveDesc}".`,
      `Tactics update: The survivors use their ${sensorDesc} sense to steer ${moveDesc.toLowerCase()}.`,
    ]);
  }

  return `Dominant action: "${moveDesc}" in ${pct(topMove.frequency)} of survivors.`;
}
