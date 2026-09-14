// Structural data only — names, purposes and alt text live in
// src/messages/*.json under Programs.items.<slug> so all three languages work.
// TODO(later): replace with GET /api/programs.

export type ProgramSummary = {
  slug: "health-and-hope" | "care" | "empowerment" | "faith-and-community-outreach";
  icon: "heart-pulse" | "hand-heart" | "graduation-cap" | "users";
  photo: string;
};

export const programs: ProgramSummary[] = [
  { slug: "health-and-hope", icon: "heart-pulse", photo: "/images/program-health-hope.png" },
  { slug: "care", icon: "hand-heart", photo: "/images/program-care.png" },
  { slug: "empowerment", icon: "graduation-cap", photo: "/images/program-empowerment.png" },
  { slug: "faith-and-community-outreach", icon: "users", photo: "/images/program-faith-outreach.png" },
];
