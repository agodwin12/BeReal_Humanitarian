// lucide-react no longer ships brand/social marks (Facebook, Instagram, YouTube,
// LinkedIn) in this version, so these are small hand-authored inline SVGs —
// the standard practice for brand marks anyway, since icon libraries commonly
// drop them for trademark reasons.
import type { SVGProps } from "react";

export function FacebookIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M13.5 21v-7.2h2.4l.36-2.8h-2.76V9.2c0-.81.22-1.36 1.39-1.36h1.48V5.35A19.8 19.8 0 0 0 14.3 5.2c-2.09 0-3.52 1.28-3.52 3.62V11H8.35v2.8h2.43V21z" />
    </svg>
  );
}

export function InstagramIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} {...props}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17" cy="7" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function YoutubeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M21.6 7.6a2.7 2.7 0 0 0-1.9-1.9C18 5.2 12 5.2 12 5.2s-6 0-7.7.5a2.7 2.7 0 0 0-1.9 1.9A28 28 0 0 0 2 12a28 28 0 0 0 .4 4.4 2.7 2.7 0 0 0 1.9 1.9c1.7.5 7.7.5 7.7.5s6 0 7.7-.5a2.7 2.7 0 0 0 1.9-1.9A28 28 0 0 0 22 12a28 28 0 0 0-.4-4.4ZM10 15V9l5.2 3z" />
    </svg>
  );
}

export function LinkedinIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M6.94 8.5H4V20h2.94zM5.47 3.5A1.72 1.72 0 1 0 5.5 7a1.72 1.72 0 0 0-.03-3.5ZM20 20h-2.94v-5.9c0-1.4-.5-2.36-1.76-2.36a1.9 1.9 0 0 0-1.78 1.27 2.4 2.4 0 0 0-.11.85V20H10.5s.04-10.5 0-11.5h2.94v1.63a2.9 2.9 0 0 1 2.64-1.46c1.93 0 3.38 1.26 3.38 3.96Z" />
    </svg>
  );
}
