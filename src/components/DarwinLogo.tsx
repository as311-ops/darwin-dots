export default function DarwinLogo({ size = 32 }: { size?: number }) {
  const h = Math.round(size * 36 / 28);
  return (
    <svg width={size} height={h} viewBox="0 0 28 36" fill="none">
      {/* Back strands (drawn behind rungs) */}
      <path d="M 14 1 Q 4 10 14 18"  stroke="#5b21b6" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M 14 18 Q 4 27 14 35" stroke="#064e3b" strokeWidth="2.5" strokeLinecap="round" />

      {/* Rungs */}
      <line x1="9" y1="10" x2="19" y2="10" stroke="#52525b" strokeWidth="2" strokeLinecap="round" />
      <line x1="9" y1="27" x2="19" y2="27" stroke="#52525b" strokeWidth="2" strokeLinecap="round" />

      {/* Front strands (drawn in front of rungs) */}
      <path d="M 14 1 Q 24 10 14 18"  stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M 14 18 Q 24 27 14 35" stroke="#a78bfa" strokeWidth="2.5" strokeLinecap="round" />

      {/* Center crossing dot */}
      <circle cx="14" cy="18" r="3" fill="#09090b" />
      <circle cx="14" cy="18" r="2" fill="#34d399" opacity="0.85" />
    </svg>
  );
}
