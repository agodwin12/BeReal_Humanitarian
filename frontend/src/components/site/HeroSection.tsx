"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/motion/FadeIn";
import { Link } from "@/i18n/navigation";
import type { PageImage } from "@/lib/cms";

const SLIDE_MS = 6500;

// Same hero design as always (text left, photo right, white fade, handwritten
// note) — only the photo now rotates through a set of images when there is
// more than one. A single image behaves exactly as before, unanimated.
export function HeroSection({ images, donateEnabled = true }: { images: PageImage[]; donateEnabled?: boolean }) {
  const t = useTranslations("Hero");
  const slides = images.length > 0 ? images : [{ src: "", alt: "" }];
  const [index, setIndex] = useState(0);
  const reducedMotion = useRef(false);

  useEffect(() => {
    reducedMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    if (slides.length < 2 || reducedMotion.current) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % slides.length), SLIDE_MS);
    return () => clearInterval(id);
  }, [slides.length]);

  return (
    <section className="hero">
      <div className="hero__photo image-container" aria-hidden="true">
        {slides.map((image, i) => (
          <Image
            key={image.src || i}
            src={image.src}
            alt=""
            fill
            priority={i === 0}
            sizes="(max-width: 900px) 100vw, 60vw"
            className={`hero__slide object-cover object-[center_42%] ${i === index ? "hero__slide--active" : ""}`}
          />
        ))}
      </div>

      <div className="site-container hero__inner">
        <FadeIn className="hero__content">
          <span className="eyebrow">{t("eyebrow")}</span>

          <h1 className="display-title">
            {t("line1")}
            <br />
            {t("line2")}
            <br />
            <span className="accent">{t("line3")}</span>
            <br />
            <span className="accent">{t("line4")}</span>
          </h1>

          <p className="lead">{t("lead")}</p>

          <div className="hero__actions">
            {donateEnabled ? (
              <Button asChild variant="coral" size="lg">
                <Link href="/donate">
                  {t("donate")}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            ) : null}
            <Button asChild variant={donateEnabled ? "outline-purple" : "coral"} size="lg">
              <Link href="/get-involved">{t("getInvolved")}</Link>
            </Button>
            <Button asChild variant="outline-purple" size="lg">
              <Link href="/request-assistance">{t("requestAssistance")}</Link>
            </Button>
          </div>
        </FadeIn>

        <div className="hero__handwriting" aria-hidden="true">
          <div className="script-note">{t("note")}</div>
        </div>
      </div>
    </section>
  );
}
