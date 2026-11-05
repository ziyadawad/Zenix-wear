'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { ArrowLeft, ArrowRight, Expand, X } from 'lucide-react';
import { fill, useI18n } from '../layout/I18nProvider';
import { useProductState } from './ProductClient';
import { cx, pName } from '@/lib/utils';

export function Gallery() {
  const { t, locale } = useI18n();
  const { product: p, colorId } = useProductState();
  const color = p.colors.find((c) => c.id === colorId) ?? p.colors[0];
  const images = color?.images ?? [];
  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const name = pName(p, locale);

  useEffect(() => {
    setIndex(0);
    rowRef.current?.scrollTo({ left: 0 });
  }, [colorId]);

  // Keep the dots in sync while swiping on mobile.
  const onScroll = () => {
    const el = rowRef.current;
    if (!el || !el.clientWidth) return;
    setIndex(Math.round(Math.abs(el.scrollLeft) / el.clientWidth));
  };

  return (
    <div className="min-w-0">
      {/* Mobile: swipe slider */}
      <div className="relative lg:hidden">
        <div ref={rowRef} onScroll={onScroll} className="snap-row !gap-0" tabIndex={0} aria-label={name} role="region">
          {images.map((src, i) => (
            <button key={src} type="button" className="relative aspect-[4/5] w-full bg-surface" onClick={() => setLightbox(i)} aria-label={`${t.product.fullScreen}: ${fill(t.product.imageOf, { i: i + 1, n: images.length })}`}>
              <Image src={src} alt={`${name}, ${fill(t.product.imageOf, { i: i + 1, n: images.length })}`} fill preload={i === 0} fetchPriority={i === 0 ? 'high' : 'auto'} loading={i === 0 ? 'eager' : 'lazy'} sizes="100vw" quality={80} className="object-cover" />
            </button>
          ))}
        </div>
        {images.length > 1 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5" aria-hidden="true">
            {images.map((src, i) => <span key={src} className={cx('h-px w-6 transition-colors', i === index ? 'bg-white' : 'bg-white/30')} />)}
          </div>
        )}
      </div>

      {/* Desktop: thumbnails and main image */}
      <div className="hidden gap-3 lg:grid lg:grid-cols-[76px_1fr]">
        <ul className="flex flex-col gap-2">
          {images.map((src, i) => (
            <li key={src}>
              <button type="button" onClick={() => setIndex(i)} aria-label={fill(t.product.imageOf, { i: i + 1, n: images.length })} aria-current={i === index} className={cx('relative block aspect-[4/5] w-full overflow-hidden border bg-surface transition-colors', i === index ? 'border-white' : 'border-transparent hover:border-line-strong')}>
                <Image src={src} alt="" fill sizes="76px" quality={70} className="object-cover" />
              </button>
            </li>
          ))}
          {p.video && (
            <li><a href={p.video} target="_blank" rel="noopener noreferrer" className="flex aspect-[4/5] items-center justify-center border border-line text-[10px] text-muted hover:text-white">{t.product.video}</a></li>
          )}
        </ul>
        <button type="button" onClick={() => setLightbox(index)} className="group relative block aspect-[4/5] w-full overflow-hidden bg-surface" aria-label={t.product.fullScreen}>
          {images[index] && <Image key={images[index]} src={images[index]} alt={name} fill loading="eager" fetchPriority="high" sizes="(min-width:1024px) 50vw, 100vw" quality={80} className="zoom-img object-cover" style={{ animation: 'fadeIn .5s ease both' }} />}
          <span className="absolute bottom-4 end-4 flex size-11 items-center justify-center bg-black/60 opacity-0 backdrop-blur transition-opacity group-hover:opacity-100"><Expand size={16} strokeWidth={1.25} /></span>
        </button>
      </div>
      {lightbox !== null && <Lightbox images={images} start={lightbox} alt={name} onClose={() => setLightbox(null)} />}
    </div>
  );
}

