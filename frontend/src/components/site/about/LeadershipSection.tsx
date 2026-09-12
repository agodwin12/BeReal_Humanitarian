import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";

import { FadeIn } from "@/components/motion/FadeIn";
import { mediaSrc, pickText, type CmsTeamMember } from "@/lib/cms";
import { leadership } from "@/lib/site-config";

const initials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

// Board and staff from the Team screen. The API only exposes a photo once the
// person has approved its publication (brief rule); everyone else shows initials.
export function LeadershipSection({ members }: { members: CmsTeamMember[] | null }) {
  const t = useTranslations("About.leadership");
  const locale = useLocale();

  const people = members
    ? members.map((m) => ({ id: String(m.id), name: m.name, role: pickText(m.role, locale), bio: pickText(m.bio, locale), photo: m.photo }))
    : leadership.map((l) => ({ id: l.name, name: l.name, role: t(`roles.${l.roleKey}`), bio: "", photo: null }));
  const anyPhotoPending = people.some((p) => !p.photo);

  return (
    <section className="section">
      <div className="site-container">
        <FadeIn className="section-intro">
          <span className="eyebrow">{t("eyebrow")}</span>
          <h2 className="section-title">{t("title")}</h2>
          <p className="lead">{t("intro")}</p>
        </FadeIn>

        <div className="grid-4">
          {people.map((person, index) => (
            <FadeIn key={person.id} delay={index * 0.06} className="leader-card">
              {person.photo ? (
                <div className="leader-photo image-container">
                  <Image
                    src={mediaSrc(person.photo, "medium")}
                    alt={pickText(person.photo.alt, locale, person.name)}
                    fill
                    sizes="(max-width: 620px) 50vw, 25vw"
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="leader-avatar" aria-hidden="true">
                  {initials(person.name)}
                </div>
              )}
              <h3>{person.name}</h3>
              <p>{person.role}</p>
              {person.bio ? <p className="leader-bio">{person.bio}</p> : null}
            </FadeIn>
          ))}
        </div>

        {anyPhotoPending ? <p className="note-muted">{t("photoNote")}</p> : null}
      </div>
    </section>
  );
}
