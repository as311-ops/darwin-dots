import { useState, useCallback, useEffect, useRef } from "react";
import SimCanvas from "./components/SimCanvas";
import ControlPanel, {
  DEFAULT_CONFIG,
  type SimConfig,
} from "./components/ControlPanel";
import StatsGraph from "./components/StatsGraph";
import GenomeGraph from "./components/GenomeGraph";
import MatchSummaryModal from "./components/MatchSummary";
import ChallengeInfo from "./components/ChallengeInfo";
import LineageTree from "./components/LineageTree";
import SplashScreen from "./components/SplashScreen";
import DarwinLogo from "./components/DarwinLogo";
import { PRESETS } from "./components/Presets";
import { useSimulation } from "./hooks/useSimulation";
import type { PerfStats } from "./hooks/useSimulation";
import {
  generateCommentary,
  generateSummary,
  type CommentaryLine,
  type MatchSummary,
} from "./simulation/commentary";
import { genomeFromHash, genomeShareUrl, clearGenomeHash } from "./simulation/genome-codec";
import { playStart, playGenerationTick, playBreakthrough, playWipeout, playVictory, playShare } from "./simulation/sounds";
import type { Genome } from "./simulation/types";

const CHALLENGE_LABELS: Record<number, string> = {
  0: "Circle", 1: "Right Half", 2: "Right Quarter", 3: "String",
  4: "Center", 5: "Center", 6: "Corners", 7: "Corners",
  8: "Migration", 9: "Center Sparse", 10: "Left Eighth",
  11: "Radioactive Walls", 12: "At Wall", 13: "Touch Wall",
  14: "East-West", 15: "Near Barrier", 16: "Pairs", 17: "Sequence", 18: "Altruism",
};

const IS_SCREENSAVER = new URLSearchParams(window.location.search).has("screensaver");
const SCREENSAVER_CYCLE_GENS = 25;
const SCREENSAVER_INITIAL_IDX = IS_SCREENSAVER ? Math.floor(Math.random() * PRESETS.length) : 0;

function useWindowSize() {
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return size;
}

function useWindowWidth() {
  return useWindowSize().w;
}

