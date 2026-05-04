import { useState } from "react";
import type { SimConfig } from "./ControlPanel";
import { DEFAULT_CONFIG } from "./ControlPanel";
import { PRESETS } from "./Presets";

interface SplashScreenProps {
  onStart: (config: SimConfig) => void;
  onOpenTutorial?: () => void;
}

export default function SplashScreen({ onStart, onOpenTutorial }: SplashScreenProps) {
  const [hoveredPreset, setHoveredPreset] = useState<number | null>(null);

  return (
    <div className="fixed inset-0 bg-zinc-950 flex flex-col items-center justify-center z-50 overflow-y-auto">
      {/* Starfield background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 80 }, (_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-zinc-600 animate-pulse"
            style={{
              width: Math.random() > 0.8 ? 2 : 1,
              height: Math.random() > 0.8 ? 2 : 1,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              opacity: 0.2 + Math.random() * 0.4,
              animationDelay: `${Math.random() * 4}s`,
              animationDuration: `${2 + Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center px-6 py-12 max-w-2xl w-full">

        {/* ASCII creature as logo */}
        <pre className="font-mono text-[14px] leading-[16px] select-none mb-6 text-center">
          <span className="text-yellow-300">{"  ~"}</span>
          <span className="text-zinc-600">{"\\"}</span>
          <span className="text-zinc-600">{"  "}</span>
          <span className="text-zinc-600">{"/"}</span>
          <span className="text-red-400">{"!"}</span>
          {"\n"}
          <span className="text-cyan-400">{" ◉"}</span>
          <span className="text-zinc-600">{" "}</span>
          <span className="text-cyan-400">{"◉"}</span>
          <span className="text-zinc-600">{" "}</span>
          <span className="text-cyan-400">{"◉"}</span>
          {"\n"}
          <span className="text-violet-400">{"╔██████╗"}</span>
          {"\n"}
          <span className="text-violet-400">{"║"}</span>
          <span className="text-violet-400">{"◆◆◆◆◆"}</span>
          <span className="text-violet-400">{"║"}</span>
          {"\n"}
          <span className="text-violet-400">{"╚══════╝"}</span>
          {"\n"}
          <span className="text-emerald-400">{" ▓▓▓▓▓▓"}</span>
          {"\n"}
          <span className="text-emerald-400">{" ▓▓▓▓▓▓"}</span>
          {"\n"}
          <span className="text-zinc-100">{" ╿    ╿"}</span>
          {"\n"}
          <span className="text-zinc-100">{" │    │"}</span>
        </pre>

        {/* Title */}
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-center mb-2">
          <span className="text-emerald-400">Darwin's</span>{" "}
          <span className="text-zinc-100">Arena</span>
        </h1>

        {/* Subtitle */}
        <p className="text-zinc-500 text-sm text-center mb-1">
          Natural Selection in Real Time
        </p>
        <p className="text-zinc-600 text-xs text-center mb-4">
          Watch neural networks evolve to master challenges
        </p>

        {onOpenTutorial && (
          <button
            onClick={onOpenTutorial}
            className="text-xs text-zinc-500 hover:text-emerald-400 transition-colors border border-zinc-800 hover:border-emerald-800 rounded-md px-4 py-1.5 mb-6 mt-1"
          >
            How does it work? →
          </button>
        )}

        {/* Divider */}
        <div className="w-48 h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent mb-8" />

        {/* Preset selection */}
        <div className="w-full max-w-md">
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest text-center mb-4">
            Choose Your Challenge
          </p>

          <div className="grid grid-cols-2 gap-2 mb-6">
            {PRESETS.map((preset, i) => {
              const isKill = preset.config.killEnable;
              return (
              <button
                key={preset.name}
                onClick={() => onStart({ ...DEFAULT_CONFIG, ...preset.config })}
                onMouseEnter={() => setHoveredPreset(i)}
                onMouseLeave={() => setHoveredPreset(null)}
                className={`text-left rounded-lg px-3 py-3 transition-all duration-200 border ${
                  hoveredPreset === i
                    ? isKill
                      ? "bg-red-950/50 border-red-800/60 shadow-lg shadow-red-900/20"
                      : "bg-emerald-950/50 border-emerald-800/60 shadow-lg shadow-emerald-900/20"
                    : "bg-zinc-900/60 border-zinc-800/60 hover:border-zinc-700"
                }`}
              >
                <div className={`text-sm font-semibold transition-colors ${
                  hoveredPreset === i
                    ? isKill ? "text-red-300" : "text-emerald-300"
                    : "text-zinc-200"
                }`}>
                  {preset.name}
                </div>
                <div className="text-[10px] text-zinc-500 leading-tight mt-1 line-clamp-2">
                  {preset.description}
                </div>
              </button>
              );
            })}
          </div>

          {/* Custom start */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-32 h-px bg-zinc-800" />
            <button
              onClick={() => onStart(DEFAULT_CONFIG)}
              className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              or start with default settings
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="text-[9px] text-zinc-700 italic">
            "It is not the strongest of the species that survives, but the one most adaptable to change."
          </p>
          <p className="text-[9px] text-zinc-700 mt-1">
            — inspired by biosim4
          </p>
          <p className="text-[9px] text-zinc-700 mt-4">
            <a
              href="https://implisense.com/de"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-zinc-500 transition-colors"
            >
              Impressum
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
