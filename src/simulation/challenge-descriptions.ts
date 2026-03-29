// challenge-descriptions.ts -- Immersive descriptions of each challenge

export interface ChallengeInfo {
  title: string;
  brief: string;
  flavor: string;
}

export const CHALLENGE_INFO: Record<number, ChallengeInfo> = {
  0: {
    title: "Kreis (SW-Viertel)",
    brief: "Erreiche den sicheren Kreis im Südwesten.",
    flavor: "Ein mysteriöser Schutzkreis leuchtet im Südwesten der Arena. Nur wer es dorthin schafft, überlebt die Nacht. Je näher am Zentrum, desto besser die Überlebenschancen. Randsteher leben gefährlich.",
  },
  1: {
    title: "Rechte Hälfte",
    brief: "Überquere die Mittellinie nach rechts.",
    flavor: "Die linke Hälfte der Welt wird unbewohnbar. Alle Darwin-Dots müssen die unsichtbare Grenze in der Mitte überqueren — wer rechts steht, lebt. Wer links bleibt, verschwindet. Klingt einfach? Nicht ohne Gehirn.",
  },
  2: {
    title: "Rechtes Viertel",
    brief: "Erreiche das äußerste rechte Viertel.",
    flavor: "Nur das letzte Viertel der Arena ist sicher — ganz am rechten Rand. Der Weg ist weit, die Zeit ist knapp. Wer trödelt, wird aussortiert.",
  },
  3: {
    title: "String-Verhalten",
    brief: "Bilde Ketten mit exakt 2 Nachbarn.",
    flavor: "Einzelgänger sterben. Mobs auch. Nur wer sich in lockeren Ketten formiert — genau 2 Nachbarn, nicht mehr, nicht weniger — darf weiterleben. Soziale Intelligenz auf kleinstem Raum.",
  },
  4: {
    title: "Mitte (gewichtet)",
    brief: "Sammle dich im Zentrum der Arena.",
    flavor: "Das Zentrum ruft. Ein unsichtbares Kraftfeld zieht die Würdigen zur Mitte. Je näher du dem Herzen der Arena kommst, desto höher deine Fitness. Randexistenzen haben keine Zukunft.",
  },
  5: {
    title: "Mitte (ungewichtet)",
    brief: "Erreiche den Kreis in der Mitte.",
    flavor: "Einfache Regel: Bist du im Kreis, lebst du. Bist du draußen, stirbst du. Kein Bonus für Streber, die besonders mittig stehen. Demokratie des Überlebens.",
  },
  6: {
    title: "Ecken",
    brief: "Erreiche eine der vier Ecken.",
    flavor: "Vier Zufluchtsorte, vier Ecken. Egal welche — Hauptsache du findest eine davon. Die Frage ist nicht ob, sondern wohin. Schwarmverhalten oder Einzelkämpfer? Die Evolution entscheidet.",
  },
  7: {
    title: "Ecken (gewichtet)",
    brief: "Erreiche eine Ecke — je näher, desto besser.",
    flavor: "Die Ecken der Arena sind magnetisch. Wer nah dran ist, bekommt Bonuspunkte. Wer direkt in der Ecke kauert, ist der Champion. Ein Wettlauf in vier Richtungen gleichzeitig.",
  },
  8: {
    title: "Migrations-Distanz",
    brief: "Wandere so weit wie möglich von deinem Geburtsort.",
    flavor: "Hier zählt Fernweh. Jeder Darwin-Dot wird danach bewertet, wie weit sie von ihrem Geburtsort wegkommt. Stubenhocker haben keine Chance. Nomaden erben die Welt.",
  },
  9: {
    title: "Mitte (spärlich)",
    brief: "Erreiche die Mitte, aber vermeide Gedränge.",
    flavor: "Die Mitte lockt — aber Vorsicht: Wer sich in den Mob quetscht, stirbt trotzdem. Nur wer zentral steht UND genug Ellenbogenfreiheit hat, überlebt. Die Kunst des sozialen Abstands.",
  },
  10: {
    title: "Linkes Achtel",
    brief: "Dränge dich ins linke Achtel der Arena.",
    flavor: "Ein schmaler Streifen ganz links ist die einzige Rettung. 87% der Arena sind Todeszone. Präzision und Orientierungssinn sind alles.",
  },
  11: {
    title: "Radioaktive Wände",
    brief: "Fliehe vor den heranrückenden Strahlungswänden.",
    flavor: "Die Wände strahlen. Mit jedem Schritt rückt die Todeszone von allen vier Seiten näher. Die sichere Zone schrumpft unaufhaltsam. Nur wer rechtzeitig zur Mitte flieht, überlebt. Ein Wettlauf gegen die unsichtbare Gefahr. ☢",
  },
  12: {
    title: "An Wand (Ende)",
    brief: "Stehe am Generationsende an einer Wand.",
    flavor: "Vergiss alles, was du über Ecken und Mitte gelernt hast. Hier wollen alle an die Wand. Am Ende der Generation zählt nur: Berührst du den Rand? Die Mauerblümchen gewinnen.",
  },
  13: {
    title: "Wand berührt (je)",
    brief: "Berühre irgendwann während deines Lebens eine Wand.",
    flavor: "Einmal die Wand berühren genügt — egal wann. Du kannst danach wieder ins Zentrum laufen. Die Evolution belohnt Neugier und Entdeckergeist. Wer nie an die Grenzen geht, hat schon verloren.",
  },
  14: {
    title: "Ost-West Achtel",
    brief: "Erreiche das linke oder rechte Achtel.",
    flavor: "Zwei schmale Streifen an den Extremen — links oder rechts. Die Mitte ist der Tod. Polarisierung als Überlebensstrategie. Welches Team wählst du?",
  },
  15: {
    title: "Nahe Barriere",
    brief: "Halte dich in der Nähe von Barrieren auf.",
    flavor: "Normalerweise meidet man Hindernisse. Hier nicht. Die Barrieren sind Schutzschilde — wer nah dran steht, überlebt. Je näher, desto sicherer. Umarme das Hindernis.",
  },
  16: {
    title: "Paare bilden",
    brief: "Finde einen Partner — genau einen, nicht mehr.",
    flavor: "Die romantischste Challenge: Finde genau EINEN Nachbarn, der auch nur DICH als Nachbarn hat. Kein Dreiecks-Drama, keine Einsamkeit. Monogamie oder Tod. Die Evolution als Dating-App.",
  },
  17: {
    title: "Ortssequenz",
    brief: "Besuche markierte Orte in der richtigen Reihenfolge.",
    flavor: "Eine Schnitzeljagd durch die Arena. Jeder besuchte Checkpoint gibt Punkte. Wer die meisten Stationen schafft, hat die beste Fitness. Planung trifft auf Instinkt.",
  },
  18: {
    title: "Altruismus",
    brief: "Opfere dich im Nordosten, damit andere im Südwesten überleben.",
    flavor: "Das Philosophen-Dilemma als Evolution: Ein Kreis im Südwesten ist die Sicherheitszone. Aber die besten Fitness-Scores bekommt, wer sich in die Opferzone im Nordosten begibt. Selbstlose Gene — gibt es das wirklich?",
  },
};
