'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useI18n } from '../layout/I18nProvider';
import { OrbitMark } from './Bits';
import type { HeroSlide } from '@/lib/types';
import { HERO_GARMENTS } from '@/lib/db/images';
import { cx } from '@/lib/utils';

/**
 * The brand background: the three real T-shirts behind the logo, in their true colours (no tint on them).
 * - Computers: white short-sleeve on the left, black short-sleeve on the right; the centre (behind the logo) is an
 *   empty slot of the same size, so the two keep their places.
 * - Phones: a slow 3D carousel. The two shirts sit on a circle and take turns: every 3 seconds the other one turns
 *   to the front (bigger, brighter) while this one goes to the back (smaller, faded, slightly blurred). CSS only.
 *   With reduced motion: no turning, one shirt at a time with a slow cross-fade.
 * Black shirts get a soft neutral light BEHIND them so they stand out from the dark background.
 */
function BrandStage({ eager }: { eager: boolean }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStep((x) => x + 1), 3000);
    return () => clearInterval(id);
  }, []);
  const n = HERO_GARMENTS.length;
  const front = ((step % n) + n) % n;
  const shirt = (g: (typeof HERO_GARMENTS)[number], i: number, sizes: string) => (
    <>
      {g.dark && <span className="hero-backlight" aria-hidden="true" />}
      <Image src={g.src} alt="" fill sizes={sizes} quality={85} preload={eager && i === 0} fetchPriority={eager && i === 0 ? 'high' : 'auto'} loading={eager ? 'eager' : 'lazy'} className="object-contain" />
    </>
  );
  return (
    <>
      <div className="absolute inset-0" style={{ background: 'radial-gradient(70% 60% at 50% 42%, #15151c 0%, #09090d 55%, #050507 100%)' }} />
      {/* Computers: a static row */}
      <div className="absolute inset-0 hidden items-center justify-center md:flex" aria-hidden="true">
        {[HERO_GARMENTS[0], null, HERO_GARMENTS[1]].map((g, i) => (
          <div key={g?.src ?? 'centre'} className="hero-garment relative h-[62%] aspect-[4/5]">{g && shirt(g, i === 0 ? 0 : 1, '(min-width:768px) 40vh, 1px')}</div>
        ))}
      </div>
      {/* Phones: the shirts turn on a circle, one at a time to the front */}
      <div className="hero-orbit md:hidden" aria-hidden="true">
        {HERO_GARMENTS.map((g, i) => {
          // Each shirt's angle keeps moving the same way (never wraps back), so every turn goes the same way round.
          return (
            <div key={g.src} className={cx('hero-orbit-item', i === front && 'front')} style={{ '--a': `${(i - step) * (360 / n)}deg` } as React.CSSProperties}>
              {shirt(g, i, '70vw')}
            </div>
          );
        })}
      </div>
      <div className="brand-sheen absolute inset-0" aria-hidden="true" />
    </>
  );
}

