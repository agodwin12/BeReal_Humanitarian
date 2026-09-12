// Structural data only — titles/descriptions live in src/messages/*.json under
// Impact.items.<key>. Value statements only: no beneficiary counts may appear
// until real, documented figures exist (brief Section 8 / governance rule).

export type ImpactItem = {
  key: "communities" | "families" | "world";
  icon: "users" | "heart" | "sprout";
};

export const impactItems: ImpactItem[] = [
  { key: "communities", icon: "users" },
  { key: "families", icon: "heart" },
  { key: "world", icon: "sprout" },
];
