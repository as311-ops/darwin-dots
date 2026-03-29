import type { MatchSummary as MatchSummaryType } from "../simulation/commentary";

interface MatchSummaryProps {
  summary: MatchSummaryType;
  onClose: () => void;
}

export default function MatchSummary({ summary, onClose }: MatchSummaryProps) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-8">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl max-w-xl w-full shadow-2xl">
        {/* Header bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
              ABPFIFF
            </span>
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
              Spielzusammenfassung
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
        <div className="px-5 pb-5 space-y-3">
          {summary.paragraphs.map((p, i) => (
            <p key={i} className="text-sm text-zinc-400 leading-relaxed">
              {p}
            </p>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-zinc-800 flex justify-end">
          <button
            onClick={onClose}
            className="bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-xs font-medium py-2 px-4 rounded-md transition-colors"
          >
            Weiter beobachten
          </button>
        </div>
      </div>
    </div>
  );
}
