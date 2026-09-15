// Structural data only — names, purposes and alt text live in
// src/messages/*.json under Programs.items.<slug> so all three languages work.
// TODO(later): replace with GET /api/programs.

export type ProgramSummary = {
  slug: "health-and-hope" | "care" | "empowerment" | "faith-and-community-outreach";
  icon: "heart-pulse" | "hand-heart" | "graduation-cap" | "users";
  photo: string;
};

export const programs: ProgramSummary[] = [
  { slug: "health-and-hope", icon: "heart-pulse", photo: "/images/outreach-health-hope.jpg" },
  { slug: "care", icon: "hand-heart", photo: "/images/outreach-care-card.jpg" },
  { slug: "empowerment", icon: "graduation-cap", photo: "/images/outreach-empowerment.jpg" },
  { slug: "faith-and-community-outreach", icon: "users", photo: "/images/outreach-faith-service.jpg" },
];
