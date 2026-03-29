import { useState, useRef, useCallback, useEffect } from "react";
import type { SimState } from "../components/SimCanvas";
import type { SimConfig } from "../components/ControlPanel";
import type { GenerationStats } from "../components/StatsGraph";
import type { AgentInfo } from "../simulation/simulator";
import type { GenomeProfile } from "../simulation/genome-profile";

export type WorkerCommand =
  | { type: "init"; config: SimConfig }
  | { type: "start" }
  | { type: "pause" }
  | { type: "reset"; config: SimConfig }
  | { type: "setSpeed"; fps: number }
  | { type: "updateConfig"; config: Partial<SimConfig> }
  | { type: "inspectAgent"; x: number; y: number };

export type WorkerMessage =
  | { type: "state"; state: SimState }
  | { type: "generation"; stats: GenerationStats }
  | { type: "agentInfo"; info: AgentInfo | null }
  | { type: "ready" };

export function useSimulation(initialConfig: SimConfig) {
  const workerRef = useRef<Worker | null>(null);
  const [state, setState] = useState<SimState | null>(null);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(60);
  const [history, setHistory] = useState<GenerationStats[]>([]);
  const [agentInfo, setAgentInfo] = useState<AgentInfo | null>(null);
  const [genomeProfile, setGenomeProfile] = useState<GenomeProfile | null>(null);
  const [firstProfile, setFirstProfile] = useState<GenomeProfile | null>(null);

  useEffect(() => {
    const worker = new Worker(
      new URL("../workers/simulation.worker.ts", import.meta.url),
      { type: "module" }
    );

    worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
      const msg = e.data;
      switch (msg.type) {
        case "state":
          setState(msg.state);
          break;
        case "generation": {
          // Store history without genomeProfile to save memory
          const { genomeProfile: gp, ...statsWithoutProfile } = msg.stats;
          setHistory((prev) => {
            const next = [...prev, { ...statsWithoutProfile, genomeProfile: null }];
            // Keep max 500 entries to prevent memory growth
            return next.length > 500 ? next.slice(-500) : next;
          });
          if (gp) {
            setGenomeProfile(gp);
            setFirstProfile((prev) => prev ?? gp);
          }
          break;
        }
        case "agentInfo":
          setAgentInfo(msg.info);
          break;
        case "ready":
          break;
      }
    };

    workerRef.current = worker;
    worker.postMessage({ type: "init", config: initialConfig } satisfies WorkerCommand);

    return () => worker.terminate();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const start = useCallback(() => {
    workerRef.current?.postMessage({ type: "start" } satisfies WorkerCommand);
    setRunning(true);
  }, []);

  const pause = useCallback(() => {
    workerRef.current?.postMessage({ type: "pause" } satisfies WorkerCommand);
    setRunning(false);
  }, []);

  const reset = useCallback((config: SimConfig) => {
    workerRef.current?.postMessage({ type: "reset", config } satisfies WorkerCommand);
    setRunning(false);
    setState(null);
    setHistory([]);
    setAgentInfo(null);
    setGenomeProfile(null);
    setFirstProfile(null);
  }, []);

  const changeSpeed = useCallback((fps: number) => {
    setSpeed(fps);
    workerRef.current?.postMessage({ type: "setSpeed", fps } satisfies WorkerCommand);
  }, []);

  const updateConfig = useCallback((config: Partial<SimConfig>) => {
    workerRef.current?.postMessage({ type: "updateConfig", config } satisfies WorkerCommand);
  }, []);

  const inspectAgent = useCallback((x: number, y: number) => {
    workerRef.current?.postMessage({ type: "inspectAgent", x, y } satisfies WorkerCommand);
  }, []);

  return {
    state, running, speed, history, agentInfo, genomeProfile, firstProfile,
    start, pause, reset, changeSpeed, updateConfig, inspectAgent,
  };
}