/** Full-screen viewer with pinch, double-tap, wheel and keyboard zoom, plus drag to pan. */
function Lightbox({ images, start, alt, onClose }: { images: string[]; start: number; alt: string; onClose: () => void }) {
  const { t, locale } = useI18n();
  const [i, setI] = useState(start);
  const [view, setView] = useState({ s: 1, x: 0, y: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ dist: number; s: number; sx: number; sy: number; vx: number; vy: number; moved: boolean; t: number } | null>(null);
  const lastTap = useRef(0);
  const n = images.length;
  const reset = () => setView({ s: 1, x: 0, y: 0 });
  const go = useCallback((d: number) => { setI((c) => (c + d + n) % n); setView({ s: 1, x: 0, y: 0 }); }, [n]);
  const clamp = (s: number) => Math.min(4, Math.max(1, s));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') go(locale === 'ar' ? -1 : 1);
      if (e.key === 'ArrowLeft') go(locale === 'ar' ? 1 : -1);
      if (e.key === '+' || e.key === '=') setView((v) => ({ ...v, s: clamp(v.s + 0.5) }));
      if (e.key === '-') setView((v) => (v.s - 0.5 <= 1 ? { s: 1, x: 0, y: 0 } : { ...v, s: v.s - 0.5 }));
    };
    window.addEventListener('keydown', onKey);
    document.documentElement.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.documentElement.style.overflow = ''; };
  }, [go, onClose, locale]);

  const down = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.current.values()];
    gesture.current = {
      dist: pts.length === 2 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : 0,
      s: view.s, sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y, moved: false, t: Date.now(),
    };
  };
  const move = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId) || !gesture.current) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    const pts = [...pointers.current.values()];
    if (pts.length === 2 && g.dist) {
      const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      g.moved = true;
      setView((v) => ({ ...v, s: clamp((g.s * d) / g.dist) }));
    } else if (pts.length === 1) {
      const dx = e.clientX - g.sx, dy = e.clientY - g.sy;
      if (Math.abs(dx) + Math.abs(dy) > 6) g.moved = true;
      if (view.s > 1) setView((v) => ({ ...v, x: g.vx + dx, y: g.vy + dy }));
    }
  };
  const up = (e: React.PointerEvent) => {
    const g = gesture.current;
    pointers.current.delete(e.pointerId);
    if (!g) return;
    const dx = e.clientX - g.sx;
    if (pointers.current.size === 0) {
      if (view.s === 1 && Math.abs(dx) > 50 && n > 1) go((dx < 0 ? 1 : -1) * (locale === 'ar' ? -1 : 1));
      else if (!g.moved) {
        const now = Date.now();
        if (now - lastTap.current < 300) {
          setView((v) => (v.s > 1 ? { s: 1, x: 0, y: 0 } : { s: 2.2, x: 0, y: 0 }));
          lastTap.current = 0;
        } else lastTap.current = now;
      }
      if (view.s <= 1) reset();
    } else {
      // A finger lifted mid-pinch: restart the gesture from the remaining finger.
      const [p] = [...pointers.current.values()];
      gesture.current = { dist: 0, s: view.s, sx: p.x, sy: p.y, vx: view.x, vy: view.y, moved: true, t: Date.now() };
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-label={alt} className="fixed inset-0 z-[80] bg-black" style={{ animation: 'fadeIn .25s ease both' }}>
      <div
        className="absolute inset-0 touch-none select-none overflow-hidden"
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        onWheel={(e) => setView((v) => { const s = clamp(v.s - e.deltaY * 0.002); return s === 1 ? { s: 1, x: 0, y: 0 } : { ...v, s }; })}
      >
        <div className="relative size-full transition-transform duration-75" style={{ transform: `translate3d(${view.x}px,${view.y}px,0) scale(${view.s})` }}>
          <Image key={images[i]} src={images[i]} alt={alt} fill sizes="100vw" quality={90} loading="eager" className="pointer-events-none object-contain" />
        </div>
      </div>
      <button className="icon-btn absolute end-3 top-3 bg-black/50" aria-label={t.nav.close} onClick={onClose} autoFocus><X size={24} strokeWidth={1.25} /></button>
      {n > 1 && (
        <>
          <button className="icon-btn absolute start-2 top-1/2 hidden -translate-y-1/2 bg-black/50 md:inline-flex" aria-label={t.product.prevImage} onClick={() => go(-1)}><ArrowLeft size={20} strokeWidth={1.25} className="flip-rtl" /></button>
          <button className="icon-btn absolute end-2 top-1/2 hidden -translate-y-1/2 bg-black/50 md:inline-flex" aria-label={t.product.nextImage} onClick={() => go(1)}><ArrowRight size={20} strokeWidth={1.25} className="flip-rtl" /></button>
        </>
      )}
      <p className="pointer-events-none absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+14px)] text-center text-xs text-muted">{i + 1} / {n} · {t.product.zoomHint}</p>
    </div>
  );
}
