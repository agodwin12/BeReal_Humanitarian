// Structural data for the Programs page — all copy (names, purposes, the four
// focus items, alt text) lives in src/messages/*.json under
// ProgramsPage.programs.<slug>. TODO(later): replace with GET /api/programs.

import type { ProgramSummary } from "@/lib/content/programs";

export type ProgramDetail = {
  slug: ProgramSummary["slug"];
  icon: ProgramSummary["icon"];
  photo: string;
  tint: "lavender" | "coral";
  /** Photo side on desktop; alternates down the page. */
  imageSide: "left" | "right";
};

export const programDetails: ProgramDetail[] = [
  {
    slug: "health-and-hope",
    icon: "heart-pulse",
    photo: "/images/program-health-detail.png",
    tint: "lavender",
    imageSide: "left",
  },
  {
    slug: "care",
    icon: "hand-heart",
    photo: "/images/program-care-detail.png",
    tint: "coral",
    imageSide: "right",
  },
  {
    slug: "empowerment",
    icon: "graduation-cap",
    photo: "/images/program-empowerment.png",
    tint: "lavender",
    imageSide: "left",
  },
  {
    slug: "faith-and-community-outreach",
    icon: "users",
    photo: "/images/program-faith-outreach.png",
    tint: "coral",
    imageSide: "right",
  },
];
