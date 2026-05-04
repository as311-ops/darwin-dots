import { useState } from "react";
import { createPortal } from "react-dom";
import type { SimConfig } from "./ControlPanel";
import { DEFAULT_CONFIG } from "./ControlPanel";
import { PRESETS } from "./Presets";

interface TutorialWizardProps {
  onClose: () => void;
  onFinish: (startConfig?: SimConfig) => void;
  fromSplash: boolean;
}

const STEPS = [
  {
    subtitle: "WAS IST DAS?",
    title: "Darwin's Arena",
    body: "Ein lebendiges Evolutionsexperiment. Hunderte Kreaturen — jede mit einem neuronalen Netz als Gehirn — konkurrieren, passen sich an und sterben. Über Generationen überleben nur die Fittesten und geben ihre Gene weiter. Du schaust natürlicher Selektion in Echtzeit zu.",
    visual: (
      <pre className="font-mono text-[13px] leading-[16px] select-none text-center">
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
        <span className="text-violet-400">{"║◆◆◆◆◆║"}</span>
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
    ),
  },
  {
    subtitle: "DIE SPIELER",
    title: "Darwin-Dots",
    body: "Jede Kreatur ist ein autonomer Agent auf einem 2D-Gitter. Sie nimmt ihre Umgebung über Sensoren wahr, verarbeitet die Eingaben in einem neuronalen Netz und führt jeden Simulationsschritt Aktionen aus. Keine hartcodierten Regeln — alles Verhalten entsteht aus evolvierten Genen.",
    visual: (
      <svg width="240" height="90" viewBox="0 0 240 90" className="mx-auto">
        <circle cx="60" cy="45" r="14" fill="#10b981" opacity="0.9" />
        <text x="60" y="49" textAnchor="middle" fontSize="10" fill="white">🦠</text>
        <line x1="10" y1="25" x2="46" y2="39" stroke="#06b6d4" strokeWidth="1.5" markerEnd="url(#arr-in)" />
        <line x1="10" y1="45" x2="46" y2="45" stroke="#06b6d4" strokeWidth="1.5" markerEnd="url(#arr-in)" />
        <line x1="10" y1="65" x2="46" y2="51" stroke="#06b6d4" strokeWidth="1.5" markerEnd="url(#arr-in)" />
        <text x="2" y="23" fontSize="8" fill="#06b6d4">👁</text>
        <text x="2" y="43" fontSize="8" fill="#06b6d4">📡</text>
        <text x="2" y="63" fontSize="8" fill="#06b6d4">🧭</text>
        <circle cx="120" cy="30" r="10" fill="#7c3aed" opacity="0.7" />
        <circle cx="120" cy="60" r="10" fill="#7c3aed" opacity="0.7" />
        <line x1="74" y1="41" x2="110" y2="34" stroke="#a78bfa" strokeWidth="1" strokeDasharray="3,2" />
        <line x1="74" y1="49" x2="110" y2="56" stroke="#a78bfa" strokeWidth="1" strokeDasharray="3,2" />
        <circle cx="190" cy="45" r="14" fill="#f59e0b" opacity="0.9" />
        <text x="190" y="49" textAnchor="middle" fontSize="10" fill="white">🦠</text>
        <line x1="130" y1="34" x2="176" y2="41" stroke="#fbbf24" strokeWidth="1.5" markerEnd="url(#arr-out)" />
        <line x1="130" y1="56" x2="176" y2="49" stroke="#fbbf24" strokeWidth="1.5" markerEnd="url(#arr-out)" />
        <line x1="204" y1="39" x2="230" y2="28" stroke="#fbbf24" strokeWidth="1.5" markerEnd="url(#arr-out)" />
        <line x1="204" y1="51" x2="230" y2="62" stroke="#fbbf24" strokeWidth="1.5" markerEnd="url(#arr-out)" />
        <text x="226" y="26" fontSize="8" fill="#fbbf24">↑</text>
        <text x="226" y="60" fontSize="8" fill="#fbbf24">↓</text>
        <defs>
          <marker id="arr-in" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#06b6d4" />
          </marker>
          <marker id="arr-out" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#fbbf24" />
          </marker>
        </defs>
        <text x="50" y="84" fontSize="8" fill="#6b7280" textAnchor="middle">Sensoren</text>
        <text x="120" y="84" fontSize="8" fill="#6b7280" textAnchor="middle">Neuronen</text>
        <text x="190" y="84" fontSize="8" fill="#6b7280" textAnchor="middle">Aktionen</text>
      </svg>
    ),
  },
  {
    subtitle: "DER BAUPLAN",
    title: "Genome & Gene",
    body: "Jede Kreatur trägt ein Genom: eine Folge von Genen. Jedes Gen kodiert eine Verbindung: eine Quelle (Sensor oder Neuron), ein Gewicht (wie stark sie beeinflusst) und ein Ziel (Neuron oder Aktion). Das Genom ist der vollständige Schaltplan des Gehirns — als Liste von 32-Bit-Integers.",
    visual: (
      <div className="font-mono text-[11px] leading-relaxed text-center space-y-1">
        <div className="text-zinc-500 mb-2">Ein Gen = eine Synapsen-Verbindung</div>
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <span className="bg-cyan-950/60 border border-cyan-800/40 text-cyan-300 rounded px-2 py-1">
            QUELLE<br /><span className="text-[9px] text-cyan-500">Sensor / Neuron</span>
          </span>
          <div className="text-center">
            <div className="text-emerald-400 font-bold">+2.4</div>
            <div className="text-zinc-600 text-[9px]">Gewicht</div>
            <div className="text-zinc-700">──→</div>
          </div>
          <span className="bg-violet-950/60 border border-violet-800/40 text-violet-300 rounded px-2 py-1">
            ZIEL<br /><span className="text-[9px] text-violet-500">Neuron / Aktion</span>
          </span>
        </div>
        <div className="text-zinc-600 text-[9px] mt-3">
          Genome mit 4–64 Genen · bis zu 20 Neuronen
        </div>
      </div>
    ),
  },
  {
    subtitle: "WAHRNEHMUNG",
    title: "Was eine Kreatur sieht",
    body: "Jede Kreatur liest bis zu 21 Sensorkanäle, alle normalisiert auf 0,0–1,0. Diese zeigen ihr, wo sie ist, wie dicht ihre Nachbarschaft ist, wie nah Wände und Barrieren sind, welche Pheromon-Spuren in der Nähe sind und mehr. Gene verdrahten diese Eingaben ins Gehirn.",
    visual: (
      <div className="grid grid-cols-2 gap-1.5 text-[10px]">
        {[
          { label: "LOC_X / LOC_Y", desc: "Position", color: "text-cyan-300 bg-cyan-950/60 border-cyan-800/40" },
          { label: "POPULATION", desc: "Nachbarn", color: "text-emerald-300 bg-emerald-950/60 border-emerald-800/40" },
          { label: "BARRIER_FWD", desc: "Wände & Barrieren", color: "text-red-300 bg-red-950/60 border-red-800/40" },
          { label: "BOUNDARY_DIST", desc: "Abstand Rand", color: "text-orange-300 bg-orange-950/60 border-orange-800/40" },
          { label: "SIGNAL0", desc: "Pheromon-Spur", color: "text-yellow-300 bg-yellow-950/60 border-yellow-800/40" },
          { label: "RANDOM / OSC1", desc: "Intern / Zufall", color: "text-zinc-300 bg-zinc-800/60 border-zinc-700/40" },
        ].map(s => (
          <div key={s.label} className={`rounded border px-2 py-1 ${s.color}`}>
            <div className="font-mono font-semibold">{s.label}</div>
            <div className="text-[9px] opacity-70">{s.desc}</div>
          </div>
        ))}
      </div>
    ),
  },
  {
    subtitle: "VERHALTEN",
    title: "Was eine Kreatur tun kann",
    body: "Aktions-Neuronen bestimmen, was eine Kreatur jeden Schritt macht. Sie kann sich in 8 Richtungen oder relativ zu ihrer Blickrichtung bewegen, Pheromon-Signale für andere aussenden, ihren eigenen Oszillator-Rhythmus einstellen oder — wenn Kill aktiviert ist — die Kreatur vor ihr angreifen.",
    visual: (
      <div className="grid grid-cols-3 gap-1 text-[9px]">
        {[
          { icon: "↑", label: "Vorwärts", color: "text-emerald-400" },
          { icon: "↙↗", label: "N/S/O/W", color: "text-emerald-400" },
          { icon: "↺", label: "Zufällig", color: "text-emerald-400" },
          { icon: "↔", label: "Seitwärts", color: "text-emerald-400" },
          { icon: "〰", label: "Signal senden", color: "text-yellow-400" },
          { icon: "⏱", label: "Rhythmus", color: "text-cyan-400" },
          { icon: "🔭", label: "Sichtweite", color: "text-cyan-400" },
          { icon: "📡", label: "Reaktivität", color: "text-cyan-400" },
          { icon: "⚔", label: "Kill (opt.)", color: "text-red-400" },
        ].map(a => (
          <div key={a.label} className="bg-zinc-800/70 rounded px-1.5 py-1 text-center">
            <div className={`text-base leading-tight ${a.color}`}>{a.icon}</div>
            <div className="text-zinc-500 mt-0.5">{a.label}</div>
          </div>
        ))}
      </div>
    ),
  },
  {
    subtitle: "DIE MASCHINE",
    title: "Wie Evolution funktioniert",
    body: "Jede Generation läuft für eine feste Schrittanzahl. Danach wird jede Kreatur von der Challenge bewertet. Die Besten werden Eltern: ihre Genome werden kopiert, gekreuzt und mutiert, um die nächste Generation zu erzeugen. Über Hunderte von Generationen verbreiten sich nützliche Gen-Muster in der Population.",
    visual: (
      <div className="flex items-center justify-center gap-1 flex-wrap text-[9px]">
        {[
          { label: "Gen N läuft", color: "text-zinc-300 bg-zinc-800" },
          { label: "→", color: "text-zinc-600" },
          { label: "Fitness\nbewerten", color: "text-amber-300 bg-amber-950/60" },
          { label: "→", color: "text-zinc-600" },
          { label: "Eltern\nwählen", color: "text-emerald-300 bg-emerald-950/60" },
          { label: "→", color: "text-zinc-600" },
          { label: "Mutieren &\nKreuzen", color: "text-violet-300 bg-violet-950/60" },
          { label: "→", color: "text-zinc-600" },
          { label: "Gen N+1", color: "text-zinc-300 bg-zinc-800" },
        ].map((node, i) =>
          node.label === "→" ? (
            <span key={i} className="text-zinc-600 font-mono">{node.label}</span>
          ) : (
            <span key={i} className={`rounded px-2 py-1 border border-zinc-700/40 whitespace-pre-line text-center ${node.color}`}>
              {node.label}
            </span>
          )
        )}
      </div>
    ),
  },
  {
    subtitle: "DIE REGELN",
    title: "23 verschiedene Challenges",
    body: "Die Challenge definiert, was 'fit' bedeutet. In Right Half müssen Überlebende die rechte Seite der Arena erreichen. In Pairs muss jede Kreatur genau einen Partner finden. In Altruism bekommen die höchsten Scores jene, die sich in einer Gefahrenzone opfern. Verschiedene Challenges entwickeln wild unterschiedliche Verhaltensweisen.",
    visual: (
      <div className="grid grid-cols-2 gap-1.5 text-[9px]">
        {[
          { name: "Right Half", desc: "Rechte Seite erreichen" },
          { name: "Migration", desc: "Weit vom Startpunkt wandern" },
          { name: "Pairs", desc: "Genau einen Partner finden" },
          { name: "Altruism", desc: "Sich in Gefahrenzone opfern" },
          { name: "Boomerang", desc: "Weit weg und zurückkehren" },
          { name: "Hot Potato", desc: "Checkpoints der Reihe nach" },
        ].map(c => (
          <div key={c.name} className="bg-zinc-800/60 rounded border border-zinc-700/30 px-2 py-1.5">
            <div className="text-emerald-400 font-semibold">{c.name}</div>
            <div className="text-zinc-500">{c.desc}</div>
          </div>
        ))}
      </div>
    ),
  },
  {
    subtitle: "BEREIT",
    title: "Bereit, Evolution zu beobachten?",
    body: "Wähle eine Preset-Challenge und drücke Start. Beobachte Generation 0 — reines Rauschen. Dann sieh zu, wie die fittesten Genome dominieren. Die Simulation betrügt nie: kein Verhalten ist in eine Kreatur hineinkodiert. Alles, was du siehst, wurde von der Evolution selbst entdeckt.",
    visual: (
      <div className="animate-pulse">
        <pre className="font-mono text-[13px] leading-[16px] select-none text-center">
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
          <span className="text-violet-400">{"║◆◆◆◆◆║"}</span>
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
      </div>
    ),
  },
];

