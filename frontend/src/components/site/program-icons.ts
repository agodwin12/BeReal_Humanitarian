import {
  BookOpen,
  Clock,
  GraduationCap,
  HandHeart,
  HandHelping,
  Heart,
  HeartPulse,
  Home,
  MapPin,
  Package,
  Sprout,
  Stethoscope,
  Users,
  Wallet,
} from "lucide-react";

// Icon vocabulary shared with the backoffice (backend/config/content.js).
export const PROGRAM_ICONS = {
  "heart-pulse": HeartPulse,
  "hand-heart": HandHeart,
  "graduation-cap": GraduationCap,
  users: Users,
  "hand-helping": HandHelping,
  sprout: Sprout,
  home: Home,
  "book-open": BookOpen,
  stethoscope: Stethoscope,
  package: Package,
} as const;

export const METRIC_ICONS = {
  users: Users,
  package: Package,
  "map-pin": MapPin,
  clock: Clock,
  wallet: Wallet,
  heart: Heart,
  sprout: Sprout,
  home: Home,
} as const;

export function programIcon(name: string) {
  return PROGRAM_ICONS[name as keyof typeof PROGRAM_ICONS] ?? HeartPulse;
}

export function metricIcon(name: string) {
  return METRIC_ICONS[name as keyof typeof METRIC_ICONS] ?? Users;
}
