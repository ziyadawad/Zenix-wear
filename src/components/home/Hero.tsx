'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useI18n } from '../layout/I18nProvider';
import type { HeroSlide } from '@/lib/types';
import { cx } from '@/lib/utils';

export function Hero({ slides }: { slides: HeroSlide[] }) {
  const { t, locale, lp } = useI18n();
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
        return (
          <div key={s.id} aria-hidden={!on} className={cx('absolute inset-0 transition-opacity duration-[1400ms]', on ? 'opacity-100' : 'opacity-0')}>
            {s.video ? (
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
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-black/30 md:bg-gradient-to-r md:from-black/85 md:via-black/30 md:to-transparent md:rtl:bg-gradient-to-l" />

      <div className="container-zx relative flex h-full flex-col justify-end pb-[calc(var(--bottom-nav)+76px)] pt-[var(--hh)] md:justify-center md:pb-0">
        <div key={active.id} className="max-w-[820px] text-center md:max-w-[52%] md:text-start">
          <h1 className="display slide-rise text-[clamp(2.1rem,5.6vw,5.6rem)] md:rtl:text-[clamp(2.1rem,4.6vw,4.8rem)]">{locale === 'ar' ? active.headlineAr : active.headlineEn}</h1>
          <p className="slide-rise mx-auto mt-4 max-w-[46ch] text-sm leading-relaxed text-silver md:mx-0 md:mt-6 md:text-base" style={{ '--d': '.3s' } as React.CSSProperties}>{locale === 'ar' ? active.subAr : active.subEn}</p>
          <div className="slide-rise mt-6 flex gap-2 md:mt-10 md:gap-3" style={{ '--d': '.45s' } as React.CSSProperties}>
            <Link href={lp('/shop/t-shirts')} className="btn btn-primary min-w-0 flex-1 !px-2 md:flex-none md:!px-8 md:min-w-[220px]">{t.home.shopTshirts}</Link>
            <Link href={lp('/new-drops')} className="btn btn-ghost min-w-0 flex-1 !px-2 md:flex-none md:!px-8 md:min-w-[190px]">{t.home.newDrop}</Link>
          </div>
        </div>
      </div>

      {n > 1 && (
        <div className="absolute bottom-[calc(var(--bottom-nav)+18px)] start-1/2 flex -translate-x-1/2 rtl:translate-x-1/2 md:bottom-8 md:start-14 md:translate-x-0 md:rtl:translate-x-0">
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
