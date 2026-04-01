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

      case 'radioactive': {
        const maxZone = Math.floor(gridSizeX / 2) - 4;
        const wallZone = Math.floor((shape.step / shape.maxSteps) * maxZone);
        const totalW = gridSizeX * cellW;
        const totalH = gridSizeY * cellH;

        if (wallZone > 0) {
          // Radioactive zone fill with gradient intensity
          const zoneW = wallZone * cellW;
          const zoneH = wallZone * cellH;
          const intensity = Math.min(0.4, 0.15 + wallZone * 0.005);
          ctx.fillStyle = `rgba(234, 179, 8, ${intensity})`;

          // Top
          ctx.fillRect(0, 0, totalW, zoneH);
          // Bottom
          ctx.fillRect(0, totalH - zoneH, totalW, zoneH);
          // Left
          ctx.fillRect(0, zoneH, zoneW, totalH - 2 * zoneH);
          // Right
          ctx.fillRect(totalW - zoneW, zoneH, zoneW, totalH - 2 * zoneH);

          // Radioactive trefoil symbols scattered along the advancing front
          const symbolSize = Math.max(cellW * 2.5, 10);
          ctx.fillStyle = `rgba(234, 179, 8, ${Math.min(0.7, 0.3 + wallZone * 0.008)})`;
          const spacing = Math.max(symbolSize * 4, 60);

          // Top edge
          for (let x = spacing; x < totalW - spacing; x += spacing) {
            drawTrefoil(ctx, x, wallZone * cellH - symbolSize * 0.5, symbolSize);
          }
          // Bottom edge
          for (let x = spacing * 1.5; x < totalW - spacing; x += spacing) {
            drawTrefoil(ctx, x, totalH - wallZone * cellH + symbolSize * 0.5, symbolSize);
          }
          // Left edge
          for (let y = zoneH + spacing; y < totalH - zoneH - spacing; y += spacing) {
            drawTrefoil(ctx, wallZone * cellW - symbolSize * 0.5, y, symbolSize);
          }
          // Right edge
          for (let y = zoneH + spacing * 1.5; y < totalH - zoneH - spacing; y += spacing) {
            drawTrefoil(ctx, totalW - wallZone * cellW + symbolSize * 0.5, y, symbolSize);
          }

          // Inner boundary line (safe zone border)
          ctx.strokeStyle = `rgba(234, 179, 8, 0.5)`;
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);
          ctx.strokeRect(zoneW, zoneH, totalW - 2 * zoneW, totalH - 2 * zoneH);
          ctx.setLineDash([]);
        }

        // Safe zone label
        ctx.fillStyle = "rgba(16, 185, 129, 0.4)";
        ctx.font = `${Math.max(10, cellW * 2)}px ui-monospace, monospace`;
        ctx.textAlign = "center";
        const safeW = (gridSizeX - 2 * wallZone);
        if (safeW > 10) {
          ctx.fillText(
            `${safeW}x${safeW}`,
            totalW / 2,
            totalH / 2 + cellW,
          );
        }
        break;
      }
    }

    // Draw label once, positioned near the first shape
    if (!labelDrawn && label && shape.type !== 'radioactive') {
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
