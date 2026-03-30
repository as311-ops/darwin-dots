import type { MatchSummary as MatchSummaryType } from "../simulation/commentary";
import type { GenomeProfile } from "../simulation/genome-profile";
import type { Genome } from "../simulation/types";
import CreatureAvatar from "./CreatureAvatar";

interface MatchSummaryProps {
  summary: MatchSummaryType;
  genomeProfile?: GenomeProfile | null;
  championGenome?: Genome | null;
  onShareGenome?: () => void;
  onClose: () => void;
}

export default function MatchSummary({
  summary,
  genomeProfile,
  championGenome,
  onShareGenome,
  onClose,
}: MatchSummaryProps) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl max-w-xl w-full shadow-2xl my-8">
        {/* Header bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
              FINAL WHISTLE
            </span>
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
              Match Summary
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 text-sm px-2 py-1"
          >
            x
          </button>
        </div>

        {/* Headline */}
        <div className="px-5 pt-4 pb-2">
          <h2 className="text-lg font-semibold text-zinc-100 leading-tight">
            {summary.headline}
          </h2>
        </div>

        {/* Body */}
        <div className="px-5 pb-4 space-y-3">
          {summary.paragraphs.map((p, i) => (
            <p key={i} className="text-sm text-zinc-400 leading-relaxed">
              {p}
            </p>
          ))}
        </div>

        {/* Strategy Explainer + Avatar */}
        {(summary.strategyExplainer || genomeProfile) && (
          <div className="px-5 pb-4">
            <div className="bg-zinc-800/50 rounded-lg border border-zinc-700/50 p-4">
              <div className="text-[10px] text-emerald-500 uppercase tracking-wider font-bold mb-3">
                Winning Strategy
              </div>
              <div className="flex gap-4 items-start">
                {genomeProfile && (
                  <div className="flex-shrink-0 w-[140px]">
                    <CreatureAvatar profile={genomeProfile} label="Champion" />
                  </div>
                )}
                {summary.strategyExplainer && (
                  <p className="text-sm text-zinc-300 leading-relaxed flex-1">
                    {summary.strategyExplainer}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Darwin Quote */}
        {summary.darwinQuote && (
          <div className="px-5 pb-4">
            <div className="bg-zinc-800/30 rounded-lg border border-zinc-800 p-4 flex gap-3">
              <span className="text-2xl flex-shrink-0">🧔</span>
              <p className="text-xs text-zinc-500 italic leading-relaxed">
                {summary.darwinQuote}
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-3 border-t border-zinc-800 flex justify-between items-center">
          {onShareGenome && championGenome ? (
            <button
              onClick={onShareGenome}
              className="bg-emerald-800 hover:bg-emerald-700 text-emerald-200 text-xs font-medium py-2 px-4 rounded-md transition-colors"
            >
              Share Genome
            </button>
          ) : (
            <div />
          )}
          <button
            onClick={onClose}
            className="bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-xs font-medium py-2 px-4 rounded-md transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
