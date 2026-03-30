import { useState, useCallback, useEffect, useRef } from "react";
import SimCanvas from "./components/SimCanvas";
import ControlPanel, {
  DEFAULT_CONFIG,
  type SimConfig,
} from "./components/ControlPanel";
import StatsGraph from "./components/StatsGraph";
import AgentInspector from "./components/AgentInspector";
import GenomeGraph from "./components/GenomeGraph";
import Commentary from "./components/Commentary";
import MatchSummaryModal from "./components/MatchSummary";
import ChallengeInfo from "./components/ChallengeInfo";
import PresetSelector from "./components/Presets";
import CreatureAvatar from "./components/CreatureAvatar";
import LineageTree from "./components/LineageTree";
import { useSimulation } from "./hooks/useSimulation";
import {
  generateCommentary,
  generateSummary,
  type CommentaryLine,
  type MatchSummary,
} from "./simulation/commentary";
import { genomeFromHash, genomeShareUrl, clearGenomeHash } from "./simulation/genome-codec";
import type { Genome } from "./simulation/types";

const CHALLENGE_LABELS: Record<number, string> = {
  0: "Circle", 1: "Right Half", 2: "Right Quarter", 3: "String",
  4: "Center", 5: "Center", 6: "Corners", 7: "Corners",
  8: "Migration", 9: "Center Sparse", 10: "Left Eighth",
  11: "Radioactive Walls", 12: "At Wall", 13: "Touch Wall",
  14: "East-West", 15: "Near Barrier", 16: "Pairs", 17: "Sequence", 18: "Altruism",
};

function useWindowWidth() {
  const [w, setW] = useState(window.innerWidth);
  useEffect(() => {
    const onResize = () => setW(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return w;
}

export default function App() {
  const [config, setConfig] = useState<SimConfig>(DEFAULT_CONFIG);
  const [selectedAgent, setSelectedAgent] = useState<{ x: number; y: number } | null>(null);
  const [commentaryLines, setCommentaryLines] = useState<CommentaryLine[]>([]);
  const [summary, setSummary] = useState<MatchSummary | null>(null);
  // Read seed genome synchronously before simulation init
  const [seedGenome] = useState<Genome | null>(() => {
    const genome = genomeFromHash();
    if (genome) clearGenomeHash();
    return genome;
  });
  const wasRunning = useRef(false);
  const prevProfileRef = useRef<import("./simulation/genome-profile").GenomeProfile | null>(null);

  const {
    state, running, speed, history, agentInfo, genomeProfile, lineage,
    start, pause, reset, changeSpeed, updateConfig, inspectAgent,
  } = useSimulation(DEFAULT_CONFIG, seedGenome);

  const windowWidth = useWindowWidth();

  // Champion genome from last lineage entry
  const championGenome: Genome | null =
    lineage.length > 0 ? lineage[lineage.length - 1].genome : null;

  const handleShareGenome = useCallback(() => {
    if (!championGenome) return;
    const url = genomeShareUrl(championGenome);
    navigator.clipboard.writeText(url);
  }, [championGenome]);

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
    reset(config);
    setSelectedAgent(null);
    setCommentaryLines([]);
    setSummary(null);
  }, [reset, config]);

  const handleAgentClick = useCallback(
    (gridX: number, gridY: number) => {
      setSelectedAgent({ x: gridX, y: gridY });
      inspectAgent(gridX, gridY);
    },
    [inspectAgent]
  );

  const handleCloseInspector = useCallback(() => {
    setSelectedAgent(null);
  }, []);

  const handlePreset = useCallback((presetConfig: SimConfig) => {
    setConfig(presetConfig);
    reset(presetConfig);
    setSelectedAgent(null);
    setCommentaryLines([]);
    setSummary(null);
  }, [reset]);

  const lastH = historyLen > 0 ? history[historyLen - 1] : null;

  const sidebar = (
    <>
      <ControlPanel
        config={config}
        onConfigChange={handleConfigChange}
        state={state}
        running={running}
        speed={speed}
        lastSurvivors={lastH?.survivors ?? 0}
        lastGeneration={lastH?.generation ?? 0}
        lastAvgFitness={lastH?.avgFitness ?? 0}
        onStart={start}
        onPause={pause}
        onReset={handleReset}
        onSpeedChange={changeSpeed}
        championGenome={championGenome}
        onShareGenome={handleShareGenome}
      />
      <PresetSelector onSelect={handlePreset} disabled={running} />
      <ChallengeInfo challenge={config.challenge} />
      <CreatureAvatar
        profile={genomeProfile}
        label="Typical Darwin-Dot"
      />
      <AgentInspector
        info={agentInfo}
        onClose={handleCloseInspector}
      />
      <LineageTree snapshots={lineage} />
    </>
  );

  const statsRow = (
    <div className={isNarrow ? "flex flex-col gap-3" : "flex gap-4"}>
      <StatsGraph
        history={history}
        width={isNarrow ? fullW : Math.floor(canvasSize * 0.44)}
        height={150}
      />
      <GenomeGraph
        profile={genomeProfile}
        width={isNarrow ? fullW : Math.floor(canvasSize * 0.54)}
        height={150}
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 flex justify-center">
    <div className="w-full max-w-[1200px]">
      {summary && (
        <MatchSummaryModal
          summary={summary}
          onClose={() => setSummary(null)}
        />
      )}

      {/* Header */}
      <div className="mb-4">
        <h1 className="text-xl font-semibold tracking-tight">Darwin's Arena</h1>
        <p className="text-xs text-zinc-500 mt-1">
          Natural selection in real time
          <span className="text-zinc-600 ml-2">— Click on a Darwin-Dot</span>
        </p>
      </div>

      {isNarrow ? (
        /* --- Mobile / Narrow: single column --- */
        <div className="flex flex-col gap-4 mx-auto" style={{ maxWidth: fullW }}>
          <SimCanvas
            state={state}
            width={canvasSize}
            height={canvasSize}
            challenge={config.challenge}
            stepsPerGeneration={config.stepsPerGeneration}
            selectedAgent={selectedAgent}
            selectedAgentName={agentInfo?.name ?? null}
            onAgentClick={handleAgentClick}
          />
          <div className="flex flex-col gap-3" style={{ width: fullW }}>
            {sidebar}
          </div>
          {statsRow}
          <Commentary lines={commentaryLines} width={fullW} />
        </div>
      ) : (
        /* --- Desktop: two columns --- */
        <div className="flex gap-5 items-start">
          <div className="flex flex-col gap-4 flex-shrink-0" style={{ width: canvasSize }}>
            <SimCanvas
              state={state}
              width={canvasSize}
              height={canvasSize}
              challenge={config.challenge}
              stepsPerGeneration={config.stepsPerGeneration}
              selectedAgent={selectedAgent}
              selectedAgentName={agentInfo?.name ?? null}
              onAgentClick={handleAgentClick}
            />
            {statsRow}
            <Commentary lines={commentaryLines} width={canvasSize} />
          </div>
          <div className="flex flex-col gap-3 flex-shrink-0" style={{ width: sidebarW }}>
            {sidebar}
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
