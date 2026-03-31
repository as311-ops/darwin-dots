import { CHALLENGE_INFO } from "../simulation/challenge-descriptions";

interface ChallengeInfoProps {
  challenge: number;
}

export default function ChallengeInfo({ challenge }: ChallengeInfoProps) {
  const info = CHALLENGE_INFO[challenge];
  if (!info) return null;

  return (
    <div className="bg-zinc-900 rounded-lg border border-zinc-800 px-3 py-2 space-y-1">
      <div className="flex items-center gap-2">
        <span className="bg-emerald-700 text-white text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0">
          CHALLENGE
        </span>
        <span className="text-xs font-medium text-zinc-200">{info.title}</span>
      </div>
      <p className="text-xs text-zinc-500 leading-relaxed">{info.flavor}</p>
    </div>
  );
}
