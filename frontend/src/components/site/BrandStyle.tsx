import type { SiteSettings } from "@/lib/cms";

// Applies the two brand colours chosen in Site settings to the whole site by
// redefining the CSS variables the stylesheet and Tailwind utilities are built
// on. The shades are derived from the chosen colour with color-mix(), so a new
// primary or accent re-tints buttons, links, badges, backgrounds and icons at
// once. When a colour equals the launch default, nothing is emitted and the
// hand-tuned palette in globals.css stays exactly as designed.

const DEFAULT_PRIMARY = "#5626a6";
const DEFAULT_ACCENT = "#f26058";
const HEX = /^#[0-9a-f]{6}$/i;

const mix = (color: string, withColor: string, percent: number) => `color-mix(in srgb, ${color} ${100 - percent}%, ${withColor} ${percent}%)`;

function primaryScale(color: string) {
  return [
    `--brand-purple-950: ${mix(color, "#000", 62)};`,
    `--brand-purple-900: ${mix(color, "#000", 48)};`,
    `--brand-purple-800: ${mix(color, "#000", 30)};`,
    `--brand-purple-700: ${color};`,
    `--brand-purple-600: ${mix(color, "#fff", 12)};`,
    `--brand-purple-500: ${mix(color, "#fff", 26)};`,
    `--brand-purple-200: ${mix(color, "#fff", 74)};`,
    `--brand-purple-100: ${mix(color, "#fff", 88)};`,
    `--brand-purple-50: ${mix(color, "#fff", 95)};`,
  ].join(" ");
}

function accentScale(color: string) {
  return [
    `--brand-coral-700: ${mix(color, "#000", 10)};`,
    `--brand-coral-600: ${color};`,
    `--brand-coral-500: ${mix(color, "#fff", 8)};`,
    `--brand-coral-100: ${mix(color, "#fff", 82)};`,
    `--brand-coral-50: ${mix(color, "#fff", 92)};`,
  ].join(" ");
}

export function BrandStyle({ settings }: { settings: SiteSettings | null }) {
  const primary = settings?.brandPrimary?.trim().toLowerCase() ?? "";
  const accent = settings?.brandAccent?.trim().toLowerCase() ?? "";
  const rules: string[] = [];
  if (HEX.test(primary) && primary !== DEFAULT_PRIMARY) rules.push(primaryScale(primary));
  if (HEX.test(accent) && accent !== DEFAULT_ACCENT) rules.push(accentScale(accent));
  if (rules.length === 0) return null;
  return <style data-brand-colors="">{`:root { ${rules.join(" ")} }`}</style>;
}
