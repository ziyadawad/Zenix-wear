'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useI18n } from '../layout/I18nProvider';
import { OrbitMark } from './Bits';
import type { HeroSlide } from '@/lib/types';
import { SCENES } from '@/lib/db/images';
import { cx } from '@/lib/utils';

/** T-shirt mockups on the dark brand background, dimmed under the logo. No people, never a broken image. */
function BrandBackground({ eager }: { eager: boolean }) {
  return (
    <>
      <div className="absolute inset-0" style={{ background: 'radial-gradient(70% 60% at 50% 38%, #1c1a2c 0%, #0b0b10 52%, #050507 100%)' }} />
      <Image src={SCENES.hero} alt="" fill preload={eager} fetchPriority={eager ? 'high' : 'auto'} loading={eager ? 'eager' : 'lazy'} sizes="100vw" quality={75} className="object-cover object-[50%_35%] opacity-60" />
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
  return (
    <section className="relative h-[calc(100svh-var(--ann))] min-h-[560px] overflow-hidden bg-black" aria-roledescription="carousel" aria-label="ZENIX WEAR" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      {slides.map((s, idx) => {
        if (idx !== 0 && !loadAll) return null;
        const on = idx === i;
        // A slide without its own photo or video shows the brand background (T-shirt mockups).
        const brand = !s.video && (s.kind === 'brand' || !s.image);
        return (
          <div key={s.id} aria-hidden={!on} className={cx('absolute inset-0 transition-opacity duration-[1400ms]', on ? 'opacity-100' : 'opacity-0')}>
            {brand ? (
              <BrandBackground eager={idx === 0} />
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
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-black/55" />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(55% 55% at 50% 45%, rgba(0,0,0,.6) 0%, rgba(0,0,0,0) 100%)' }} />

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
