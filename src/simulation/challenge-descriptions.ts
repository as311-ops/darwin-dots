// challenge-descriptions.ts -- Immersive descriptions of each challenge

export interface ChallengeInfo {
  title: string;
  brief: string;
  flavor: string;
}

export const CHALLENGE_INFO: Record<number, ChallengeInfo> = {
  0: {
    title: "Circle (SW Quadrant)",
    brief: "Reach the safe circle in the southwest.",
    flavor: "A mysterious protection circle glows in the southwest corner of the arena. Only those who make it there survive the night. The closer to the center, the better your chances. Edge-huggers live dangerously.",
  },
  1: {
    title: "Right Half",
    brief: "Cross the center line to the right.",
    flavor: "The left half of the world is becoming uninhabitable. All Darwin-Dots must cross the invisible boundary in the middle — stand right and live. Stay left and vanish. Sounds easy? Not without a brain.",
  },
  2: {
    title: "Right Quarter",
    brief: "Reach the far-right quarter.",
    flavor: "Only the last quarter of the arena is safe — all the way to the right edge. The path is long, the clock is ticking. Dawdlers get culled.",
  },
  3: {
    title: "String Behavior",
    brief: "Form chains with exactly 2 neighbors.",
    flavor: "Loners die. Mobs too. Only those who form loose chains — exactly 2 neighbors, no more, no less — get to live on. Social intelligence in the tightest of spaces.",
  },
  4: {
    title: "Center (Weighted)",
    brief: "Gather at the center of the arena.",
    flavor: "The center calls. An invisible force field draws the worthy toward the middle. The closer you get to the heart of the arena, the higher your fitness. Fringe dwellers have no future.",
  },
  5: {
    title: "Center (Unweighted)",
    brief: "Reach the circle in the center.",
    flavor: "Simple rule: inside the circle, you live. Outside the circle, you die. No bonus for overachievers who park themselves dead-center. Democracy of survival.",
  },
  6: {
    title: "Corners",
    brief: "Reach one of the four corners.",
    flavor: "Four sanctuaries, four corners. Any one will do — just find one. The question isn't whether, but where. Swarm behavior or lone wolf? Evolution decides.",
  },
  7: {
    title: "Corners (Weighted)",
    brief: "Reach a corner — the closer, the better.",
    flavor: "The corners of the arena are magnetic. Get close and earn bonus points. Cram yourself right into the corner and you're the champion. A race in four directions at once.",
  },
  8: {
    title: "Migration Distance",
    brief: "Wander as far as possible from your birthplace.",
    flavor: "Wanderlust is everything here. Every Darwin-Dot is judged by how far they travel from their birthplace. Homebodies don't stand a chance. Nomads inherit the world.",
  },
  9: {
    title: "Center (Sparse)",
    brief: "Reach the center, but avoid the crowds.",
    flavor: "The center beckons — but beware: squeeze into the mob and you die anyway. Only those who stand central AND have enough elbow room survive. The art of social distancing.",
  },
  10: {
    title: "Left Eighth",
    brief: "Squeeze into the left eighth of the arena.",
    flavor: "A narrow strip on the far left is the only salvation. 87% of the arena is a death zone. Precision and a sense of direction are everything.",
  },
  11: {
    title: "Radioactive Walls",
    brief: "Flee from the advancing radiation walls.",
    flavor: "The walls are irradiated. With every step, the death zone closes in from all four sides. The safe zone shrinks relentlessly. Only those who flee to the center in time survive. A race against the invisible threat. ☢",
  },
  12: {
    title: "At Wall (End)",
    brief: "Stand at a wall by the end of the generation.",
    flavor: "Forget everything you learned about corners and centers. Here, everyone wants the wall. At the end of the generation, only one thing matters: are you touching the edge? The wallflowers win.",
  },
  13: {
    title: "Wall Touched (Ever)",
    brief: "Touch a wall at any point during your lifetime.",
    flavor: "One touch of the wall is all it takes — doesn't matter when. You can run back to the center afterward. Evolution rewards curiosity and the spirit of exploration. Those who never push the boundaries have already lost.",
  },
  14: {
    title: "East-West Eighth",
    brief: "Reach the left or right eighth.",
    flavor: "Two narrow strips at the extremes — left or right. The center is death. Polarization as a survival strategy. Which team do you pick?",
  },
  15: {
    title: "Near Barrier",
    brief: "Stay close to barriers.",
    flavor: "Normally you avoid obstacles. Not here. The barriers are shields — stand close and you survive. The closer, the safer. Embrace the obstacle.",
  },
  16: {
    title: "Form Pairs",
    brief: "Find a partner — exactly one, no more.",
    flavor: "The most romantic challenge: find exactly ONE neighbor who also has only YOU as a neighbor. No love triangles, no loneliness. Monogamy or death. Evolution as a dating app.",
  },
  17: {
    title: "Location Sequence",
    brief: "Visit marked locations in the correct order.",
    flavor: "A scavenger hunt across the arena. Each checkpoint visited earns points. Whoever hits the most stations has the best fitness. Planning meets instinct.",
  },
  18: {
    title: "Altruism",
    brief: "Sacrifice yourself in the northeast so others survive in the southwest.",
    flavor: "The philosopher's dilemma as evolution: a circle in the southwest is the safety zone. But the highest fitness scores go to those who venture into the sacrifice zone in the northeast. Selfless genes — do they really exist?",
  },
};
