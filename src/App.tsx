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
import { useSimulation } from "./hooks/useSimulation";
import {
  generateCommentary,
  generateSummary,
  type CommentaryLine,
  type MatchSummary,
} from "./simulation/commentary";

const CHALLENGE_LABELS: Record<number, string> = {
  0: "Kreis", 1: "Rechte Hälfte", 2: "Rechtes Viertel", 3: "String",
  4: "Mitte", 5: "Mitte", 6: "Ecken", 7: "Ecken",
  8: "Migration", 9: "Mitte spärlich", 10: "Linkes Achtel",
  11: "Radioaktive Wände", 12: "An Wand", 13: "Wand berühren",
  14: "Ost-West", 15: "Nahe Barriere", 16: "Paare", 17: "Sequenz", 18: "Altruismus",
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
  const wasRunning = useRef(false);
  const prevProfileRef = useRef<import("./simulation/genome-profile").GenomeProfile | null>(null);

  const {
    state, running, speed, history, agentInfo, genomeProfile,
    start, pause, reset, changeSpeed, updateConfig, inspectAgent,
  } = useSimulation(DEFAULT_CONFIG);

  const windowWidth = useWindowWidth();

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
      challengeName: CHALLENGE_LABELS[config.challenge] ?? 'Unbekannt',
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
        challengeName: CHALLENGE_LABELS[config.challenge] ?? 'Unbekannt',
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
      />
      <PresetSelector onSelect={handlePreset} disabled={running} />
      <ChallengeInfo challenge={config.challenge} />
      <CreatureAvatar
        profile={genomeProfile}
        label="Typischer Darwin-Dot"
      />
      <AgentInspector
        info={agentInfo}
        onClose={handleCloseInspector}
      />
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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4">
      {summary && (
        <MatchSummaryModal
          summary={summary}
          onClose={() => setSummary(null)}
        />
      )}

      {/* Header */}
      <div className="mb-4">
        <h1 className="text-xl font-semibold tracking-tight">Darwins Arena</h1>
        <p className="text-xs text-zinc-500 mt-1">
          Natürliche Selektion in Echtzeit
          <span className="text-zinc-600 ml-2">— Klicke auf einen Darwin-Dot</span>
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
  );
}
