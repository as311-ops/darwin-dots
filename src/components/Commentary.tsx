import { useRef, useEffect } from "react";
import type { CommentaryLine } from "../simulation/commentary";

interface CommentaryProps {
  lines: CommentaryLine[];
  width?: number;
}

const TYPE_STYLES: Record<string, { badge: string; badgeBg: string; textColor: string }> = {
  hype: { badge: 'LIVE', badgeBg: 'bg-red-600', textColor: 'text-zinc-100' },
  analysis: { badge: 'ANALYSIS', badgeBg: 'bg-violet-700', textColor: 'text-zinc-300' },
  concern: { badge: 'ALERT', badgeBg: 'bg-amber-600', textColor: 'text-amber-200' },
  milestone: { badge: 'MILESTONE', badgeBg: 'bg-emerald-700', textColor: 'text-emerald-200' },
};

export default function Commentary({ lines, width }: CommentaryProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [lines.length]);

  return (
    <div
      className="bg-zinc-900 rounded-lg border border-zinc-800 flex flex-col"
      style={width ? { width } : undefined}
    >
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-zinc-800">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
        </span>
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
          Live Commentary
        </span>
      </div>

      <div
        ref={scrollRef}
        className="overflow-y-auto px-3 py-2 space-y-2 max-h-48"
      >
        {lines.length === 0 && (
          <div className="text-zinc-600 text-xs italic py-2">
            Start the simulation to hear commentary...
          </div>
        )}
        {[...lines].reverse().map((line, i) => {
          const style = TYPE_STYLES[line.type] ?? TYPE_STYLES.analysis;
          return (
            <div key={i} className="flex gap-2 items-start text-xs leading-relaxed">
              <span className="flex-shrink-0 mt-0.5 flex items-center gap-1">
                <span className="text-zinc-600 font-mono text-[10px] w-5 text-right">
                  {line.generation}
                </span>
                <span className={`${style.badgeBg} text-white text-[9px] font-bold px-1 py-px rounded`}>
                  {style.badge}
                </span>
              </span>
              <span className={style.textColor}>{line.text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
