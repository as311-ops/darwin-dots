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
      text: `Willkommen zur ${challengeName}-Challenge! ${population} Darwin-Dots starten ins Rennen. Wer schafft es in die Zielzone?`,
      type: 'hype',
      generation,
    });
  } else if (generation % 50 === 0) {
    lines.push({
      text: `Generation ${generation}! ${survivors} von ${population} haben es geschafft — eine Überlebensrate von ${pct(rate)}.`,
      type: 'milestone',
      generation,
    });
  }

  // --- Survival rate commentary ---
  if (generation > 1) {
    if (rateChange > 0.15) {
      lines.push({
        text: pick([
          `WAHNSINN! Die Überlebensrate schießt hoch — von ${pct(prevRate)} auf ${pct(rate)}! Die Evolution hat einen Gang hochgeschaltet!`,
          `Was für ein Sprung! ${pct(rate)} Überlebende! Das Training zeigt Wirkung, die Darwin-Dots haben etwas Entscheidendes gelernt!`,
          `DURCHBRUCH in Generation ${generation}! ${survivors} Überlebende — das ist ein neuer Rekord für diese Population!`,
        ]),
        type: 'hype',
        generation,
      });
    } else if (rateChange > 0.05) {
      lines.push({
        text: pick([
          `Solide Verbesserung! ${pct(rate)} schaffen es durch — der Trend zeigt nach oben.`,
          `Die Population wird stärker. ${survivors} Überlebende, das sind ${Math.round(rateChange * population)} mehr als letzte Generation.`,
        ]),
        type: 'analysis',
        generation,
      });
    } else if (rateChange < -0.1) {
      lines.push({
        text: pick([
          `Oje! Die Überlebensrate fällt auf ${pct(rate)}. Waren die Mutationen zu aggressiv?`,
          `Rückschlag! Nur noch ${survivors} Überlebende. Die Generation hat's nicht drauf.`,
          `Das tut weh — von ${pct(prevRate)} runter auf ${pct(rate)}. Manchmal macht Evolution einen Schritt zurück.`,
        ]),
        type: 'concern',
        generation,
      });
    } else if (survivors === 0) {
      lines.push({
        text: pick([
          `TOTALAUSFALL! Null Überlebende! Die Population wird komplett neu gewürfelt. Zurück auf Anfang!`,
          `Kompletter Reset — niemand hat die Challenge geschafft. Evolution ist brutal.`,
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
          text: `Taktikwechsel! Die häufigste Verbindung ist jetzt ${connDesc(top)} — vorher war es ${connDesc(prevTop)}.`,
          type: 'analysis',
          generation,
        });
      } else if (top.frequency > 0.7 && (!prevTop || prevTop.frequency < 0.7)) {
        lines.push({
          text: `${pct(top.frequency)} der Überlebenden nutzen ${connDesc(top)} — das ist fast schon ein Herdentrieb!`,
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
        text: `Die Genome werden schlanker — nur noch ${genomeProfile.connectionCount} verschiedene Verbindungstypen. Die Population konvergiert!`,
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
          `Die genetische Vielfalt sinkt rapide. Die Darwin-Dots werden sich immer ähnlicher — ein dominantes Genom setzt sich durch.`,
          `Monokultur im Anmarsch! Diversität fällt auf ${pct(diversity)}. Ein Siegergenom verdrängt die Konkurrenz.`,
        ]),
        type: 'analysis',
        generation,
      });
    } else if (diversity > 0.8) {
      lines.push({
        text: `Maximale Vielfalt! Die Population probiert noch wild verschiedene Strategien aus. Kein klarer Favorit.`,
        type: 'analysis',
        generation,
      });
    }
  }

  return lines;
}

