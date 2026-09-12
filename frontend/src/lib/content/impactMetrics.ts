// Metrics the organization commits to publishing (brief Section 8). `value`
// stays null until a real, documented figure exists — the page renders the
// "reporting begins…" state for null. TODO(later): feed from GET /api/impact-stats.

export type ImpactMetric = {
  key: "people" | "supplies" | "communities" | "volunteers" | "spending";
  icon: "users" | "package" | "map-pin" | "clock" | "wallet";
  value: string | null;
};

export const impactMetrics: ImpactMetric[] = [
  { key: "people", icon: "users", value: null },
  { key: "supplies", icon: "package", value: null },
  { key: "communities", icon: "map-pin", value: null },
  { key: "volunteers", icon: "clock", value: null },
  { key: "spending", icon: "wallet", value: null },
];
