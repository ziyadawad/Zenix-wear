'use client';
import { useRef } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useI18n } from '../layout/I18nProvider';

/** Native scroll-snap row: swipe on touch, arrows on desktop. scrollBy handles RTL because scrolling there runs negative. */
export function CarouselShell({ children, ariaLabel, gap = 'gap-3 md:gap-5' }: { children: React.ReactNode; ariaLabel: string; gap?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { locale, t } = useI18n();
  const dir = locale === 'ar' ? -1 : 1;
  const go = (n: number) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: n * dir * Math.max(el.clientWidth * 0.75, 260), behavior: 'smooth' });
  };
  return (
    <div className="relative" role="region" aria-label={ariaLabel}>
      <div ref={ref} className={`snap-row scroll-px-4 px-4 md:scroll-px-8 md:px-8 xl:scroll-px-14 xl:px-14 ${gap}`} tabIndex={0}>
        {children}
      </div>
      <div className="pointer-events-none absolute -top-[72px] end-8 hidden gap-2 md:flex xl:end-14">
        <button className="icon-btn pointer-events-auto border border-line" aria-label={t.product.prevImage} onClick={() => go(-1)}><ArrowLeft size={18} strokeWidth={1.25} className="flip-rtl" /></button>
        <button className="icon-btn pointer-events-auto border border-line" aria-label={t.product.nextImage} onClick={() => go(1)}><ArrowRight size={18} strokeWidth={1.25} className="flip-rtl" /></button>
      </div>
    </div>
  );
}
