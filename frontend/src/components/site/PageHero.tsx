import Image from "next/image";
import type { ReactNode } from "react";

import { FadeIn } from "@/components/motion/FadeIn";

type PageHeroProps = {
  eyebrow: string;
  title: ReactNode;
  lead: string;
  image: string;
  imageAlt?: string;
  /** Tailwind object-position class, e.g. "object-[center_35%]" */
  imagePosition?: string;
  actions?: ReactNode;
};

// Inner-page header: same editorial composition as the homepage hero
// (white text area left, photo right with a white fade), just shorter.
export function PageHero({
  eyebrow,
  title,
  lead,
  image,
  imageAlt = "",
  imagePosition = "object-center",
  actions,
}: PageHeroProps) {
  return (
    <section className="hero hero--page">
      <div className="hero__photo image-container" aria-hidden={imageAlt ? undefined : true}>
        <Image
          src={image}
          alt={imageAlt}
          fill
          priority
          sizes="(max-width: 900px) 100vw, 60vw"
          className={`object-cover ${imagePosition}`}
        />
      </div>

      <div className="site-container hero__inner">
        <FadeIn className="hero__content">
          <span className="eyebrow">{eyebrow}</span>
          <h1 className="display-title">{title}</h1>
          <p className="lead">{lead}</p>
          {actions ? <div className="hero__actions">{actions}</div> : null}
        </FadeIn>
      </div>
    </section>
  );
}