export default function TutorialWizard({ onClose, onFinish, fromSplash }: TutorialWizardProps) {
  const [step, setStep] = useState(0);
  const total = STEPS.length;
  const current = STEPS[step];
  const isLast = step === total - 1;

  const handleFinish = () => {
    if (fromSplash) {
      const quickStart = PRESETS[0];
      onFinish({ ...DEFAULT_CONFIG, ...quickStart.config });
    } else {
      onFinish();
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl max-w-xl w-full flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="bg-emerald-700 text-white text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded">
              Tutorial
            </span>
            <span className="text-[10px] text-zinc-500">
              Schritt {step + 1} von {total}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 transition-colors text-lg leading-none px-1"
            title="Tutorial schließen"
          >
            ×
          </button>
        </div>

        {/* Visual area */}
        <div
          key={step}
          className="mx-5 mt-4 bg-zinc-800/30 rounded-lg px-4 py-4 flex items-center justify-center min-h-[130px]"
          style={{ animation: "var(--animate-tutorial-step)" }}
        >
          {current.visual}
        </div>

        {/* Text content */}
        <div
          key={`text-${step}`}
          className="px-5 pt-4 pb-2"
          style={{ animation: "var(--animate-tutorial-step)" }}
        >
          <div className="text-[10px] text-emerald-500 uppercase tracking-widest mb-1">
            {current.subtitle}
          </div>
          <h2 className="text-lg font-semibold text-zinc-100">{current.title}</h2>
          <p className="text-sm text-zinc-400 leading-relaxed mt-2">{current.body}</p>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-zinc-800 flex items-center justify-between mt-2">
          <button
            onClick={onClose}
            className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            Überspringen
          </button>

          <div className="flex items-center gap-1">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  i === step ? "bg-emerald-500" : "bg-zinc-700 hover:bg-zinc-500"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                ← Zurück
              </button>
            )}
            {!isLast ? (
              <button
                onClick={() => setStep(s => s + 1)}
                className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-1.5 rounded transition-colors"
              >
                Weiter →
              </button>
            ) : (
              <button
                onClick={handleFinish}
                className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-3 py-1.5 rounded transition-colors"
              >
                {fromSplash ? "Evolution starten →" : "Fertig ✓"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