// ---------------------------------------------------------------------------
// Match Summary — Spielzusammenfassung
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
      headline: 'Simulation noch nicht gestartet',
      paragraphs: ['Starte die Simulation, um eine Zusammenfassung zu erhalten.'],
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
    headline = `Dominanter Sieg: ${pct(lastRate)} Überlebensrate nach ${totalGenerations} Generationen!`;
  } else if (lastRate > 0.3) {
    headline = `Solides Ergebnis: ${challengeName}-Challenge mit ${pct(lastRate)} gemeistert`;
  } else if (lastRate > 0.05) {
    headline = `Zäher Kampf: Nur ${pct(lastRate)} überleben die ${challengeName}-Challenge`;
  } else if (lastRate > 0) {
    headline = `Knapp am Abgrund: ${last.survivors} Überlebende nach ${totalGenerations} Generationen`;
  } else {
    headline = `Totalschaden: Die ${challengeName}-Challenge bleibt unbezwungen`;
  }

  // --- Build paragraphs ---
  const paras: string[] = [];

  // Opening
  paras.push(
    `${population} Darwin-Dots traten in ${totalGenerations} Generationen zur ${challengeName}-Challenge an. ` +
    `Die Überlebensrate startete bei ${pct(firstRate)} und endete bei ${pct(lastRate)} — ` +
    (lastRate > firstRate
      ? `eine klare Steigerung um ${pct(lastRate - firstRate)}.`
      : lastRate < firstRate
        ? `ein Rückgang um ${pct(firstRate - lastRate)}.`
        : `keine Veränderung.`)
  );

  // Key moments
  const moments: string[] = [];
  if (biggestJump > 0.05) {
    moments.push(`Der größte Durchbruch kam in Generation ${jumpGen}, als die Überlebenden von ${jumpFrom} auf ${jumpTo} sprangen.`);
  }
  if (bestGen.generation !== last.generation) {
    moments.push(`Die beste Generation war Nr. ${bestGen.generation} mit ${bestGen.survivors} Überlebenden (${pct(bestRate)}).`);
  }
  if (worstGen.survivors === 0 && resets > 0) {
    moments.push(`${resets}× musste die Population komplett neu gewürfelt werden — null Überlebende, zurück auf Anfang.`);
  } else if (worstGen.survivors > 0 && worstRate < lastRate * 0.5) {
    moments.push(`Der Tiefpunkt war Generation ${worstGen.generation} mit nur ${worstGen.survivors} Überlebenden.`);
  }
  if (moments.length > 0) {
    paras.push(moments.join(' '));
  }

  // Diversity analysis
  if (lastDiv < 0.3 && firstDiv > 0.5) {
    paras.push(`Die genetische Vielfalt sank von ${pct(firstDiv)} auf ${pct(lastDiv)}. Ein dominantes Genom hat sich durchgesetzt — die Darwin-Dots sind quasi Klone.`);
  } else if (lastDiv > 0.7) {
    paras.push(`Die Diversität blieb mit ${pct(lastDiv)} hoch. Die Population hat noch kein einheitliches Erfolgsrezept gefunden.`);
  } else {
    paras.push(`Die genetische Vielfalt pendelte sich bei ${pct(lastDiv)} ein — eine gesunde Mischung aus Konvergenz und Variation.`);
  }

  // Final strategy
  if (finalProfile && finalProfile.topConnections.length > 0) {
    const topConns = finalProfile.topConnections.slice(0, 3);
    const sensorConns = topConns.filter(c => c.fromType === 'sensor');
    const moveConns = topConns.filter(c => c.toType === 'action' && c.to.startsWith('MV_'));

    const parts: string[] = [];
    if (sensorConns.length > 0) {
      const sNames = sensorConns.map(c => `„${humanLabel(c.from, 'sensor')}"`).join(' und ');
      parts.push(`nutzt ${sNames} als Sinne`);
    }
    if (moveConns.length > 0) {
      const mNames = moveConns.map(c => `„${humanLabel(c.to, 'action')}"`).join(' und ');
      parts.push(`setzt auf ${mNames}`);
    }

    if (parts.length > 0) {
      paras.push(
        `Das Sieger-Genom (${finalProfile.avgGenomeLength} Gene, ${finalProfile.avgNeuronCount} Neuronen) ` +
        parts.join(' und ') + '. ' +
        `${finalProfile.connectionCount} verschiedene Verbindungsmuster wurden bei den Überlebenden beobachtet.`
      );
    }
  }

  // Closing
  if (lastRate > 0.5) {
    paras.push(pick([
      `Eine beeindruckende Leistung der Evolution. Die Darwin-Dots haben die Challenge klar im Griff.`,
      `Darwin wäre stolz. Diese Population hat verstanden, was nötig ist.`,
      `Fazit: Die natürliche Selektion liefert — ${pct(lastRate)} finden zuverlässig den Weg.`,
    ]));
  } else if (lastRate > 0) {
    paras.push(pick([
      `Es bleibt Luft nach oben. Mehr Generationen könnten die Überlebensrate weiter steigern.`,
      `Die Evolution arbeitet — langsam, aber stetig. Weiter beobachten!`,
    ]));
  } else {
    paras.push(`Diese Challenge ist noch nicht geknackt. Vielleicht mit anderen Parametern?`);
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
      `Die Erfolgsstrategie: „${sensorDesc}" als Kompass für „${moveDesc}". ${pct(topMove.frequency)} der Überlebenden fahren damit.`,
      `Das Siegerrezept: Die Darwin-Dots spüren „${sensorDesc}" und reagieren mit „${moveDesc}".`,
      `Taktik-Update: Die Survivors nutzen ihren ${sensorDesc}-Sinn um ${moveDesc.toLowerCase()} zu steuern.`,
    ]);
  }

  return `Dominante Aktion: „${moveDesc}" bei ${pct(topMove.frequency)} der Überlebenden.`;
}
