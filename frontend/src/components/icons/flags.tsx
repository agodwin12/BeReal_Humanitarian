// Simplified, self-hosted flag marks for the language switcher. Emoji flags
// render as bare letter codes ("US", "FR") on Windows, so inline SVG is used.
import type { SVGProps } from "react";

type FlagProps = SVGProps<SVGSVGElement>;

const frame = { viewBox: "0 0 24 16", width: 24, height: 16 } as const;

export function FlagUS(props: FlagProps) {
  return (
    <svg {...frame} aria-hidden="true" {...props}>
      <rect width="24" height="16" fill="#b22234" />
      {[1, 3, 5, 7, 9, 11].map((i) => (
        <rect key={i} y={(i * 16) / 13} width="24" height={16 / 13} fill="#fff" />
      ))}
      <rect width="10" height={(7 * 16) / 13} fill="#3c3b6e" />
      {[
        [1.5, 1.4],
        [4, 1.4],
        [6.5, 1.4],
        [2.75, 3.2],
        [5.25, 3.2],
        [1.5, 5],
        [4, 5],
        [6.5, 5],
        [2.75, 6.8],
        [5.25, 6.8],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="0.55" fill="#fff" />
      ))}
    </svg>
  );
}

export function FlagFR(props: FlagProps) {
  return (
    <svg {...frame} aria-hidden="true" {...props}>
      <rect width="8" height="16" fill="#0055a4" />
      <rect x="8" width="8" height="16" fill="#fff" />
      <rect x="16" width="8" height="16" fill="#ef4135" />
    </svg>
  );
}

export function FlagES(props: FlagProps) {
  return (
    <svg {...frame} aria-hidden="true" {...props}>
      <rect width="24" height="16" fill="#aa151b" />
      <rect y="4" width="24" height="8" fill="#f1bf00" />
    </svg>
  );
}
