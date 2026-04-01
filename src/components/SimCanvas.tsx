import { useRef, useEffect, useCallback, useState } from "react";
import { getChallengeOverlay, type OverlayShape } from "../simulation/challenge-overlay";
import { CHALLENGE_INFO } from "../simulation/challenge-descriptions";

export interface SimState {
  generation: number;
  simStep: number;
  population: number;
  survivors: number;
  agentLocations: Float32Array;
  agentColors: Uint8Array;
  barrierLocations: Uint16Array;
  signalLayers: Float32Array[];
  killEvents: Float32Array;
  gridSize: { x: number; y: number };
}

interface SimCanvasProps {
  state: SimState | null;
  width: number;
  height: number;
  showSignals?: boolean;
  challenge?: number;
  stepsPerGeneration?: number;
  running?: boolean;
  onToggle?: () => void;
}

export default function SimCanvas({
  state,
  width,
  height,
  showSignals = true,
  challenge = 6,
  stepsPerGeneration = 300,
  running = false,
  onToggle,
}: SimCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prevGenRef = useRef<number>(0);
  const [pulse, setPulse] = useState(false);
  const [flashIcon, setFlashIcon] = useState<'play' | 'pause' | null>(null);
  const spawnStartRef = useRef<number>(0);
  const killParticlesRef = useRef<{ x: number; y: number; birthTime: number }[]>([]);
  const KILL_FADE_MS = 1400;
  const [recording, setRecording] = useState(false);

  // Detect generation change
  useEffect(() => {
    const gen = state?.generation ?? 0;
    if (gen !== prevGenRef.current) {
      prevGenRef.current = gen;
      spawnStartRef.current = performance.now();
      if (gen > 0) {
        setPulse(true);
        const id = setTimeout(() => setPulse(false), 600);
        return () => clearTimeout(id);
      }
    }
  }, [state?.generation]);

  // Absorb incoming kill events from simulation state
  useEffect(() => {
    if (!state?.killEvents?.length) return;
    const now = performance.now();
    for (let i = 0; i < state.killEvents.length; i += 2) {
      killParticlesRef.current.push({ x: state.killEvents[i], y: state.killEvents[i + 1], birthTime: now });
    }
  }, [state?.killEvents]);

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      if (!state) {
        ctx.fillStyle = "#09090b";
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = "#71717a";
        ctx.font = "14px ui-monospace, monospace";
        ctx.textAlign = "center";
        ctx.fillText("Waiting for simulation...", width / 2, height / 2);
        return;
      }

      const { gridSize, agentLocations, agentColors, barrierLocations, signalLayers } = state;
      const cellW = width / gridSize.x;
      const cellH = height / gridSize.y;

      // Background
      ctx.fillStyle = "#09090b";
      ctx.fillRect(0, 0, width, height);

      // Subtle grid lines
      ctx.strokeStyle = "#18181b";
      ctx.lineWidth = 0.5;
      if (cellW > 4) {
        for (let x = 0; x <= gridSize.x; x++) {
          ctx.beginPath();
          ctx.moveTo(x * cellW, 0);
          ctx.lineTo(x * cellW, height);
          ctx.stroke();
        }
        for (let y = 0; y <= gridSize.y; y++) {
          ctx.beginPath();
          ctx.moveTo(0, y * cellH);
          ctx.lineTo(width, y * cellH);
          ctx.stroke();
        }
      }

      // Challenge overlay (survival zone)
      const shapes = getChallengeOverlay(challenge, gridSize.x, gridSize.y, state.simStep, stepsPerGeneration);
      const challengeLabel = CHALLENGE_INFO[challenge]?.brief ?? '';
      drawOverlay(ctx, shapes, cellW, cellH, gridSize.x, gridSize.y, challengeLabel);

      // Signal layers (pheromones) as heatmap — only drawn when data available
      if (showSignals && signalLayers && signalLayers.length > 0 && signalLayers[0].length > 0) {
        const layer = signalLayers[0];
        for (let x = 0; x < gridSize.x; x++) {
          for (let y = 0; y < gridSize.y; y++) {
            const val = layer[x * gridSize.y + y];
            if (val > 0.01) {
              const alpha = Math.min(val, 1.0) * 0.4;
              ctx.fillStyle = `rgba(59, 130, 246, ${alpha})`;
              ctx.fillRect(x * cellW, y * cellH, cellW, cellH);
            }
          }
        }
      }

      // Barriers
      ctx.fillStyle = "#52525b";
      for (let i = 0; i < barrierLocations.length; i += 2) {
        const bx = barrierLocations[i];
        const by = barrierLocations[i + 1];
        ctx.fillRect(bx * cellW, by * cellH, cellW, cellH);
      }

      // Agents — spawn animation: gradually reveal over 2s with ease-in curve
      const agentRadius = Math.max(cellW * 0.35, 1.5);
      const spawnElapsed = performance.now() - spawnStartRef.current;
      const spawnDuration = 2000;
      const totalAgents = agentLocations.length / 2;
      let visibleCount: number;
      if (spawnElapsed >= spawnDuration) {
        visibleCount = totalAgents;
      } else {
        const t = spawnElapsed / spawnDuration;
        const eased = t * t * t; // cubic ease-in: starts slow, accelerates
        visibleCount = Math.floor(totalAgents * eased);
      }

      for (let i = 0; i < visibleCount * 2; i += 2) {
        const ax = agentLocations[i];
        const ay = agentLocations[i + 1];
        const ci = (i / 2) * 3;
        const r = agentColors[ci] ?? 128;
        const g = agentColors[ci + 1] ?? 128;
        const b = agentColors[ci + 2] ?? 128;

        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.beginPath();
        ctx.arc(
          ax * cellW + cellW / 2,
          ay * cellH + cellH / 2,
          agentRadius,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }

      // Kill events — skull emoji fades out over ~1.4s
      const now = performance.now();
      const skullSize = Math.max(cellW * 2.2, 14);
      ctx.font = `${skullSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const alive: typeof killParticlesRef.current = [];
      for (const p of killParticlesRef.current) {
        const age = now - p.birthTime;
        if (age >= KILL_FADE_MS) continue;
        alive.push(p);
        const t = age / KILL_FADE_MS;
        ctx.globalAlpha = (1 - t) * 0.9;
        ctx.fillText('💀', p.x * cellW + cellW / 2, p.y * cellH + cellH / 2);
      }
      ctx.globalAlpha = 1;
      killParticlesRef.current = alive;

      // Compass labels (drawn last, on top of everything)
      ctx.font = "bold 10px ui-sans-serif, system-ui, sans-serif";
      ctx.fillStyle = "rgba(161, 161, 170, 0.6)";
      ctx.textAlign = "center";
      ctx.fillText("N", width / 2, 12);
      ctx.fillText("S", width / 2, height - 5);
      ctx.textAlign = "left";
      ctx.fillText("W", 4, height / 2 + 4);
      ctx.textAlign = "right";
      ctx.fillText("E", width - 4, height / 2 + 4);
    },
    [state, width, height, showSignals, challenge, stepsPerGeneration]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;
    draw(ctx);

    // Continuous redraws during spawn animation
    const spawnElapsed = performance.now() - spawnStartRef.current;
    if (spawnElapsed < 2000) {
      let rafId: number;
      const animate = () => {
        if (performance.now() - spawnStartRef.current >= 2000) return;
        draw(ctx);
        rafId = requestAnimationFrame(animate);
      };
      rafId = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(rafId);
    }
  }, [draw, width, height]);

  const handleClick = useCallback(() => {
    if (!onToggle) return;
    onToggle();
    setFlashIcon(running ? 'pause' : 'play');
    const id = setTimeout(() => setFlashIcon(null), 700);
    return () => clearTimeout(id);
  }, [onToggle, running]);

  const handleScreenshot = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `darwin-dots-gen${state?.generation ?? 0}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, [state?.generation]);

  const handleRecord = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || recording) return;
    const stream = (canvas as HTMLCanvasElement & { captureStream(fps?: number): MediaStream }).captureStream(30);
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';
    const recorder = new MediaRecorder(stream, { mimeType });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `darwin-dots-gen${state?.generation ?? 0}.webm`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
      setRecording(false);
    };
    setRecording(true);
    recorder.start();
    setTimeout(() => recorder.stop(), 3000);
  }, [recording, state?.generation]);

  return (
    <div
      className="rounded-lg transition-shadow duration-500 ease-out relative"
      style={{
        boxShadow: pulse
          ? '0 0 24px 6px rgba(52, 211, 153, 0.5), 0 0 8px 2px rgba(52, 211, 153, 0.7), inset 0 0 12px 2px rgba(52, 211, 153, 0.2)'
          : 'none',
      }}
    >
      <canvas
        ref={canvasRef}
        className="rounded-lg border border-zinc-800 cursor-pointer block"
        style={{ width, height }}
        onClick={handleClick}
      />
      {/* Screenshot / Record buttons */}
      <div className="absolute bottom-2 right-2 flex gap-1.5 pointer-events-auto">
        <button
          onClick={(e) => { e.stopPropagation(); handleScreenshot(); }}
          title="Screenshot (PNG)"
          className="bg-black/50 hover:bg-black/80 text-zinc-400 hover:text-white rounded p-1.5 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); handleRecord(); }}
          title={recording ? 'Aufnahme läuft… (3s)' : 'Video aufnehmen (3s WebM)'}
          disabled={recording}
          className={`rounded p-1.5 transition-colors ${
            recording
              ? 'bg-red-600/80 text-white cursor-not-allowed'
              : 'bg-black/50 hover:bg-black/80 text-zinc-400 hover:text-red-400'
          }`}
        >
          {recording ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="6"/>
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="23 7 16 12 23 17 23 7"/>
              <rect x="1" y="5" width="15" height="14" rx="2"/>
            </svg>
          )}
        </button>
      </div>

      {flashIcon && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none rounded-lg"
          style={{ animation: 'fadeOutIcon 0.7s ease-out forwards' }}
        >
          <div className="bg-black/60 rounded-full p-4">
            {flashIcon === 'play' ? (
              <svg width="40" height="40" viewBox="0 0 24 24" fill="white">
                <polygon points="5,3 19,12 5,21" />
              </svg>
            ) : (
              <svg width="40" height="40" viewBox="0 0 24 24" fill="white">
                <rect x="5" y="3" width="4" height="18" />
                <rect x="15" y="3" width="4" height="18" />
              </svg>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Overlay drawing helpers
// ---------------------------------------------------------------------------

/**
 * Draw a radioactive trefoil symbol (☢) at the given center position.
 */
function drawTrefoil(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  const r = size * 0.4;       // blade radius
  const ir = size * 0.12;     // inner circle radius
  const gap = Math.PI / 12;   // gap between blades

  ctx.save();
  ctx.translate(cx, cy);

  // Three blades at 120-degree intervals
  for (let i = 0; i < 3; i++) {
    const angle = (i * 2 * Math.PI) / 3 - Math.PI / 2;
    ctx.beginPath();
    ctx.arc(0, 0, r, angle + gap, angle + (2 * Math.PI) / 3 - gap);
    ctx.arc(0, 0, ir, angle + (2 * Math.PI) / 3 - gap, angle + gap, true);
    ctx.closePath();
    ctx.fill();
  }

  // Center dot
  ctx.beginPath();
  ctx.arc(0, 0, ir * 0.6, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  shapes: OverlayShape[],
  cellW: number,
  cellH: number,
  gridSizeX: number,
  gridSizeY: number,
  label?: string,
) {
  let labelDrawn = false;
  for (const shape of shapes) {
    switch (shape.type) {
      case 'circle': {
        ctx.fillStyle = "rgba(16, 185, 129, 0.15)";
        ctx.strokeStyle = "rgba(16, 185, 129, 0.6)";
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.arc(
          shape.cx * cellW + cellW / 2,
          shape.cy * cellH + cellH / 2,
          shape.radius * cellW,
          0,
          Math.PI * 2
        );
        ctx.fill();
        ctx.stroke();
        ctx.setLineDash([]);
        break;
      }

      case 'rect': {
        ctx.fillStyle = "rgba(16, 185, 129, 0.15)";
        ctx.strokeStyle = "rgba(16, 185, 129, 0.6)";
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.fillRect(shape.x * cellW, shape.y * cellH, shape.w * cellW, shape.h * cellH);
        ctx.strokeRect(shape.x * cellW, shape.y * cellH, shape.w * cellW, shape.h * cellH);
        ctx.setLineDash([]);
        break;
      }

      case 'border': {
        ctx.strokeStyle = "rgba(16, 185, 129, 0.6)";
        ctx.lineWidth = Math.max(shape.thickness * cellW, 3);
        ctx.setLineDash([6, 3]);
        ctx.strokeRect(0, 0, gridSizeX * cellW, gridSizeY * cellH);
        ctx.setLineDash([]);
        break;
      }

      case 'radioactive-wall': {
        // Per-column danger gradient: intensity = 1/distFromActiveWall
        const totalW = gridSizeX * cellW;
        const totalH = gridSizeY * cellH;
        const isWest = shape.activeWall === 'west';

        for (let col = 0; col < shape.dangerWidth; col++) {
          const distFromWall = col + 1;
          const alpha = Math.min(0.55, 0.55 / distFromWall);
          if (alpha < 0.01) continue;
          ctx.fillStyle = `rgba(234, 179, 8, ${alpha})`;
          const xPos = isWest ? col * cellW : totalW - (col + 1) * cellW;
          ctx.fillRect(xPos, 0, cellW, totalH);
        }

        // Trefoil symbols along the active wall edge
        const symbolSize = Math.max(cellW * 2.5, 10);
        ctx.fillStyle = 'rgba(234, 179, 8, 0.7)';
        const spacing = Math.max(symbolSize * 4, 60);
        const wallX = isWest ? symbolSize * 0.5 : totalW - symbolSize * 0.5;
        for (let y = spacing; y < totalH - spacing / 2; y += spacing) {
          drawTrefoil(ctx, wallX, y, symbolSize);
        }

        // Boundary line at midpoint (safe side starts here)
        const midX = isWest ? shape.dangerWidth * cellW : totalW - shape.dangerWidth * cellW;
        ctx.strokeStyle = 'rgba(234, 179, 8, 0.45)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(midX, 0);
        ctx.lineTo(midX, totalH);
        ctx.stroke();
        ctx.setLineDash([]);
        break;
      }
    }

    // Draw label once, positioned near the first shape
    if (!labelDrawn && label && shape.type !== 'radioactive-wall') {
      labelDrawn = true;
      let lx: number, ly: number;
      if (shape.type === 'circle') {
        lx = shape.cx * cellW + cellW / 2;
        ly = shape.cy * cellH + cellH / 2 + shape.radius * cellW + 16;
      } else if (shape.type === 'rect') {
        lx = shape.x * cellW + (shape.w * cellW) / 2;
        ly = shape.y * cellH + (shape.h * cellH) / 2;
      } else {
        lx = (gridSizeX * cellW) / 2;
        ly = 20;
      }
      // Clamp within canvas bounds
      ly = Math.min(ly, gridSizeY * cellH - 8);
      ly = Math.max(ly, 14);
      lx = Math.max(lx, 10);
      lx = Math.min(lx, gridSizeX * cellW - 10);

      ctx.font = "10px ui-sans-serif, system-ui, sans-serif";
      ctx.textAlign = "center";
      const metrics = ctx.measureText(label);
      const pad = 4;
      ctx.fillStyle = "rgba(9, 9, 11, 0.7)";
      ctx.beginPath();
      ctx.roundRect(lx - metrics.width / 2 - pad, ly - 10, metrics.width + pad * 2, 14, 3);
      ctx.fill();
      ctx.fillStyle = "rgba(16, 185, 129, 0.7)";
      ctx.fillText(label, lx, ly);
    }
  }
}
