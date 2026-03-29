import { useRef, useEffect, useCallback, useState } from "react";
import { getChallengeOverlay, type OverlayShape } from "../simulation/challenge-overlay";

export interface SimState {
  generation: number;
  simStep: number;
  population: number;
  survivors: number;
  agentLocations: Float32Array;
  agentColors: Uint8Array;
  barrierLocations: Uint16Array;
  signalLayers: Float32Array[];
  gridSize: { x: number; y: number };
}

interface SimCanvasProps {
  state: SimState | null;
  width: number;
  height: number;
  showSignals?: boolean;
  challenge?: number;
  stepsPerGeneration?: number;
  selectedAgent?: { x: number; y: number } | null;
  selectedAgentName?: string | null;
  onAgentClick?: (gridX: number, gridY: number) => void;
}

export default function SimCanvas({
  state,
  width,
  height,
  showSignals = true,
  challenge = 6,
  stepsPerGeneration = 300,
  selectedAgent,
  selectedAgentName,
  onAgentClick,
}: SimCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prevGenRef = useRef<number>(0);
  const [pulse, setPulse] = useState(false);

  // Detect generation change
  useEffect(() => {
    const gen = state?.generation ?? 0;
    if (gen > 0 && gen !== prevGenRef.current) {
      prevGenRef.current = gen;
      setPulse(true);
      const id = setTimeout(() => setPulse(false), 400);
      return () => clearTimeout(id);
    }
  }, [state?.generation]);

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
      drawOverlay(ctx, shapes, cellW, cellH, gridSize.x, gridSize.y);

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

      // Agents
      const agentRadius = Math.max(cellW * 0.35, 1.5);
      for (let i = 0; i < agentLocations.length; i += 2) {
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

      // Selected agent highlight
      if (selectedAgent) {
        ctx.strokeStyle = "#f59e0b";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(
          selectedAgent.x * cellW + cellW / 2,
          selectedAgent.y * cellH + cellH / 2,
          agentRadius + 4,
          0,
          Math.PI * 2
        );
        ctx.stroke();

        // Crosshair lines
        ctx.strokeStyle = "rgba(245, 158, 11, 0.3)";
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        const cx = selectedAgent.x * cellW + cellW / 2;
        const cy = selectedAgent.y * cellH + cellH / 2;
        ctx.beginPath();
        ctx.moveTo(cx, 0);
        ctx.lineTo(cx, height);
        ctx.moveTo(0, cy);
        ctx.lineTo(width, cy);
        ctx.stroke();
        ctx.setLineDash([]);

        // Name label
        if (selectedAgentName) {
          const labelY = cy - agentRadius - 10;
          ctx.font = "bold 11px ui-sans-serif, system-ui, sans-serif";
          ctx.textAlign = "center";
          const metrics = ctx.measureText(selectedAgentName);
          const pad = 4;
          ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
          ctx.beginPath();
          ctx.roundRect(
            cx - metrics.width / 2 - pad,
            labelY - 9,
            metrics.width + pad * 2,
            14,
            3,
          );
          ctx.fill();
          ctx.fillStyle = "#f59e0b";
          ctx.fillText(selectedAgentName, cx, labelY);
        }
      }
    },
    [state, width, height, showSignals, challenge, stepsPerGeneration, selectedAgent, selectedAgentName]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;
    draw(ctx);
  }, [draw, width, height]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!state || !onAgentClick) return;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const px = (e.clientX - rect.left) * scaleX;
      const py = (e.clientY - rect.top) * scaleY;

      const gridX = Math.floor(px / (width / state.gridSize.x));
      const gridY = Math.floor(py / (height / state.gridSize.y));

      if (gridX >= 0 && gridX < state.gridSize.x && gridY >= 0 && gridY < state.gridSize.y) {
        onAgentClick(gridX, gridY);
      }
    },
    [state, width, height, onAgentClick]
  );

  return (
    <div
      className="rounded-lg transition-shadow duration-400 ease-out"
      style={{
        boxShadow: pulse
          ? '0 0 12px 2px rgba(52, 211, 153, 0.4), inset 0 0 8px 1px rgba(52, 211, 153, 0.15)'
          : 'none',
      }}
    >
      <canvas
        ref={canvasRef}
        className="rounded-lg border border-zinc-800 cursor-crosshair block"
        style={{ width, height }}
        onClick={handleClick}
      />
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
) {
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
  }
}
