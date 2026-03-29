import type { GenomeProfile } from "../simulation/genome-profile";
import { humanLabel } from "../simulation/labels";

interface GenomeGraphProps {
  profile: GenomeProfile | null;
  width: number;
  height: number;
}

export default function GenomeGraph({ profile, width, height }: GenomeGraphProps) {
  if (!profile || profile.topConnections.length === 0) {
    return (
      <div
        className="bg-zinc-900 rounded-lg border border-zinc-800 flex items-center justify-center text-zinc-600 text-xs"
        style={{ width, height }}
      >
        Waiting for first generation...
      </div>
    );
  }

  return (
    <div
      className="bg-zinc-900 rounded-lg border border-zinc-800 p-2 flex flex-col"
      style={{ width, height }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-1.5 px-1 flex-shrink-0">
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
          Consensus Genome
        </span>
        <span className="text-[10px] text-zinc-600 font-mono">
          {profile.avgGenomeLength}G / {profile.avgNeuronCount}N
        </span>
      </div>

      {/* Connection list */}
      <div className="flex-1 overflow-y-auto space-y-0.5 min-h-0">
        {profile.topConnections.map((c, i) => {
          const pct = Math.round(c.frequency * 100);
          const isPositive = c.avgWeight >= 0;

          return (
            <div key={i} className="flex items-center gap-1 text-[10px] h-[18px]">
              {/* Frequency bar */}
              <div className="w-6 flex-shrink-0 text-right font-mono text-zinc-600">
                {pct}%
              </div>

              {/* From */}
              <span className={`flex-shrink-0 ${c.fromType === 'sensor' ? 'text-cyan-400' : 'text-violet-400'}`}>
                {humanLabel(c.from, c.fromType)}
              </span>

              {/* Arrow with weight color */}
              <span className={`flex-shrink-0 ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                →
              </span>

              {/* To */}
              <span className={`flex-shrink-0 ${c.toType === 'action' ? 'text-amber-400' : 'text-violet-400'}`}>
                {humanLabel(c.to, c.toType)}
              </span>

              {/* Weight */}
              <div className="flex-1" />
              <div className="flex items-center gap-1 flex-shrink-0">
                <div className="w-8 h-1 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${isPositive ? 'bg-emerald-500' : 'bg-red-500'}`}
                    style={{ width: `${Math.min(Math.abs(c.avgWeight) / 4 * 100, 100)}%` }}
                  />
                </div>
                <span className="font-mono text-zinc-600 w-8 text-right">
                  {isPositive ? '+' : ''}{c.avgWeight.toFixed(1)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-3 mt-1.5 pt-1 border-t border-zinc-800 flex-shrink-0">
        <span className="text-[9px] flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block" />
          <span className="text-zinc-600">Sensor</span>
        </span>
        <span className="text-[9px] flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 inline-block" />
          <span className="text-zinc-600">Neuron</span>
        </span>
        <span className="text-[9px] flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
          <span className="text-zinc-600">Action</span>
        </span>
      </div>
    </div>
  );
}