export function Hero({ slides }: { slides: HeroSlide[] }) {
  const { t, locale, lp, categories } = useI18n();
  const [i, setI] = useState(0);
  // Later slides load only after the page settles, to protect first paint.
  const [loadAll, setLoadAll] = useState(false);
  const [paused, setPaused] = useState(false);
  const n = slides.length;

  useEffect(() => {
    const id = setTimeout(() => setLoadAll(true), 5000);
    return () => clearTimeout(id);
  }, []);
  useEffect(() => {
    if (n < 2 || paused) return;
    const id = setInterval(() => setI((x) => (x + 1) % n), 6500);
    return () => clearInterval(id);
  }, [n, paused]);

  const active = slides[i] ?? slides[0];
  if (!active) return null;
  const activeBrand = !active.video && (active.kind === 'brand' || !active.image);
  return (
    <section className="relative h-svh min-h-[560px] overflow-hidden bg-black" aria-roledescription="carousel" aria-label="ZENIX WEAR" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      {slides.map((s, idx) => {
        if (idx !== 0 && !loadAll) return null;
        const on = idx === i;
        // A slide without its own photo or video shows the brand background (the T-shirt photos).
        const brand = !s.video && (s.kind === 'brand' || !s.image);
        return (
          <div key={s.id} aria-hidden={!on} className={cx('absolute inset-0 transition-opacity duration-[1400ms]', on ? 'opacity-100' : 'opacity-0')}>
            {brand ? (
              <BrandStage eager={idx === 0} />
            ) : s.video ? (
              <video src={s.video} poster={s.image} autoPlay muted loop playsInline className="absolute inset-0 size-full object-cover" />
            ) : s.kind === 'figure' ? (
              <>
                <div className="absolute inset-0" style={{ background: 'radial-gradient(60% 70% at 66% 42%, #2a2a2a 0%, #0c0c0c 55%, #000 100%)' }} />
                <div className="absolute inset-x-0 bottom-0 top-[2%] md:start-[42%] md:top-0">
                  <Image src={s.image} alt="" fill preload={idx === 0} fetchPriority={idx === 0 ? 'high' : 'auto'} loading={idx === 0 ? 'eager' : 'lazy'} sizes="(min-width:768px) 58vw, 100vw" quality={70} className="object-contain object-top md:object-[50%_0%]" />
                </div>
              </>
            ) : (
              <Image src={s.image} alt="" fill preload={idx === 0} fetchPriority={idx === 0 ? 'high' : 'auto'} loading={idx === 0 ? 'eager' : 'lazy'} sizes="(max-width:767px) 320vw, 100vw" quality={70} className={cx('object-cover', on && 'hero-kenburns')} />
            )}
          </div>
        );
      })}
      {/* Overlays. Brand slides: light, so the shirts keep their true colours; a soft dark glow sits only behind the
          text and buttons. Photo and video slides keep the stronger overlay. */}
      {activeBrand ? (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[22%] bg-gradient-to-b from-black/60 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[30%] bg-gradient-to-t from-black/85 to-transparent" />
          <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(34% 18% at 50% 66%, rgba(0,0,0,.6) 0%, rgba(0,0,0,0) 100%)' }} />
          {/* Phones: the turning shirt passes right behind the logo and text, so a soft dark glow keeps them readable. */}
          <div className="pointer-events-none absolute inset-0 md:hidden" style={{ background: 'radial-gradient(48% 30% at 50% 40%, rgba(0,0,0,.55) 0%, rgba(0,0,0,0) 100%), radial-gradient(60% 14% at 50% 62%, rgba(0,0,0,.6) 0%, rgba(0,0,0,0) 100%)' }} />
        </>
      ) : (
        <>
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-black/55" />
          <div className="absolute inset-0" style={{ background: 'radial-gradient(55% 55% at 50% 45%, rgba(0,0,0,.6) 0%, rgba(0,0,0,0) 100%)' }} />
        </>
      )}

      <div className="container-zx relative flex h-full flex-col items-center justify-center pb-[calc(var(--bottom-nav)+64px)] pt-[var(--hh)] text-center md:pb-16">
        {/* Outside the keyed block below, so the logo keeps turning when the slide changes. */}
        <h1 className="logo-glow w-[min(62vw,34svh)] md:w-[min(30vw,50svh,440px)]">
          <OrbitMark hero sizes="(min-width:768px) 440px, 62vw" />
        </h1>
        <div key={active.id} className="w-full max-w-[640px]">
          <p className="slide-rise mx-auto mt-6 max-w-[46ch] text-sm leading-relaxed text-silver md:mt-8 md:text-base" style={{ '--d': '.2s' } as React.CSSProperties}>{locale === 'ar' ? active.subAr : active.subEn}</p>
          <div className="slide-rise mt-6 flex justify-center gap-2 md:mt-8 md:gap-3" style={{ '--d': '.35s' } as React.CSSProperties}>
            {/* One button per menu category (the two T-shirts), or Shop when there are none. */}
            {(categories.length ? categories.slice(0, 2) : [{ slug: '', name: t.home.shopNow }]).map((c, i) => (
              <Link key={c.slug} href={lp(c.slug ? `/shop/${c.slug}` : '/shop')} className={cx('btn min-w-0 flex-1 !px-2 md:flex-none md:!px-8 md:min-w-[210px]', i === 0 ? 'btn-primary' : 'btn-ghost')}>{c.name}</Link>
            ))}
          </div>
        </div>
      </div>

      {n > 1 && (
        <div className="absolute bottom-[calc(var(--bottom-nav)+18px)] start-1/2 flex -translate-x-1/2 rtl:translate-x-1/2 md:bottom-6">
          {slides.map((s, idx) => (
            <button key={s.id} aria-label={`${idx + 1} / ${n}`} aria-current={idx === i} onClick={() => setI(idx)} className="flex h-11 w-11 items-center px-1">
              <span className={cx('h-px w-full transition-colors duration-500', idx === i ? 'bg-white' : 'bg-white/30')} />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
