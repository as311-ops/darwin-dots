import { useEffect, useState, useRef } from "react";
import { CHALLENGE_INFO } from "../simulation/challenge-descriptions";

interface ChallengeInfoProps {
  challenge: number;
}

export default function ChallengeInfo({ challenge }: ChallengeInfoProps) {
  const [visible, setVisible] = useState(true);
  const [fadeIn, setFadeIn] = useState(true);
  const prevChallenge = useRef(challenge);

  useEffect(() => {
    if (challenge !== prevChallenge.current) {
      setVisible(true);
      setFadeIn(true);
      prevChallenge.current = challenge;
    }
  }, [challenge]);

  const info = CHALLENGE_INFO[challenge];
  if (!info || !visible) return null;

  return (
    <div
      className={`bg-zinc-900 rounded-lg border border-zinc-800 p-3 transition-opacity duration-300 ${
        fadeIn ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-emerald-700 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
              CHALLENGE
            </span>
            <span className="text-xs font-medium text-zinc-200">
              {info.title}
            </span>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            {info.flavor}
          </p>
        </div>
        <button
          onClick={() => {
            setFadeIn(false);
            setTimeout(() => setVisible(false), 300);
          }}
          className="text-zinc-600 hover:text-zinc-400 text-xs flex-shrink-0 mt-0.5"
        >
          x
        </button>
      </div>
    </div>
  );
}
