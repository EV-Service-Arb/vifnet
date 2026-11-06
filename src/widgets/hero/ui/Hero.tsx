import { Section } from "@/shared/lib/sites-tools/react";
import type { ReactNode } from "react";
import type { Copy } from "@/entities/content";
import { Photo, Stars, TYPE } from "@/shared/ui";

const AVATARS = ["avatar-1", "avatar-2", "avatar-3", "avatar-4"] as const;

/**
 * The frame's hero (9:144 / 14:520): the promise on forest over the team photo
 * at 20 %, behind a gradient that keeps the text at its contrast. The photo's
 * box runs past the hero's bottom, as in the frame, so `object-cover` crops it
 * the same; the hero clips it. The quote card sits beside the copy from a
 * laptop up and under it below.
 */
export function Hero({ copy, form }: { copy: Copy; form: ReactNode }) {
  const { hero, rating } = copy.t;
  return (
    <Section polarity="dark" className="relative isolate overflow-hidden py-16 lg:py-24">
      <Photo
        stem="hero"
        alt=""
        sizes="1800px"
        priority
        className="absolute inset-x-0 top-0 -z-10 h-[calc(100%+784px)] w-full object-cover opacity-20 lg:h-[calc(100%+390px)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 -z-10 h-[calc(100%+784px)] bg-linear-to-r from-background via-background/85 to-background/30 lg:h-[calc(100%+390px)] lg:to-transparent"
      />
      <div className="flex flex-col gap-12 lg:flex-row lg:items-center lg:gap-20">
        <div className="flex min-w-0 flex-1 flex-col items-start">
          <h1 className={`${TYPE.h1} text-white`}>
            <span className="block">{hero.title.first}</span>
            <span className="block">
              {hero.title.second}
              <span className="text-positive">{hero.title.accent}</span>
            </span>
            <span className="block">{hero.title.third}</span>
          </h1>
          <p className="mt-5 text-lg leading-[29.25px] text-white/70 lg:max-w-[448px]">{hero.lede}</p>
          <div className="mt-7 flex items-center gap-3">
            <div className="flex">
              {/* Each `<img>` is the only child of its `<picture>`, so `last:` cannot tell the last face. */}
              {AVATARS.map((stem, i) => (
                <Photo
                  key={stem}
                  stem={stem}
                  alt=""
                  sizes="36px"
                  className={`size-9 rounded-full border-2 border-background object-cover ${i < AVATARS.length - 1 ? "-mr-2" : ""}`}
                />
              ))}
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="flex items-center gap-1.5">
                <Stars />
                <span className="text-sm leading-5 font-bold text-white">{rating.value}</span>
              </p>
              <p className="text-xs leading-4 text-white/50">{hero.reviews}</p>
            </div>
          </div>
          <ul className="mt-7 flex flex-wrap gap-2">
            {hero.chips.map(chip => (
              <li key={chip} className="rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-xs leading-4 text-white/70">
                {chip}
              </li>
            ))}
          </ul>
        </div>
        <div className="w-full lg:w-[520px] lg:shrink-0">{form}</div>
      </div>
    </Section>
  );
}