export default function App() {
  const [config, setConfig] = useState<SimConfig>(
    IS_SCREENSAVER ? { ...DEFAULT_CONFIG, ...PRESETS[SCREENSAVER_INITIAL_IDX].config } : DEFAULT_CONFIG
  );
  const [commentaryLines, setCommentaryLines] = useState<CommentaryLine[]>([]);
  const [summary, setSummary] = useState<MatchSummary | null>(null);
  const [summaryProfile, setSummaryProfile] = useState<import("./simulation/genome-profile").GenomeProfile | null>(null);
  const [summaryGenome, setSummaryGenome] = useState<Genome | null>(null);
  // Read seed genome synchronously before simulation init
  const [seedGenome] = useState<Genome | null>(() => {
    const genome = genomeFromHash();
    if (genome) clearGenomeHash();
    return genome;
  });
  const [showSplash, setShowSplash] = useState(!seedGenome && !IS_SCREENSAVER);
  const wasRunning = useRef(false);
  const prevProfileRef = useRef<import("./simulation/genome-profile").GenomeProfile | null>(null);
  const screensaverPresetIdx = useRef(SCREENSAVER_INITIAL_IDX);

  const screensaverInitConfig = IS_SCREENSAVER
    ? { ...DEFAULT_CONFIG, ...PRESETS[screensaverPresetIdx.current].config }
    : DEFAULT_CONFIG;

  const {
    state, running, history, genomeProfile, lineage, perfStats, speed,
    start, pause, reset, changeSpeed, updateConfig,
  } = useSimulation(screensaverInitConfig, seedGenome);

  const windowWidth = useWindowWidth();
  const windowSize = useWindowSize();

  // Champion genome from last lineage entry
  const championGenome: Genome | null =
    lineage.length > 0 ? lineage[lineage.length - 1].genome : null;

  const handleShareGenome = useCallback(() => {
    if (!championGenome) return;
    const url = genomeShareUrl(championGenome);
    navigator.clipboard.writeText(url);
    playShare();
  }, [championGenome]);

  // Screensaver: auto-start + auto-cycle presets
  useEffect(() => {
    if (!IS_SCREENSAVER) return;
    const id = setTimeout(() => start(), 200);
    return () => clearTimeout(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!IS_SCREENSAVER || history.length === 0) return;
    const gen = history[history.length - 1].generation;
    if (gen > 0 && gen % SCREENSAVER_CYCLE_GENS === 0) {
      screensaverPresetIdx.current = Math.floor(Math.random() * PRESETS.length);
      const nextConfig = { ...DEFAULT_CONFIG, ...PRESETS[screensaverPresetIdx.current].config };
      setConfig(nextConfig);
      reset(nextConfig);
      setTimeout(() => start(), 100);
    }
  }, [history.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Responsive breakpoints
  const isNarrow = windowWidth < 900;
  const sidebarW = isNarrow ? Math.min(windowWidth - 32, 400) : 300;
  const canvasSize = isNarrow
    ? Math.min(windowWidth - 32, 500)
    : Math.min(windowWidth - sidebarW - 64, 640);
  const fullW = isNarrow ? Math.min(windowWidth - 32, 500) : canvasSize;

  // Generate commentary when new generation stats arrive
  const historyLen = history.length;
  const lastGeneration = historyLen > 0 ? history[historyLen - 1].generation : -1;

  useEffect(() => {
    if (historyLen < 1) return;
    const lastStats = history[historyLen - 1];
    const prevStats = historyLen > 1 ? history[historyLen - 2] : null;

    const lines = generateCommentary({
      generation: lastStats.generation,
      survivors: lastStats.survivors,
      population: lastStats.population,
      diversity: lastStats.diversity,
      genomeProfile: genomeProfile,
      prevSurvivors: prevStats?.survivors ?? 0,
      prevDiversity: prevStats?.diversity ?? 0,
      prevProfile: prevProfileRef.current,
      challengeName: CHALLENGE_LABELS[config.challenge] ?? 'Unknown',
    });

    if (lines.length > 0) {
      setCommentaryLines((prev) => [...prev.slice(-30), ...lines]);
      // Sound triggers based on commentary type
      if (lines.some(l => l.type === 'hype')) playBreakthrough();
      else if (lines.some(l => l.type === 'concern' && lastStats.survivors === 0)) playWipeout();
      else playGenerationTick();
    } else {
      playGenerationTick();
    }
    prevProfileRef.current = genomeProfile;
  }, [lastGeneration]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (wasRunning.current && !running && history.length >= 3) {
      const historyForSummary = history.map((h, i) =>
        i === history.length - 1 ? { ...h, genomeProfile: genomeProfile } : h
      );
      const s = generateSummary({
        challengeName: CHALLENGE_LABELS[config.challenge] ?? 'Unknown',
        population: config.population,
        totalGenerations: history.length,
        history: historyForSummary,
      });
      setSummary(s);
      setSummaryProfile(genomeProfile);
      setSummaryGenome(championGenome);
    }
    wasRunning.current = running;
  }, [running]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleConfigChange = useCallback(
    (newConfig: SimConfig) => {
      setConfig(newConfig);
      if (running) updateConfig(newConfig);
    },
    [running, updateConfig]
  );

  const handleReset = useCallback(() => {
    // Always stop simulation first so it never keeps running if anything below throws
    reset(config);
    setCommentaryLines([]);
    // Generate summary after stopping (wrapped so iOS audio errors can't swallow the reset)
    if (history.length >= 2) {
      try {
        const historyForSummary = history.map((h, i) =>
          i === history.length - 1 ? { ...h, genomeProfile: genomeProfile } : h
        );
        const s = generateSummary({
          challengeName: CHALLENGE_LABELS[config.challenge] ?? 'Unknown',
          population: config.population,
          totalGenerations: history.length,
          history: historyForSummary,
        });
        setSummary(s);
        setSummaryProfile(genomeProfile);
        setSummaryGenome(championGenome);
        playVictory();
      } catch {
        // Ignore errors (e.g. iOS AudioContext restrictions)
      }
    }
  }, [reset, config, history, genomeProfile]);

  const handleToggle = useCallback(() => {
    if (running) {
      pause();
    } else {
      playStart();
      start();
    }
  }, [running, pause, start]);

  const handleStart = useCallback(() => {
    playStart();
    start();
  }, [start]);

  const handleMenuClick = useCallback(() => {
    if (running) pause();
    setShowSplash(true);
  }, [running, pause]);

  const handlePreset = useCallback((presetConfig: SimConfig) => {
    setConfig(presetConfig);
    reset(presetConfig);
    setCommentaryLines([]);
    setSummary(null);
  }, [reset]);

  const handleSplashStart = useCallback((presetConfig: SimConfig) => {
    setConfig(presetConfig);
    reset(presetConfig);
    setShowSplash(false);
    // Auto-start after a brief delay for the spawn animation
    setTimeout(() => start(), 100);
  }, [reset, start]);

  const lastH = historyLen > 0 ? history[historyLen - 1] : null;

  const sidebar = (
    <>
      <ControlPanel
        config={config}
        onConfigChange={handleConfigChange}
        state={state}
        running={running}
        lastSurvivors={lastH?.survivors ?? 0}
        lastGeneration={lastH?.generation ?? 0}
        lastAvgFitness={lastH?.avgFitness ?? 0}
        perfStats={perfStats as PerfStats | null}
        commentaryLines={commentaryLines}
        speed={speed}
        onSpeedChange={changeSpeed}
        onStart={handleStart}
        onPause={pause}
        onReset={handleReset}
        onPreset={handlePreset}
        championGenome={championGenome}
        onShareGenome={handleShareGenome}
        genomeProfile={genomeProfile}
      />
      {lineage.length > 0 && <LineageTree snapshots={lineage} />}
    </>
  );

  const statsRow = historyLen > 0 ? (
    <div className={isNarrow ? "flex flex-col gap-3" : "flex gap-4"}>
      <StatsGraph
        history={history}
        width={isNarrow ? fullW : Math.floor(canvasSize * 0.44)}
        height={150}
      />
      {genomeProfile && (
        <GenomeGraph
          profile={genomeProfile}
          width={isNarrow ? fullW : Math.floor(canvasSize * 0.54)}
          height={150}
        />
      )}
    </div>
  ) : null;

  if (IS_SCREENSAVER) {
    const presetName = PRESETS[screensaverPresetIdx.current]?.name ?? "";
    return (
      <div className="fixed inset-0 bg-zinc-950 overflow-hidden">
        <SimCanvas
          state={state}
          width={windowSize.w}
          height={windowSize.h}
          challenge={config.challenge}
          stepsPerGeneration={config.stepsPerGeneration}
          running={running}
        />
        <div className="absolute bottom-4 right-5 text-right pointer-events-none select-none">
          <div className="text-[10px] text-zinc-600 font-mono">Darwin's Arena</div>
          <div className="text-[9px] text-zinc-700 font-mono">{presetName} · Gen {state?.generation ?? 0}</div>
        </div>
      </div>
    );
  }

  if (showSplash) {
    return <SplashScreen onStart={handleSplashStart} />;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 flex justify-center">
    <div className="w-full max-w-[1200px]">
      {summary && (
        <MatchSummaryModal
          summary={summary}
          genomeProfile={summaryProfile}
          championGenome={summaryGenome}
          onShareGenome={summaryGenome ? () => {
            const url = genomeShareUrl(summaryGenome);
            navigator.clipboard.writeText(url);
            playShare();
          } : undefined}
          onClose={() => { setSummary(null); setSummaryProfile(null); setSummaryGenome(null); }}
        />
      )}

      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={handleMenuClick}
          className="flex-shrink-0 rounded-lg border border-zinc-800 bg-zinc-900 p-1.5
                     hover:border-emerald-800 hover:bg-zinc-800/60 transition-colors"
          title="Back to menu"
        >
          <DarwinLogo size={32} />
        </button>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Darwin's Arena</h1>
          <p className="text-xs text-zinc-500 mt-1">
            Natural selection in real time
            <span className="text-zinc-600 ml-2">— Click on a Darwin-Dot</span>
          </p>
        </div>
      </div>

      {isNarrow ? (
        /* --- Mobile / Narrow: single column --- */
        <div className="flex flex-col gap-4 mx-auto" style={{ maxWidth: fullW }}>
          <ChallengeInfo challenge={config.challenge} />
          <SimCanvas
            state={state}
            width={canvasSize}
            height={canvasSize}
            challenge={config.challenge}
            stepsPerGeneration={config.stepsPerGeneration}
            running={running}
            onToggle={handleToggle}
          />
          <div className="flex flex-col gap-3" style={{ width: fullW }}>
            {sidebar}
          </div>
          {statsRow}
        </div>
      ) : (
        /* --- Desktop: two columns --- */
        <div className="flex gap-5 items-start">
          <div className="flex flex-col gap-4 flex-shrink-0" style={{ width: canvasSize }}>
            <ChallengeInfo challenge={config.challenge} />
            <SimCanvas
              state={state}
              width={canvasSize}
              height={canvasSize}
              challenge={config.challenge}
              stepsPerGeneration={config.stepsPerGeneration}
              running={running}
              onToggle={handleToggle}
            />
            {statsRow}
          </div>
          <div className="flex flex-col gap-3 flex-shrink-0" style={{ width: sidebarW }}>
            {sidebar}
          </div>
        </div>
      )}
      <div className="mt-6 text-center">
        <a
          href="https://implisense.com/de"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[9px] text-zinc-700 hover:text-zinc-500 transition-colors"
        >
          Impressum
        </a>
      </div>
    </div>
    </div>
  );
}
